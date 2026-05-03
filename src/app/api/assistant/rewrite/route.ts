import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'

export async function POST(request: NextRequest) {
  try {
    const { message, action } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const systemPrompts: Record<string, string> = {
      shorten: `You are Antonio, an Australian tradie. Rewrite the following message as a very short SMS version. Keep it to 2-3 sentences maximum. Remove any fluff. Keep it friendly but concise. Sign off as "Thanks, Antonio". No extra commentary. Just the message.`,
      professional: `You are Antonio, an Australian tradie. Rewrite the following message to sound more professional and polished. Keep it friendly but business-like. Use proper grammar. Sound like a reputable construction business. Sign off as "Thanks, Antonio". No extra commentary.`,
      spanish: `Translate the following message to Spanish. Keep the same tone and friendliness. It should sound natural in Spanish, like a friendly tradie speaking to a Spanish-speaking client. Sign off as "Gracias, Antonio". No extra commentary. Just the translation.`,
    }

    const systemPrompt = systemPrompts[action]
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tradios.onrender.com',
        'X-Title': 'Tradios',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const completion = await response.json()
    const content = completion?.choices?.[0]?.message?.content

    return NextResponse.json({ reply: content || '' })
  } catch (error: any) {
    console.error('AI rewrite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
