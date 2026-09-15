import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import SettingsModal from './components/SettingsModal'
import { useChatContext, ChatProvider } from './contexts/ChatContext'
import { useTheme } from './hooks/useTheme'

function MainContent() {
  const { sidebarOpen, setSidebarOpen, settingsOpen, setSettingsOpen } = useChatContext()
  useTheme()

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-[#e5e5e5] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenSettings={() => setSettingsOpen(true)} />
      <ChatArea onOpenSidebar={() => setSidebarOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ChatProvider>
      <MainContent />
    </ChatProvider>
  )
}