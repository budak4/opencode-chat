import { useState, useEffect, useRef, useCallback } from 'react'
import { useChatContext } from '../contexts/ChatContext'
import Message from './Message'
import { SUGGESTIONS } from '../utils/helpers'

export default function ChatArea({ onOpenSidebar, onOpenSettings }) {
  const {
    currentConversation,
    sendMessage,
    stopGeneration,
    isMobile,
    settings,
    setSettings,
    createConversation,
  } = useChatContext()

  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [images, setImages] = useState([])
  const textareaRef = useRef(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const messages = currentConversation?.messages ?? []
  const isStreaming = messages.some((m) => m.streaming)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  useEffect(() => {
    autoResize()
  }, [input, autoResize])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text && images.length === 0) return
    if (isStreaming) return

    await sendMessage(text, images)
    setInput('')
    setImages([])
    autoResize()
  }, [input, images, isStreaming, sendMessage, autoResize])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target.result)
        reader.readAsDataURL(file)
      })
    })
    Promise.all(readers).then((results) => {
      setImages((prev) => [...prev, ...results])
    })
    e.target.value = ''
  }

  const handleSuggestion = (prompt) => {
    setInput(prompt)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleNewChat = () => {
    createConversation()
    setInput('')
    onOpenSidebar?.()
  }

  const handleModelQuickChange = (model) => {
    setSettings((prev) => ({ ...prev, model }))
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 relative bg-[#0d0d0f]">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-[#242424] bg-[#0d0d0f]/90 backdrop-blur-lg shrink-0 z-20">
        {isMobile && (
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">OP</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {currentConversation?.title && currentConversation.title !== 'New Chat'
                ? currentConversation.title
                : 'OpenCode Chat'}
            </p>
            <p className="text-[11px] text-gray-500">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={settings.model}
            onChange={(e) => handleModelQuickChange(e.target.value)}
            className="text-xs bg-[#171717] border border-[#2e2e2e] rounded-lg px-2 py-1.5 text-gray-300 cursor-pointer hover:border-gray-500 focus:outline-none focus:border-purple-500 max-w-[140px] md:max-w-none"
          >
            <optgroup label="OpenCode Models">
              <option value="opencode/big-pickle">big-pickle</option>
            </optgroup>
            <optgroup label="OpenAI">
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </optgroup>
            <optgroup label="Anthropic">
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </optgroup>
            <optgroup label="Ollama">
              <option value="llama3.1:8b">Llama 3.1 8B</option>
              <option value="mistral:7b">Mistral 7B</option>
              <option value="codellama:7b">CodeLlama 7B</option>
            </optgroup>
            <optgroup label="Local">
              <option value="opencode/big-pickle">big-pickle (local)</option>
            </optgroup>
          </select>

          {!settings.apiKey && (
            <button
              onClick={onOpenSettings}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              API Key
            </button>
          )}

          {isStreaming && (
            <button
              onClick={stopGeneration}
              className="flex items-center gap-1.5 text-xs bg-[#3c1414] hover:bg-[#4a1818] text-red-300 border border-red-900/50 rounded-lg px-3 py-1.5 transition-colors font-medium"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
              Stop
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestion={handleSuggestion} onSettings={onOpenSettings} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <Message key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 pb-4 pt-2 bg-[#0d0d0f]">
        <div className="max-w-3xl mx-auto">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="attachment" className="w-16 h-16 object-cover rounded-lg border border-[#2e2e2e]" />
                  <button
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`flex items-end gap-2 bg-[#1a1a1c] border ${images.length > 0 ? 'border-[#3a3a3e] p-2' : 'border-[#2e2e32]'} rounded-2xl focus-within:border-purple-500/50 focus-within:bg-[#1c1c1f] transition-colors ${isStreaming ? 'opacity-90' : ''}`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Mesej OpenCode…"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none px-3 py-3 text-sm text-gray-100 placeholder-gray-500 auto-resize"
              disabled={isStreaming}
            />

            <div className="flex items-center gap-1 pr-2 pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Attach image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 16c2.5-1.5 4-6 7.5-6s4.5 6 7.5 6c2 0 3-.5 3-.5M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" strokeLinecap="round" />
                  <circle cx="9" cy="9" r="1.5" fill="currentColor" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleImageSelect} />

              <button
                type="submit"
                disabled={(!input.trim() && images.length === 0) || isStreaming}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                  (!input.trim() && images.length === 0) || isStreaming
                    ? 'bg-[#2a2a2e] text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-br from-red-500 to-purple-600 text-white hover:opacity-90 hover:scale-105 shadow-lg shadow-purple-900/30'
                }`}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.9 3.1 21.6 11c.9.43.9 1.6 0 2L4.9 20.9c-.9.43-1.9-.3-1.9-1.3L3 4.4c0-1 .9-1.7 1.9-1.3z" />
                  <path d="M6 12h6M6 12l-2-6c0-1 .9-1.7 1.9-1.3L21.6 11" opacity="0" />
                  <path d="M3 4.4c0-1 .9-1.7 1.9-1.3l16.7 8a1.1 1.1 0 0 1 0 2l-16.7 8C3.9 21.3 3 20.5 3 19.6L3 4.4z" fill="none" opacity="0" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-4 mt-2 px-2">
            <button onClick={handleNewChat} className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4.5C7 4.5 3 6.91 3 10c0 1.93 1.36 3.68 3.42 4.83-.45 1.86-1.53 3.17-2.42 3.6.41 1.1 1.62 1.72 3.1 1.72 2.41 0 4.46-1.06 5.85-2.71.42.03.85.06 1.28.06 5 0 9-2.41 9-5.5S17 4.5 12 4.5z"/></svg>
              New chat
            </button>
            <span className="text-[10px] text-gray-600 select-none">·</span>
            <span className="text-[11px] text-gray-600">OpenCode Chat boleh membuat kesilapan. Penting untuk semak jawapan penting.</span>
          </div>
        </div>
      </div>
    </main>
  )
}

function WelcomeScreen({ onSuggestion, onSettings }) {
  const { settings } = useChatContext()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 fade-in">
      <div className="w-16 h-16 rounded-3xl ai-avatar-glow bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl">
        <span className="text-2xl font-bold text-white">OP</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold mb-3 bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
        Halo! Apa yang boleh saya bantu?
      </h1>
      <p className="text-sm text-gray-400 mb-10 max-w-md">
        Ask me anything - I'm here to help with whatever you need.
      </p>

      {!settings.apiKey && (
        <button
          onClick={onSettings}
          className="mb-10 bg-[#171717] border border-[#2e2e2e] hover:border-purple-500/50 hover:bg-[#1c1c1f] text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>
          Add API Key
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => onSuggestion(s.prompt)}
            className="suggestion-card text-left p-4 rounded-2xl border border-[#2e2e2e] bg-[#141416] group"
          >
            <span className="text-xl block mb-2">{s.icon}</span>
            <p className="text-sm font-medium text-white mb-1 group-hover:text-purple-300 transition-colors">{s.title}</p>
            <p className="text-xs text-gray-500">{s.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  )
}