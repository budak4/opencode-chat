const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const OPENCODE_URL = process.env.OPENCODE_URL || 'http://127.0.0.1:8090'
const AUTH = process.env.OPENCODE_PASSWORD
  ? { username: process.env.OPENCODE_USERNAME || 'opencode', password: process.env.OPENCODE_PASSWORD }
  : null
const MODELS = ['opencode/big-pickle']
const PORT = parseInt(process.env.PORT || '8800', 10)
const HOST = process.env.HOST || '0.0.0.0'
const STATIC_DIR = path.resolve(__dirname, '../opencode-chat/dist')

function basicAuth() {
  if (!AUTH) return null
  return 'Basic ' + Buffer.from(`${AUTH.username}:${AUTH.password}`).toString('base64')
}

function requestOpenCode(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const auth = basicAuth()
  if (auth) headers.Authorization = auth
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8090,
      path,
      method,
      headers: { ...headers, 'Content-Length': body ? Buffer.byteLength(JSON.stringify(body)) : 0 },
    }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) } catch { resolve(data) }
        } else {
          reject(new Error(`opencode ${res.statusCode}: ${data.slice(0, 500)}`))
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function createSession(title) {
  return requestOpenCode('POST', '/session', { title: title || 'web chat' })
}

// Opens an SSE connection to opencode /event and calls onEvent(evtJSON, rawLine).
function openEventStream(onEvent) {
  const headers = {}
  const auth = basicAuth()
  if (auth) headers.Authorization = auth
  const req = http.get({
    hostname: '127.0.0.1',
    port: 8090,
    path: '/event',
    headers,
  }, (res) => {
    let buffer = ''
    res.on('data', (chunk) => {
      buffer += chunk.toString()
      let idx
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (!data) continue
          try {
            onEvent(JSON.parse(data), data)
          } catch {}
        }
      }
    })
    res.on('error', () => {})
  })
  req.on('error', () => {})
  return () => { try { req.destroy() } catch {} }
}

function sseWrite(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
  // flush if pipe has capacity
  if (res.writableNeedDrain) {
    res._lastFlush = true
  }
}

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/') urlPath = '/index.html'
  const filePath = path.join(STATIC_DIR, urlPath)
  const safe = path.resolve(filePath).startsWith(STATIC_DIR)
  if (!safe) return false
  try {
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      const ext = path.extname(filePath)
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' })
      fs.createReadStream(filePath).pipe(res)
      return true
    }
  } catch {}
  // SPA fallback
  const indexPath = path.join(STATIC_DIR, 'index.html')
  try {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
    fs.createReadStream(indexPath).pipe(res)
    return true
  } catch { return false }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  // Serve static React UI for non-API requests
  if (req.method === 'GET' && !req.url.startsWith('/v1/') && req.url !== '/health') {
    if (serveStatic(req, res)) return
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, model: MODELS[0], backend: OPENCODE_URL }))
    return
  }
  if (req.method === 'GET' && req.url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ object: 'list', data: MODELS.map((m) => ({ id: m, object: 'model', owned_by: 'opencode' })) }))
    return
  }
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'Not found' } }))
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk
  let payload
  try { payload = JSON.parse(body) } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }))
    return
  }

  const messages = payload.messages || []
  const userMessages = messages.filter((m) => m.role === 'user' && typeof m.content === 'string')
  const lastUser = userMessages[userMessages.length - 1]
  const prompt = lastUser ? lastUser.content : ''
  const stream = payload.stream !== false

  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'No user message found' } }))
    return
  }

  const session = await createSession('web')
  const sessionId = session.id
  const modelParam = { providerID: 'opencode', modelID: 'big-pickle', variant: 'default' }
  const state = { cur: '', done: false }

  const closeStream = openEventStream((evt) => {
    if (evt.type === 'message.part.updated' && evt.properties?.sessionID === sessionId) {
      const part = evt.properties.part
      if (part?.type === 'text' && typeof part.text === 'string') {
        // Ignore the user message echo - only capture assistant text
        if (part.text === prompt) return
        if (part.text.length > state.cur.length) state.cur = part.text
      }
      if (part?.type === 'step-finish') state.done = true
    }
  })

  try {
    await requestOpenCode('POST', `/session/${sessionId}/prompt_async`, {
      parts: [{ type: 'text', text: prompt }],
      model: modelParam,
    })
  } catch (err) {
    closeStream()
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: err.message } }))
    return
  }

  if (!stream) {
    const t0 = Date.now()
    while (!state.done && Date.now() - t0 < 180000) {
      await new Promise((r) => setTimeout(r, 200))
    }
    closeStream()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      id: `chatcmpl-${crypto.randomBytes(8).toString('hex')}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: payload.model || MODELS[0],
      choices: [{ index: 0, message: { role: 'assistant', content: state.cur }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }))
    return
  }

  // streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  let lastSent = 0
  let finished = false

  const emit = () => {
    if (finished) return
    const cur = state.cur
    if (cur.length > lastSent) {
      const delta = cur.slice(lastSent)
      lastSent = cur.length
      sseWrite(res, {
        id: 'chatcmpl-' + crypto.randomBytes(8).toString('hex'),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: payload.model || MODELS[0],
        choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
      })
    }
    if (state.done && cur.length === lastSent) {
      finished = true
      clearInterval(interval)
      sseWrite(res, {
        id: 'chatcmpl-' + crypto.randomBytes(8).toString('hex'),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: payload.model || MODELS[0],
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      })
      res.end('data: [DONE]\n\n')
      closeStream()
    }
  }
  const interval = setInterval(emit, 100)

  req.on('close', () => {
    clearInterval(interval)
    closeStream()
    try { requestOpenCode('POST', `/session/${sessionId}/abort`) } catch {}
  })
})

server.listen(PORT, HOST, () => {
  console.log(`open AI bridge listening on ${HOST}:${PORT}`)
  console.log(`backend: ${OPENCODE_URL}`)
})