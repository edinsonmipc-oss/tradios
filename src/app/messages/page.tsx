'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Send, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Message {
  id: string
  client_id: string
  content: string
  direction: string
  status: string
  sent_at: string
}

interface ClientSummary {
  id: string
  name: string
  phone: string | null
  email: string | null
}

export default function MessagesPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('user_id', user.id)
        .order('name')
      if (data) setClients(data as ClientSummary[])
    }
    fetchClients()
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', selectedClient)
        .order('sent_at', { ascending: true })
      if (data) setMessages(data as Message[])
    }
    fetchMessages()

    // Subscribe to new messages
    const sub = supabase
      .channel(`messages:${selectedClient}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${selectedClient}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [selectedClient])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!selectedClient || !content.trim()) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setSending(false)
      return
    }

    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      client_id: selectedClient,
      content: content.trim(),
      direction: 'outbound',
    })

    setSending(false)
    if (error) {
      toast.error(error.message)
    } else {
      setContent('')
      toast.success('Message sent!')
    }
  }

  const selectedClientData = clients.find((c) => c.id === selectedClient)

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border">
      {/* Client list */}
      <div className="w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0 hidden sm:block">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Clients</h2>
        </div>
        <div className="space-y-0.5 p-2">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                selectedClient === client.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-foreground hover:bg-card-hover'
              }`}
            >
              <p className="font-medium truncate">{client.name}</p>
              {client.phone && (
                <p className="text-xs text-muted/70 truncate">{client.phone}</p>
              )}
            </button>
          ))}
          {clients.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted">No clients yet</p>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col">
        {selectedClient ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">
                  {selectedClientData?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedClientData?.name}
                </p>
                <p className="text-xs text-muted">
                  {selectedClientData?.phone || selectedClientData?.email || 'No contact'}
                </p>
              </div>
              <div className="ml-auto">
                <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  SMS
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="mb-2 h-8 w-8 text-muted/50" />
                  <p className="text-sm text-muted">
                    No messages yet with {selectedClientData?.name}
                  </p>
                  <p className="text-xs text-muted/70 mt-1">
                    Send your first message below
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        msg.direction === 'outbound'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          msg.direction === 'outbound' ? 'text-white/70' : 'text-muted'
                        }`}
                      >
                        {formatDate(msg.sent_at)} • {msg.direction}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-border bg-card p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button onClick={handleSend} loading={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-muted/50" />
            <p className="text-base font-medium text-foreground">Select a client</p>
            <p className="mt-1 text-sm text-muted">
              Choose a client from the list to view or send messages
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
