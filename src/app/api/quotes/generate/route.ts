import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'

async function generateWithGemini(clientName: string, title: string) {
  const prompt = `Generate a professional quote for client "${clientName}" for: ${title}.

Return ONLY a JSON object with these fields:
- laborItems: array of { description: string, quantity: number, unit: "hours" | "days" | "each" | "sqm", rate: number }
- materials: array of { name: string, quantity: number, unit_cost: number }
- notes: string

Use realistic Australian pricing. Include GST note. Keep it concise.`

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

async function generateWithOpenRouter(clientName: string, title: string) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a quote generation assistant for Australian tradespeople.
Generate a professional quote in JSON format with these fields:
- laborItems: array of { description: string, quantity: number, unit: "hours" | "days" | "each" | "sqm", rate: number }
- materials: array of { name: string, quantity: number, unit_cost: number }
- notes: string

Use realistic Australian pricing. Include GST note. Keep it concise.`,
        },
        { role: 'user', content: `Generate a quote for client "${clientName}" for: ${title}` },
      ],
      response_format: { type: 'json_object' },
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

export async function POST(request: NextRequest) {
  try {
    const { clientName, title } = await request.json()

    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    // Try Gemini first (free tier)
    if (GEMINI_API_KEY) {
      console.log('Using Gemini API (free) for quote generation')
      const result = await generateWithGemini(clientName, title || 'General quote')
      return NextResponse.json(result)
    }

    // Fall back to OpenRouter
    if (OPENROUTER_API_KEY) {
      console.log('Using OpenRouter API for quote generation')
      const result = await generateWithOpenRouter(clientName, title || 'General quote')
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
      materials: [
        { name: 'Cabling and connectors', quantity: 1, unit_cost: 150 },
        { name: 'Safety equipment and consumables', quantity: 1, unit_cost: 45 },
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
