import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'

const MOCK_RESPONSE = {
  vendor: 'Bunnings Warehouse',
  amount: 247.5,
  category: 'Materials',
  description: 'Timber and fittings',
}

async function scanWithGemini(base64Image: string, mimeType: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: { mime_type: mimeType, data: base64Image },
              },
              {
                text: 'Extract the following information from this receipt image. Return ONLY a JSON object with these fields: vendor (string), amount (number), category (string: Materials, Tools, Fuel, Vehicle, Insurance, Office, Subcontractor, Other), description (string). If you cannot read the receipt clearly, return {"error": "Could not read receipt clearly"}',
              },
            ],
          },
        ],
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

async function scanWithOpenRouter(base64Image: string, mimeType: string) {
  const dataUrl = `data:${mimeType};base64,${base64Image}`

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
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the following information from this receipt image. Return ONLY a JSON object with these fields: vendor (string), amount (number), category (string: Materials, Tools, Fuel, Vehicle, Insurance, Office, Subcontractor, Other), description (string). If you cannot read the receipt clearly, return {"error": "Could not read receipt clearly"}',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
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
  if (!content) throw new Error('No response from AI service')
  return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const tempPath = join('/tmp', `receipt-${Date.now()}-${file.name}`)
    await writeFile(tempPath, buffer)

    const base64Image = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Try Gemini first (free tier), then OpenRouter, then mock
    if (GEMINI_API_KEY) {
      console.log('Using Gemini API (free)')
      const result = await scanWithGemini(base64Image, mimeType)
      return NextResponse.json(result)
    }

    if (OPENROUTER_API_KEY) {
      console.log('Using OpenRouter API')
      const result = await scanWithOpenRouter(base64Image, mimeType)
      return NextResponse.json(result)
    }

    // No API keys — return mock for testing
    console.log('No AI keys set, returning mock receipt data')
    return NextResponse.json(MOCK_RESPONSE)
  } catch (error: any) {
    console.error('Receipt scan error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scan receipt' },
      { status: 500 }
    )
  }
}
