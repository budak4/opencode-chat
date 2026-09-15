import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const ChatContext = createContext(null)

const BRIDGE_ENDPOINT = 'https://8800-6d8ddd56-4a77-406d-9a8d-71689b08593d.apps.daytona.io/v1/chat/completions'

export const DEFAULT_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || BRIDGE_ENDPOINT

export const DEFAULT_SETTINGS = {
  apiEndpoint: DEFAULT_ENDPOINT,
  apiKey: '',
  model: 'opencode/big-pickle',
  temperature: 0.7,
  systemPrompt: 'Kamu adalah asisten AI yang membantu dan ramah. Jawab dalam bahasa yang user gunakan.',
  maxTokens: 4096,
}

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('conversations')
    return saved ? JSON.parse(saved) : []
  })
  const [currentId, setCurrentId] = useState(null)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('chatSettings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false)

  const controllersRef = useRef(new Map())

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations))
  }, [conversations])

  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    // No auto-modal on first visit - OpenCode is pre-configured
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentConversation = conversations.find((c) => c.id === currentId)

  const createConversation = useCallback(() => {
    const now = Date.now()
    const newConv = {
      id: `conv_${now}`,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    setConversations((prev) => [newConv, ...prev])
    setCurrentId(newConv.id)
    setSidebarOpen(false)
    return newConv.id
  }, [])

  const deleteConversation = useCallback((id) => {
    controllersRef.current.get(id)?.abort()
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (currentId === id) {
        setCurrentId(filtered[0]?.id ?? null)
      }
      return filtered
    })
  }, [currentId])

  const updateConversation = useCallback((id, updates) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
    )
  }, [])

  const updateMessage = useCallback((convId, msgId, updates) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        return {
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...updates } : m)),
        }
      }),
    )
  }, [])

  const sendMessage = useCallback(async (content, images = []) => {
    if (!settings.apiEndpoint) {
      setSettingsOpen(true)
      return
    }

    let convId = currentId
    let history = currentConversation?.messages ?? []

    if (!convId) {
      convId = createConversation()
      history = []
    }

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      images,
      timestamp: Date.now(),
    }
    const assistantMsg = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      streaming: true,
    }

    const fullHistory = [
      ...history.map((m) => ({
        role: m.role,
        content: m.images?.length > 0
          ? [{ type: 'text', text: m.content }, ...m.images.map((i) => ({ type: 'image_url', image_url: { url: i } }))]
          : m.content,
      })),
      { role: 'user', content: images?.length > 0 ? [{ type: 'text', text: content }, ...images.map((i) => ({ type: 'image_url', image_url: { url: i } }))] : content },
    ]

    const apiHistory = [
      { role: 'system', content: settings.systemPrompt },
      ...fullHistory,
    ]

    updateConversation(convId, { title: history.length === 0 ? (content.length > 30 ? content.slice(0, 30) + '...' : content) : undefined })
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, title: history.length === 0 ? (content.length > 30 ? content.slice(0, 30) + '...' : content) : c.title, messages: [...c.messages, userMsg, assistantMsg] }
          : c,
      ),
    )

    const controller = new AbortController()
    controllersRef.current.set(convId, controller)

    try {
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: settings.model,
          messages: apiHistory,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              fullContent += delta
              updateMessage(convId, assistantMsg.id, { content: fullContent })
            }
          } catch (e) {
            // ignore partial JSON
          }
        }
      }

      updateMessage(convId, assistantMsg.id, { streaming: false })
      controllersRef.current.delete(convId)
    } catch (error) {
      if (error.name !== 'AbortError') {
        const errText = mapError(error)
        const newId = assistantMsg.id
        updateMessage(convId, newId, { content: `⚠️ **Error:** ${errText}`, streaming: false })
      } else {
        updateMessage(convId, assistantMsg.id, { streaming: false })
      }
      controllersRef.current.delete(convId)
    }
  }, [settings, currentId, currentConversation, updateConversation, updateMessage, createConversation])

  const stopGeneration = useCallback(() => {
    if (currentId) {
      controllersRef.current.get(currentId)?.abort()
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? { ...c, messages: c.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)) }
            : c,
        ),
      )
    }
  }, [currentId])

  const regenerate = useCallback(async (convId) => {
    const conv = conversations.find((c) => c.id === convId)
    if (!conv) return

    const messages = conv.messages
    // Remove last assistant message(s) if they exist
    let i = messages.length - 1
    while (i >= 0 && messages[i].role === 'assistant') i--
    const cutMessages = messages.slice(0, i + 1)

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: cutMessages } : c)),
    )

    const lastMsg = cutMessages[cutMessages.length - 1]
    if (lastMsg && lastMsg.role === 'user') {
      await sendMessage(lastMsg.content, lastMsg.images || [])
    }
  }, [conversations, sendMessage])

  const value = {
    conversations,
    currentConversation,
    currentId,
    setCurrentId,
    createConversation,
    deleteConversation,
    updateConversation,
    sendMessage,
    stopGeneration,
    regenerate,
    settings,
    setSettings,
    sidebarOpen,
    setSidebarOpen,
    settingsOpen,
    setSettingsOpen,
    isMobile,
    showAPIKeyModal,
    setShowAPIKeyModal,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

function mapError(error) {
  const msg = error.message || String(error)
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('apikey') || msg.includes('Invalid')) {
    return 'API key salah atau tidak valid. Sila semak API key anda dalam Settings.'
  }
  if (msg.includes('404')) {
    return 'Model tidak dijumpai. Semak nama model dalam Settings.'
  }
  if (msg.includes('429')) {
    return 'Rate limit exceeded. Sila tunggu sekejap dan cuba lagi.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Tidak dapat sambung ke API. Semak endpoint dan internet anda.'
  }
  return msg.length > 200 ? msg.slice(0, 200) + '...' : msg
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}