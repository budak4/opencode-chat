import { useState } from 'react'
import { useChatContext } from '../contexts/ChatContext'

const PRESET_ENDPOINTS = [
  { label: 'OpenCode (Big Pickle)', value: 'https://8800-6d8ddd56-4a77-406d-9a8d-71689b08593d.apps.daytona.io/v1/chat/completions', placeholder: '', models: ['opencode/big-pickle'] },
  { label: 'OpenAI', value: 'https://api.openai.com/v1/chat/completions', placeholder: 'sk-...', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { label: 'Anthropic (proxy)', value: 'https://api.anthropic.com/v1/messages', placeholder: 'sk-ant-...', models: ['claude-3-5-sonnet-20241022'] },
  { label: 'Ollama (local)', value: 'http://localhost:11434/v1/chat/completions', placeholder: 'ollama', models: ['llama3.1:8b', 'mistral:7b', 'codellama:7b'] },
  { label: 'OpenRouter', value: 'https://openrouter.ai/api/v1/chat/completions', placeholder: 'sk-or-...', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'] },
  { label: 'Custom / OpenAI-compatible', value: '', placeholder: 'e.g. http://localhost:8000/v1/chat/completions', models: [] },
]

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function SettingsModal({ onClose }) {
  const { settings, setSettings } = useChatContext()
  const [form, setForm] = useState(settings)
  const [showKey, setShowKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [endpointPreset, setEndpointPreset] = useState(() => {
    const match = PRESET_ENDPOINTS.find((p) => p.value === settings.apiEndpoint)
    return match?.value || 'custom'
  })

  const handleChange = (field) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))

    if (field === 'apiEndpoint') {
      if (PRESET_ENDPOINTS.some((p) => p.value === value)) {
        setEndpointPreset(value)
        const preset = PRESET_ENDPOINTS.find((p) => p.value === value)
        if (preset?.models?.length > 0 && !preset.models.includes(form.model)) {
          setForm((prev) => ({ ...prev, model: preset.models[0] }))
        }
      } else {
        setEndpointPreset('custom')
      }
    }
  }

  const handleEndpointPreset = (value) => {
    setEndpointPreset(value)
    if (value === 'custom') {
      setForm((prev) => ({ ...prev, apiEndpoint: '' }))
    } else {
      const preset = PRESET_ENDPOINTS.find((p) => p.value === value)
      setForm((prev) => ({ ...prev, apiEndpoint: value, ...(preset?.models?.length > 0 && !preset.models.includes(prev.model) ? { model: preset.models[0] } : {}) }))
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSettings(form)
    onClose()
  }

  const handleReset = () => {
    setForm({
      apiEndpoint: 'https://8800-6d8ddd56-4a77-406d-9a8d-71689b08593d.apps.daytona.io/v1/chat/completions',
      apiKey: '',
      model: 'opencode/big-pickle',
      temperature: 0.7,
      systemPrompt: 'Kamu adalah asisten AI yang membantu dan ramah. Jawab dalam bahasa yang user gunakan.',
      maxTokens: 4096,
    })
    setEndpointPreset(PRESET_ENDPOINTS[0].value)
    setSettings({
      apiEndpoint: 'https://8800-6d8ddd56-4a77-406d-9a8d-71689b08593d.apps.daytona.io/v1/chat/completions',
      apiKey: '',
      model: 'opencode/big-pickle',
      temperature: 0.7,
      systemPrompt: 'Kamu adalah asisten AI yang membantu dan ramah. Jawab dalam bahasa yang user gunakan.',
      maxTokens: 4096,
    })
  }

  const inputClass = "w-full bg-[#171717] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all"
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#101012] border border-[#242424] rounded-2xl shadow-2xl p-6 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10.325 4.317c.438-2.066 3.912-2.066 4.35 0l.294 1.39a1 1 0 0 0 .703.675 2.5 2.5 0 0 1 1.054 4.304 1 1 0 0 0-.02 1.616 2.5 2.5 0 0 1-1.054 4.304 1 1 0 0 0-.703.675l-.294 1.39c-.438 2.066-3.912 2.066-4.35 0l-.294-1.39a1 1 0 0 0-.703-.675 2.5 2.5 0 0 1-1.054-4.304 1 1 0 0 0 .02-1.616 2.5 2.5 0 0 1 1.054-4.304 1 1 0 0 0 .703-.675l.294-1.39z" transform="rotate(45 12 12)" />
          </svg>
          Settings
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* API Endpoint */}
          <div>
            <label className={labelClass}>API Endpoint</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_ENDPOINTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleEndpointPreset(p.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    endpointPreset === p.value
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'border-[#2e2e2e] text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <IconMail />
              </div>
              <input
                type="text"
                value={form.apiEndpoint}
                onChange={handleChange('apiEndpoint')}
                placeholder="https://api.openai.com/v1/chat/completions"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
            <p className="text-[11px] text-gray-600 mt-1.5">
              Gunakan endpoint OpenAI-compatible. Untuk Ollama tempatan: <span className="font-mono">http://localhost:11434/v1/chat/completions</span>
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className={labelClass}>API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={handleChange('apiKey')}
                placeholder="sk-..."
                className={`${inputClass} pr-20`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-gray-600 mt-1.5">
              Key disimpan secara tempatan dalam browser anda. Tidak dihantar ke mana-mana.
            </p>
          </div>

          {/* Model */}
          <div>
            <label className={labelClass}>Model</label>
            <input
              type="text"
              value={form.model}
              onChange={handleChange('model')}
              placeholder="gpt-4o-mini / llama3.1:8b / opencode/big-pickle"
              className={inputClass}
              list="model-options"
            />
            <datalist id="model-options">
              <option value="opencode/big-pickle">OpenCode Big Pickle</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="llama3.1:8b">Llama 3.1 8B</option>
              <option value="mistral:7b">Mistral 7B</option>
            </datalist>
          </div>

          {/* Advanced settings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-5 pt-2 border-t border-[#242424]">
              <div>
                <label className={labelClass}>Temperature: <span className="text-purple-400 font-mono">{form.temperature}</span></label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Max Tokens</label>
                <input
                  type="number"
                  min="128"
                  max="64000"
                  step="128"
                  value={form.maxTokens}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>System Prompt</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={handleChange('systemPrompt')}
                  rows={3}
                  className={`${inputClass} resize-y`}
                  placeholder="Kamu adalah asisten AI yang membantu..."
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-900/20"
            >
              Save Settings
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-[#2e2e2e] text-gray-400 text-sm hover:border-red-500/50 hover:text-red-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}