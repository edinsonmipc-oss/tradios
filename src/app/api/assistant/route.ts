import { NextRequest, NextResponse } from 'next/server'

// API keys from environment variables (set in Render dashboard)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

const APP_KNOWLEDGE = `You are Tradie SitePilot AI — an intelligent assistant for an Australian tradie (tradesperson) management app. You answer ANY question the user asks, not just about the app. Be like ChatGPT: knowledgeable, helpful, and conversational. Respond in the user's language (English or Spanish).

Tradie SitePilot is an all-in-one management app for Australian tradespeople (tradies). Built with Next.js + Supabase.

PAGES & FEATURES:
- /dashboard — Overview with stats, recent activity, quick actions
- /quotes — Create, manage, and track quotes. Statuses: draft, sent, accepted, declined
- /quotes/new — Create new quote with AI-powered generation
- /quotes/[id] — View/edit individual quote
- /invoices — Generate invoices from quotes. 10% Australian GST auto-calculated
- /clients — Client directory with contact info, visit history, notes
- /visits — Schedule and track site inspections
- /calendar — Calendar view of scheduled visits and events
- /expenses — Track business expenses
- /payments — Record payments from clients
- /messages — SMS message log
- /gallery — Portfolio of past work photos
- /insurance — Insurance policy management
- /inventory — Track inventory items
- /accounting — Income, expenses, profit overview (coming soon)
- /follow-ups — Follow-up tasks with priorities (low, normal, high, urgent)
- /onboarding — First-time setup wizard
- /dashboard/settings — User settings and business profile
- /dashboard/settings/team — Team member management

DATABASE TABLES: profiles, businesses, clients, quotes, invoices, visits, expenses, payments, messages, gallery, insurance, inventory, calendar_events, follow_ups, reviews, templates, photos, sms_messages

BUSINESS RULES:
- Australian GST is 10%
- Quotes have auto-generated quote_number, items, subtotal, tax, total
- Tradespeople charge $60-$120/hr for labour in Melbourne
- Common services: paving, decking, fencing, gutter cleaning, pressure washing, lawn mowing, handyman, plumbing, electrical, painting, roofing
- ABN required for all tradies
- Payment terms: 14-30 days, or 50% deposit for large jobs

RESPONSE STYLE:
- Be a helpful AI like ChatGPT — answer ANY question, not just app-related ones
- For app questions: give clear step-by-step instructions
- For general questions: give informative, accurate answers
- Use Australian terminology (tradie, quote, invoice, GST, ABN, suburb)
- Keep responses concise but thorough - tradies don't have time for fluff
- Respond in the language the user writes in
- Be friendly, warm, and practical
- If asked something you don't know, be honest and suggest where to find the answer`

const DEEPSEEK_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1-distill-llama-70b:free',
]

const OPENROUTER_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.0-flash-001',
  'qwen/qwen2.5-vl-72b-instruct:free',
  'google/gemma-3-12b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
]

type ChatMessage = { role: string; content: string }

async function callDeepSeekDirect(messages: ChatMessage[]): Promise<string | null> {
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: APP_KNOWLEDGE },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      console.error('DeepSeek API error:', res.status)
      const text = await res.text()
      console.error('DeepSeek body:', text.slice(0, 200))
      return null
    }

    const data = await res.json()
    return data?.choices?.[0]?.message?.content || null
  } catch (e) {
    console.error('DeepSeek direct call failed:', e)
    return null
  }
}

async function callDeepSeekOpenRouter(messages: ChatMessage[]): Promise<string | null> {
  for (const model of DEEPSEEK_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://tradios.onrender.com',
          'X-Title': 'Tradie SitePilot AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: APP_KNOWLEDGE },
            ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      })

      if (!res.ok) continue
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (text) return text
    } catch (e) {
      console.error(`OpenRouter model ${model} failed:`, e)
      continue
    }
  }
  return null
}

async function callGemini(messages: ChatMessage[]): Promise<string | null> {
  try {
    const userMsgs = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: APP_KNOWLEDGE }] },
            ...userMsgs,
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    )

    if (!res.ok) {
      console.error('Gemini API error:', res.status)
      return null
    }

    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch (e) {
    console.error('Gemini call failed:', e)
    return null
  }
}

async function callOpenRouter(messages: ChatMessage[]): Promise<string | null> {
  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://tradios.onrender.com',
          'X-Title': 'Tradie SitePilot AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: APP_KNOWLEDGE },
            ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      })

      if (!res.ok) continue
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (text) return text
    } catch (e) {
      console.error(`OpenRouter model ${model} failed:`, e)
      continue
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // 1. Try DeepSeek direct API first (fastest)
    let response = await callDeepSeekDirect(messages)
    if (response) {
      return NextResponse.json({ response, model: 'deepseek-chat' })
    }

    // 2. Try DeepSeek via OpenRouter free
    response = await callDeepSeekOpenRouter(messages)
    if (response) {
      return NextResponse.json({ response, model: 'deepseek-openrouter' })
    }

    // 3. Try Gemini 2.0 flash
    response = await callGemini(messages)
    if (response) {
      return NextResponse.json({ response, model: 'gemini-2.0-flash' })
    }

    // 4. Try other OpenRouter free models
    response = await callOpenRouter(messages)
    if (response) {
      return NextResponse.json({ response, model: 'openrouter-free' })
    }

    // 5. Smart fallback - answer intelligently based on context
    const lastMsg = messages[messages.length - 1].content.toLowerCase()
    let fallback = ''

    if (lastMsg.includes('quote') || lastMsg.includes('cotización') || lastMsg.includes('presupuesto')) {
      fallback = 'To create a quote in Tradie SitePilot: go to **Quotes → New Quote**, select a client, add labour items with rates, and the system auto-calculates subtotal, GST (10%), and total. You can also use the **AI Generate** button to auto-generate quote items from a description. For Australian tradies, quotes typically include: description of work, quantity, rate per hour ($60-$120/hr typical in Melbourne), and GST.'
    } else if (lastMsg.includes('invoice') || lastMsg.includes('factura')) {
      fallback = 'Go to **Invoices** to view all invoices. Click **New Invoice** to create one — you can convert an **Accepted** quote into an invoice, or create from scratch. GST is auto-calculated at 10% for Australian compliance. Once paid, mark it as paid and it updates your accounting.'
    } else if (lastMsg.includes('client') || lastMsg.includes('cliente')) {
      fallback = 'Manage clients under **Clients**. Add new clients with name, phone, email, address, and source. Each client shows their quote/invoice/visit history. You can also email them directly from their profile.'
    } else if (lastMsg.includes('visit') || lastMsg.includes('inspección') || lastMsg.includes('site')) {
      fallback = 'Schedule **Visits** for site inspections. Statuses: scheduled → completed/cancelled/rescheduled. You can link visits to clients and add notes. Calendar view shows all upcoming visits.'
    } else if (lastMsg.includes('expense') || lastMsg.includes('gasto')) {
      fallback = 'Track expenses under **Expenses**. Categories: Materials, Tools, Fuel, Vehicle, Insurance, Office, Subcontractor, Other. You can upload receipt photos. Expenses feed into your accounting overview.'
    } else if (lastMsg.includes('hola') || lastMsg.includes('hello') || lastMsg.includes('g\'day') || lastMsg.includes('hi')) {
      fallback = "👋 G'day! I'm Tradie SitePilot AI — your intelligent business assistant. I can help you:\n\n📋 Navigate the app (quotes, invoices, clients)\n💰 Manage your tradie business (GST, pricing, expenses)\n🤔 Answer general questions (like ChatGPT)\n\nWhat can I help you with today?"
    } else if (lastMsg.includes('gst') || lastMsg.includes('tax') || lastMsg.includes('tax') || lastMsg.includes('impuesto') || lastMsg.includes('iva')) {
      fallback = 'Australian GST (Goods and Services Tax) is **10%**. In Tradie SitePilot: quotes and invoices auto-calculate GST. For expenses, you can track GST amounts for tax deductions. Key things to know:\n\n• GST-registered businesses charge 10% on top of their prices\n• You claim back the GST you pay on business expenses (input tax credits)\n• ABN is required, and if your turnover is $75k+, GST registration is mandatory\n• BAS (Business Activity Statement) is usually submitted quarterly'
    } else {
      fallback = `I'm Tradie SitePilot AI, your assistant. I can help with:\n\n**App features:** quotes, invoices, clients, visits, expenses, payments, calendar, gallery, insurance, inventory\n**Business:** Australian GST (10%), tradie pricing, ABN, BAS, marketing\n**General:** Ask me anything like ChatGPT!\n\nTry: "How do I create a quote?" or "What's the difference between a quote and an invoice?"`
    }

    return NextResponse.json({ response: fallback, model: 'offline' })
  } catch (error: any) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get response' },
      { status: 500 }
    )
  }
}
