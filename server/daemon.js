const http = require('http')
const { spawn } = require('child_process')
const fs = require('fs')

const log = fs.openSync('/tmp/bridge.out.log', 'a')
const child = spawn('node', ['/tmp/opencode/bridge/bridge.js'], {
  env: { ...process.env, OPENCODE_URL: 'http://127.0.0.1:8090', OPENCODE_PASSWORD: 'opencode123' },
  detached: true,
  stdio: ['ignore', log, log],
})
child.unref()
console.log('spawned pid', child.pid)