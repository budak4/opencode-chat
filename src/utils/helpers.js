export function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(timestamp) {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function truncateString(str, maxLength) {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
}

export function getConversationTitle(conversation) {
  if (!conversation) return ''
  if (conversation.title && conversation.title !== 'New Chat') return conversation.title
  const firstUserMsg = conversation.messages.find((m) => m.role === 'user')
  if (!firstUserMsg) return 'New Chat'
  return firstUserMsg.content.length > 30 ? firstUserMsg.content.slice(0, 30) + '...' : firstUserMsg.content
}

export function downloadConversation(conversation) {
  if (!conversation) return
  const data = {
    title: getConversationTitle(conversation),
    timestamp: new Date(conversation.updatedAt).toISOString(),
    messages: conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${getConversationTitle(conversation).replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'conversation'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const SUGGESTIONS = [
  {
    icon: '✨',
    title: 'Explain something',
    subtitle: 'Explain complex topics in easy terms',
    prompt: 'Boleh jelaskan sesuatu konsep yang kompleks dengan cara yang mudah?',
  },
  {
    icon: '💡',
    title: 'Brainstorm ideas',
    subtitle: 'Generate creative ideas for a project',
    prompt: 'Bantu saya brainstorm idea untuk projek baru',
  },
  {
    icon: '📝',
    title: 'Write code',
    subtitle: 'Get help writing code',
    prompt: 'Tulis code untuk function yang mengira factorial dalam JavaScript',
  },
  {
    icon: '🌐',
    title: 'Translate',
    subtitle: 'Translate text between languages',
    prompt: 'Terjemahkan teks ini ke Bahasa Melayu',
  },
]