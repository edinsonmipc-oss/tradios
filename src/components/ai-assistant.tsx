'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, MessageSquare } from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  model?: string
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "👋 G'day! I'm Tradie SitePilot AI. Ask me anything about the app or running your tradie business!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.slice(1), userMsg].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      const data = await res.json()
      if (data.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          model: data.model 
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Sorry, I couldn't process that. Please try again." 
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Connection error. Please try again.' 
      }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickActions = [
    { label: 'How to create a quote?', action: 'How do I create a new quote in Tradie SitePilot?' },
    { label: 'Track expenses', action: 'How do I track expenses and GST?' },
    { label: 'Create invoice', action: 'How do I create an invoice from a quote?' },
    { label: 'Help with GST', action: 'How does GST work for Australian tradies?' },
  ]

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
        aria-label="AI Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-48px)] flex-col rounded-2xl border border-border bg-bg-secondary shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Tradie SitePilot AI</div>
              <div className="text-xs text-muted">Ask me anything about the app</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]" style={{ minHeight: '200px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-muted/30 text-foreground rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.model && msg.role === 'assistant' && (
                    <div className="mt-1 text-[10px] opacity-50">
                      via {msg.model}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted/30 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Quick actions (show when only first message) */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {quickActions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q.action)
                    setTimeout(() => sendMessage(), 100)
                  }}
                  className="rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
