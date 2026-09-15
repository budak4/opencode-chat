import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatTime } from '../utils/helpers'

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-[11px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
        copied ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </>
      )}
    </button>
  )
}

const CodeBlock = ({ code, language }) => {
  return (
    <div className="relative group">
      <pre className="code-block">
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#2d2d2d] bg-[#151515]">
          <span className="text-[11px] text-gray-500 font-mono">{language || 'code'}</span>
          <CopyButton text={code} />
        </div>
        <code className={`language-${language || 'text'}`}>{code}</code>
        {/* render as pre with overflow */}
        <div className="px-4 py-3 overflow-x-auto text-[13px] leading-relaxed text-gray-200 font-mono whitespace-pre">
          {code}
        </div>
      </pre>
    </div>
  )
}

function InlineCode({ children }) {
  return <code className="bg-white/10 text-purple-200 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono">{children}</code>
}

function MarkdownContent({ content }) {
  return (
    <div className="markdown-body prose-spacing text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match) {
              return <span>{String(children)}</span>
            }
            return <InlineCode {...props}>{children}</InlineCode>
          },
          pre({ children }) {
            try {
              const child = children?.props?.children
              const codeString = typeof child === 'string' ? child : ''
              const langMatch = children?.props?.className?.match(/language-(\w+)/)
              const language = langMatch?.[1]
              return <CodeBlock code={codeString} language={language} />
            } catch {
              return <pre>{children}</pre>
            }
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#818cf8] hover:text-[#a5b4fc] underline decoration-gray-500/50 hover:decoration-purple-400 underline-offset-2 transition-colors">
                {children}
              </a>
            )
          },
          p({ children }) {
            if (Array.isArray(children) && children.length === 1 && children[0]?.props?.className?.includes('language-')) {
              return <>{children}</>
            }
            return <p>{children}</p>
          },
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5 text-white">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-[#2e2e2e] bg-[#171717] px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-[#2e2e2e] px-3 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function Message({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isStreaming = message.streaming

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  return (
    <div className={`flex gap-3 md:gap-4 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center items-start shrink-0 mt-0.5 shadow-lg shadow-purple-900/20">
          <span className="text-[10px] font-bold text-white">OP</span>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'text-right' : 'flex-1 min-w-0'}`}>
        {isUser ? (
          <div className="inline-flex flex-col items-end gap-1.5">
            <div className="text-sm text-gray-100 inline-block max-w-full">
              {message.images?.length > 0 && (
                <div className="flex gap-2 mb-2 justify-end flex-wrap">
                  {message.images.map((img, i) => (
                    <img key={i} src={img} alt="attachment" className="w-24 h-24 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <p className="bg-[#26262b] border border-[#333338] rounded-2xl rounded-br-md px-4 py-2.5 text-left whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            <span className="text-[10px] text-gray-600 px-1">{formatTime(message.timestamp)}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {message.content ? (
              <div className="text-gray-100">
                {message.images?.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {message.images.map((img, i) => (
                      <img key={i} src={img} alt="attachment" className="w-24 h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                <MarkdownContent content={message.content} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <span>Thinking</span>
                <div className="flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 bg-current rounded-full" />
                  <span className="typing-dot w-1.5 h-1.5 bg-current rounded-full" />
                  <span className="typing-dot w-1.5 h-1.5 bg-current rounded-full" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              {!isStreaming && message.content && (
                <>
                  <button
                    onClick={handleCopy}
                    className={`text-[11px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      copied ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-gray-600 px-1">{formatTime(message.timestamp)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}