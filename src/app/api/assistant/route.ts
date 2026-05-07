import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const APP_KNOWLEDGE = `You are Tradios AI — an intelligent assistant for an Australian tradie management app. You help users navigate the app, answer questions about tradie business, and give actionable advice.

ABOUT THE APP:
Tradios is an all-in-one management app for Australian tradespeople (tradies). Built with Next.js + Supabase.

PAGES & FEATURES:
- /dashboard — Overview with stats, recent activity, quick actions
- /quotes — Create, manage, and track quotes. Has AI-powered quote generation. Statuses: draft, sent, accepted, declined
- /quotes/new — Create new quote with AI assistant
- /quotes/[id] — View/edit individual quote details
- /invoices — Generate invoices from quotes. Includes GST calculation (10% Australian GST)
- /clients — Client directory with contact info, visit history, notes
- /clients/[id] — Individual client profile
- /visits — Schedule and track site visits. Statuses: scheduled, completed, cancelled, rescheduled
- /visits/[id] — Visit details with measurements
- /calendar — Calendar view of all scheduled visits and events
- /expenses — Track business expenses with GST amounts. Categories: Materials, Labour, Fuel, Tools, Skip Bin, Delivery, Tip Fees, Other
- /payments — Record payments from clients
- /messages — SMS message log (Twilio integration)
- /gallery — Portfolio of past work photos
- /insurance — Insurance policy management
- /inventory — Inventory items tracking
- /accounting — Accounting overview (income, expenses, profit)
- /follow-ups — Follow-up tasks with priorities (low, normal, high, urgent)
- /onboarding — First-time setup wizard for new users
- /dashboard/settings — User settings and business profile

AI FEATURES:
- /api/quotes/generate — AI generates quote items using Gemini (free) → OpenRouter → mock fallback
- /api/abr-lookup — Lookup Australian Business Register ABN
- /api/scan-receipt — OCR receipt scanning
- Claude Skills integration for tradie AI templates

DATABASE TABLES (Supabase):
- profiles, businesses, clients, quotes, invoices, visits, expenses, payments, messages, gallery, insurance, inventory, calendar_events, follow_ups, reviews, templates, photos, sms_messages

BUSINESS RULES:
- Australian GST is 10%
- Quotes have: quote_number (auto-generated), items (labor + materials), subtotal, tax, total
- Tradespeople typically charge $60-$120/hr for labour in Melbourne
- Common tradie services: paving, decking, fencing, gutter cleaning, pressure washing, lawn mowing, handyman, plumbing, electrical, painting, roofing
- ABN (Australian Business Number) is required for all tradies
- Payment terms typically: 14-30 days, or 50% deposit for large jobs

RESPONSE STYLE:
- Be concise and practical. Tradies don't have time for fluff.
- Use Australian terminology (tradie, quote, invoice, GST, ABN, suburb, Melbourne, etc.)
- Give actionable advice, not just information
- If the user asks how to do something in the app, give step-by-step instructions
- If they ask about business/growth, give specific Australian tradie advice
- If you don't know something, be honest and suggest where they can find the answer
- Respond in the user's language (English or Spanish)`

async function callGemini(messages: { role: string; content: string }[]) {
  if (!GEMINI_API_KEY) return null
  
  const lastMessage = messages[messages.length - 1].content
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: APP_KNOWLEDGE }] },
          ...history,
          { role: 'user', parts: [{ text: lastMessage }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ]
      }),
    }
  )

  if (!res.ok) {
    console.error('Gemini API error:', res.status)
    return null
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
}

async function callOpenRouter(messages: { role: string; content: string }[]) {
  if (!OPENROUTER_API_KEY) return null

  const systemMsg = { role: 'system', content: APP_KNOWLEDGE }
  const chatMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))

  const models = [
    'google/gemma-3-4b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
  ]

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [systemMsg, ...chatMessages],
          max_tokens: 800,
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

    // Try Gemini first (free tier)
    let response = await callGemini(messages)
    if (response) {
      return NextResponse.json({ response, model: 'gemini-2.0-flash' })
    }

    // Fallback: OpenRouter free models
    response = await callOpenRouter(messages)
    if (response) {
      return NextResponse.json({ response, model: 'openrouter-free' })
    }

    // Final fallback: smart offline response
    const lastMsg = messages[messages.length - 1].content.toLowerCase()
    let fallback = ''

    if (lastMsg.includes('quote') || lastMsg.includes('cotización')) {
      fallback = 'To create a quote in Tradios, go to **Quotes → New Quote**. Fill in the client details, add labour items and materials, and the system will auto-calculate subtotal, GST (10%), and total. You can also use the **AI Generate** button to auto-generate quote items.'
    } else if (lastMsg.includes('invoice') || lastMsg.includes('factura')) {
      fallback = 'Go to **Invoices** to create an invoice. You can convert an existing **Accepted** quote into an invoice, or create one from scratch. GST is automatically calculated at 10% for Australian tax compliance.'
    } else if (lastMsg.includes('client') || lastMsg.includes('cliente')) {
      fallback = 'Manage your clients under **Clients**. You can add new clients, view their visit history, and see all associated quotes, invoices, and payments.'
    } else if (lastMsg.includes('gst') || lastMsg.includes('tax') || lastMsg.includes('impuesto')) {
      fallback = 'In Australia, GST is 10%. Tradios automatically calculates GST on quotes and invoices. You can track GST on expenses too — just enter the GST amount when logging an expense.'
    } else if (lastMsg.includes('hello') || lastMsg.includes('hi') || lastMsg.includes('hola')) {
      fallback = "👋 G'day! I'm Tradios AI. I can help you navigate the app, create quotes, manage clients, or answer tradie business questions. What do you need help with?"
    } else {
      fallback = "I'm here to help you use Tradios! You can ask me about creating quotes, managing clients, tracking expenses, scheduling visits, or anything about running your tradie business in Australia. Try asking: 'How do I create a quote?' or 'What features are available?'"
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
