import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'

async function generateWithOpenRouter(clientName: string, title: string) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://tradios.onrender.com',
      'X-Title': 'Tradie SitePilot',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional quoting assistant for Australian tradespeople (construction, landscaping, paving, electrical, plumbing).

Generate a detailed, professional quote for a client. Include specific, realistic pricing for Australian jobs.

Return ONLY a valid JSON object with:
- laborItems: array of { description: string, quantity: number, unit: "hours" | "days" | "each" | "sqm", rate: number }
  - Each description must be detailed and explain exactly what work is included (e.g. "Site preparation: clearing and levelling the work area, removing debris, setting up safety barriers")
- notes: a professional paragraph covering:
  * Scope of the quote
  * Key assumptions (access, disposal, materials)
  * Payment terms (50% deposit, balance on completion)
  * Compliance with Australian Standards
  * Estimated timeline
  * Validity period

Use realistic Australian pricing for the trade. Rates should reflect current market rates for qualified tradies.`,        },
        { role: 'user', content: `Generate a professional quote for client "${clientName}" for: ${title}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenRouter API error:', response.status, errorBody)
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const completion = await response.json()
  const content = completion?.choices?.[0]?.message?.content
  if (!content) throw new Error('No response from AI')
  return JSON.parse(content)
}

async function generateWithGemini(clientName: string, title: string) {
  const prompt = `You are a professional quoting assistant for Australian tradespeople (construction, landscaping, electrical, plumbing, etc.).

Generate a detailed, professional quote for "${clientName}" for: ${title}.

Return ONLY a JSON object with:
- laborItems: array of { description: string, quantity: number, unit: "hours" | "days" | "each" | "sqm", rate: number }
  - Each description should be detailed and explain what work is included (e.g., "Site preparation: clearing and levelling the work area, removing debris, and setting up safety barriers")
- notes: a professional paragraph explaining:
  * What the quote covers
  * Key assumptions (e.g., access, disposal costs)
  * Payment terms (50% deposit, balance on completion)
  * That work complies with Australian Standards
  * Estimated timeline

Use realistic Australian pricing for ${title} work. Rates should be fair for the trade type suggested by the title.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Gemini API error:', response.status, errorBody)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return JSON.parse(text)
}

export async function POST(request: NextRequest) {
  try {
    const { clientName, title } = await request.json()

    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    // Try OpenRouter first (user's preferred AI provider)
    if (OPENROUTER_API_KEY) {
      console.log('Using OpenRouter API for quote generation')
      const result = await generateWithOpenRouter(clientName, title || 'General quote')
      return NextResponse.json(result)
    }

    // Fall back to Gemini
    if (GEMINI_API_KEY) {
      console.log('Using Gemini API (free) for quote generation')
      const result = await generateWithGemini(clientName, title || 'General quote')
      return NextResponse.json(result)
    }

    // No API keys — return mock for testing
    console.log('No AI keys set, returning mock quote data')
    return NextResponse.json({
      laborItems: [
        { description: 'Initial site inspection and assessment', quantity: 2, unit: 'hours', rate: 85 },
        { description: 'Installation labour', quantity: 4, unit: 'hours', rate: 85 },
        { description: 'Testing and commissioning', quantity: 1, unit: 'hours', rate: 85 },
      ],
      notes: `Quote prepared for ${clientName} for ${title || 'General quote'}. All work complies with Australian Standards. Price includes GST.`,
    })
  } catch (error: any) {
    console.error('AI quote generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate quote' },
      { status: 500 }
    )
  }
}
