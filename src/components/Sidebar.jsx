import { useState } from 'react'
import { useChatContext } from '../contexts/ChatContext'
import { downloadConversation, formatDate, getConversationTitle } from '../utils/helpers'

const ICONS = {
  plus: 'M12 4.5C7 4.5 3 6.91 3 10c0 1.93 1.36 3.68 3.42 4.83-.45 1.86-1.53 3.17-2.42 3.6.41 1.1 1.62 1.72 3.1 1.72 2.41 0 4.46-1.06 5.85-2.71.42.03.85.06 1.28.06 5 0 9-2.41 9-5.5S17 4.5 12 4.5z',
  trash: 'M19 7a1 1 0 0 0-1-1h-3V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v1H6a1 1 0 0 0 0 2h.065l.7 10.50A2 2 0 0 0 8.76 20h6.48a2 2 0 0 0 1.99-1.82l.7-10.5H19a1 1 0 0 0 0-1h-.00zM10 5h4v1h-4V5zm2 11a1 1 0 0 1-1-1V9a1 1 0 1 1 2 0v6a1 1 0 0 1-1 1z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M10.325 4.317c.438-2.066 3.912-2.066 4.35 0l.294 1.39a1 1 0 0 0 .703.675 2.5 2.5 0 0 1 1.054 4.304 1 1 0 0 0-.02 1.616 2.5 2.5 0 0 1-1.054 4.304 1 1 0 0 0-.703.675l-.294 1.39c-.438 2.066-3.912 2.066-4.35 0l-.294-1.39a1 1 0 0 0-.703-.675 2.5 2.5 0 0 1-1.054-4.304 1 1 0 0 0 .02-1.616 2.5 2.5 0 0 1 1.054-4.304 1 1 0 0 0 .703-.675l.294-1.39zM12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z',
  delete: 'M6 18V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM4 6h16M10 11v6M14 11v6',
  download: 'M12 3v10m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  close: 'M6 18L18 6M6 6l12 12',
  chat: 'M8 10h8M8 14h8M8 6h8M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
}

export default function Sidebar({ onClose, onOpenSettings }) {
  const {
    conversations,
    currentId,
    setCurrentId,
    createConversation,
    deleteConversation,
    isMobile,
  } = useChatContext()
  const [openMenuId, setOpenMenuId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const grouped = conversations.reduce((acc, conv) => {
    const key = formatDate(conv.updatedAt)
    if (!acc[key]) acc[key] = []
    acc[key].push(conv)
    return acc
  }, {})

  const handleNewChat = () => {
    createConversation()
    onClose?.()
  }

  const handleSelect = (id) => {
    setCurrentId(id)
    onClose?.()
  }

  const handleDelete = (id) => {
    setConfirmDelete(id)
  }

  const handleDownload = (conv) => {
    downloadConversation(conv)
    setOpenMenuId(null)
  }

  return (
    <>
      {isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-[#0f0f10] border-r border-[#242424] transition-transform duration-300 ${isMobile ? (open ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'} lg:translate-x-0`}>
        <div className="p-3 flex items-center justify-between border-b border-[#242424]">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-[#171717] border border-[#2e2e2e] hover:bg-[#212121] transition-colors w-full"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d={ICONS.plus} />
            </svg>
            New Chat
          </button>
          {isMobile && (
            <button onClick={() => onClose?.()} className="p-2 text-gray-400 hover:text-white ml-2 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={ICONS.close} />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {Object.entries(grouped).map(([group, convs]) => (
            <div key={group} className="px-3 mb-2">
              <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">{group}</p>
              {convs.map((conv) => {
                const title = getConversationTitle(conv)
                const isActive = conv.id === currentId
                const isStreaming = conv.messages.some((m) => m.streaming)
                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 rounded-lg px-2 py-2 mb-1 text-sm cursor-pointer transition-colors ${isActive ? 'bg-[#212121] text-white' : 'text-gray-300 hover:bg-[#1a1a1a]'}`}
                    onClick={() => handleSelect(conv.id)}
                  >
                    <svg className="shrink-0 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d={isStreaming ? 'M12 6v0M12 10v0M12 14v0M12 18v0' : ICONS.chat} strokeLinecap="round" />
                    </svg>
                    <p className="flex-1 truncate">{title}</p>

                    {confirmDelete === conv.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteConversation(conv.id)
                            setConfirmDelete(null)
                          }}
                          className="text-xs text-red-400 font-medium px-1.5 py-0.5 rounded hover:bg-red-500/20"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(null)
                          }}
                          className="text-xs text-gray-400 font-medium px-1.5 py-0.5 rounded hover:bg-gray-500/20"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center ${openMenuId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === conv.id ? null : conv.id)
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19" cy="12" r="1.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M8 10h8M8 14h8M8 6h8M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#242424]">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d={ICONS.settings} />
            </svg>
            Settings
          </button>
        </div>
      </aside>
    </>
  )
}