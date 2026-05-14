import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'

async function generateWithDeepSeek(prompt: string) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a professional quoting assistant. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`)
  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

async function generateWithOpenRouter(prompt: string) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://tradios.onrender.com',
      'X-Title': 'Tradie SitePilot',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: 'You are a professional quoting assistant for Australian trades. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`)
  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

async function generateWithGemini(prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 4000 },
      }),
    }
  )
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return JSON.parse(text)
}

function buildQuotePrompt(clientName: string, jobAddress: string, title: string, description: string, budgetRange: string, feedback: string | null) {
  const isRefinement = feedback ? `\n\nIMPROVEMENT REQUEST: The user reviewed the previous quote and wants you to improve it. Their feedback is: "${feedback}". Apply this feedback to create a better version. Keep ALL sections.` : ''

  return `You are Antonio, owner of Antonio PrimeScape Construction (ABN 39 104 568 456), a premium Melbourne paving and landscaping company. You're known for professional, detailed quotes that win jobs.

Generate a PREMIUM, detailed quote for:

CLIENT: ${clientName}
JOB ADDRESS: ${jobAddress || 'TBC'}
SERVICE: ${title}
DESCRIPTION: ${description || 'Full professional installation'}
BUDGET: ${budgetRange || 'Not specified'}${isRefinement}

CRITICAL FORMAT RULES:
- All prices in AUD, include GST (10%)
- All labour rates reflect premium Melbourne tradie pricing
- Materials reflect current market prices
- Include 12-month workmanship warranty standard

Return a VALID JSON object with this EXACT structure:

{
  "quoteNumber": "Q-2026-NNN",
  "clientName": "${clientName}",
  "date": "14 May 2026",
  "validUntil": "28 May 2026",
  "businessName": "Antonio PrimeScape Construction",
  "abn": "39 104 568 456",
  "phone": "0468 166 249",
  "email": "antonioprimemaintenance@gmail.com",
  "jobAddress": "${jobAddress || 'TBC'}",
  "introduction": "Personalised intro paragraph thanking the client and explaining the quote. Warm, professional tone. 2-3 sentences.",
  
  "options": [
    {
      "name": "Best Value - [Material]",
      "total": 5900,
      "description": "Warm, natural, earthy feel. Creams and golden tans. Relaxed, garden-style feel.",
      "recommended": false,
      "dayByDay": [
        {
          "day": 1,
          "title": "Site Preparation",
          "details": "Arrive 7:00-7:30am. Set out levels, prepare base, apply mortar screed bed across full area."
        },
        {
          "day": 2,
          "title": "Installation Begins",
          "details": "Lay out stones, plan pattern, begin placing on mortar bed. Cut pieces to fit edges and corners."
        },
        {
          "day": 3,
          "title": "Completion & Pointing",
          "details": "Complete all paving, tap-test every stone, pack mortar joints, clean faces."
        },
        {
          "day": 4,
          "title": "Finishing & Handover",
          "details": "Touch up pointing, full wash-down, walkthrough with client, remove all equipment."
        }
      ],
      "labourDays": 4,
      "whatsIncluded": [
        "All paving stone supplied and delivered",
        "Full installation by experienced team",
        "All cutting, edges, corners and borders",
        "Full wash-down and clean on completion",
        "Removal of all waste and packaging",
        "12-month workmanship warranty"
      ],
      "whatsNotIncluded": [
        "Structural slab repairs (rare)",
        "Stone sealing (optional add-on)",
        "Any works outside agreed area"
      ]
    }
  ],
  
  "recommendation": {
    "optionIndex": 1,
    "title": "My Recommendation - [Material]",
    "reason": "2-3 paragraph personal recommendation explaining why this option is best for the client's specific property. Reference the address, home style, and practical benefits."
  },
  
  "depositRequired": 50,
  "paymentTerms": "50% deposit to confirm your booking. Balance due on completion. EFT and cash accepted.",
  "warranty": "12-month workmanship warranty on all installation work. If anything we've done isn't right, I'll come back and fix it at no cost.",
  "validityDays": 14,
  "notes": "Professional closing paragraph. Offer to discuss options. Include personal phone number."
}`
}

export async function POST(request: NextRequest) {
  try {
    const { clientName, jobAddress, title, description, budgetRange, feedback } = await request.json()

    if (!clientName) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    const prompt = buildQuotePrompt(clientName, jobAddress || '', title || 'General quote', description || '', budgetRange || '', feedback || null)

    let result: any = null
    const errors: string[] = []

    // Try DeepSeek first (fastest)
    if (DEEPSEEK_API_KEY) {
      try {
        result = await generateWithDeepSeek(prompt)
        console.log('✅ Quote generated with DeepSeek')
      } catch (e: any) { errors.push(`DeepSeek: ${e.message}`) }
    }

    // Fall back to OpenRouter
    if (!result && OPENROUTER_API_KEY) {
      try {
        result = await generateWithOpenRouter(prompt)
        console.log('✅ Quote generated with OpenRouter')
      } catch (e: any) { errors.push(`OpenRouter: ${e.message}`) }
    }

    // Fall back to Gemini
    if (!result && GEMINI_API_KEY) {
      try {
        result = await generateWithGemini(prompt)
        console.log('✅ Quote generated with Gemini')
      } catch (e: any) { errors.push(`Gemini: ${e.message}`) }
    }

    if (!result) {
      return NextResponse.json({
        error: `All AI providers failed: ${errors.join('; ')}`,
        mock: true,
        ...getMockQuote(clientName, title || 'General quote'),
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Quote generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate quote' },
      { status: 500 }
    )
  }
}

function getMockQuote(clientName: string, title: string) {
  return {
    quoteNumber: 'Q-2026-MOCK',
    clientName,
    date: '14 May 2026',
    validUntil: '28 May 2026',
    businessName: 'Antonio PrimeScape Construction',
    abn: '39 104 568 456',
    phone: '0468 166 249',
    email: 'antonioprimemaintenance@gmail.com',
    introduction: `Thank you for having me out to your property. I've put together a detailed quote for your ${title} project with three material options.`,
    options: [
      {
        name: 'Standard Finish',
        total: 4900,
        description: 'Quality materials and professional installation.',
        recommended: false,
        dayByDay: [
          { day: 1, title: 'Preparation', details: 'Site setup, level checking, base preparation.' },
          { day: 2, title: 'Installation', details: 'Main installation work.' },
          { day: 3, title: 'Completion', details: 'Finishing touches, clean-up, handover.' },
        ],
        labourDays: 3,
        whatsIncluded: ['All materials supplied', 'Full installation', 'Clean-up', '12-month warranty'],
        whatsNotIncluded: ['Structural repairs', 'Sealing'],
      },
      {
        name: 'Premium Finish (Recommended)',
        total: 6700,
        description: 'Premium materials with meticulous attention to detail.',
        recommended: true,
        dayByDay: [
          { day: 1, title: 'Preparation', details: 'Site setup, level checking, base preparation.' },
          { day: 2, title: 'Installation Day 1', details: 'Main installation work.' },
          { day: 3, title: 'Installation Day 2', details: 'Continue and complete installation.' },
          { day: 4, title: 'Completion', details: 'Finishing touches, clean-up, handover.' },
        ],
        labourDays: 4,
        whatsIncluded: ['Premium materials supplied', 'Full installation by experienced team', 'All cutting and fitting', 'Clean-up', '12-month warranty'],
        whatsNotIncluded: ['Structural repairs', 'Sealing'],
      },
    ],
    recommendation: { optionIndex: 1, title: 'Premium Finish', reason: `I recommend the Premium option for ${clientName}. It provides the best long-term value and aesthetic result.` },
    depositRequired: 50,
    paymentTerms: '50% deposit to confirm booking. Balance on completion.',
    warranty: '12-month workmanship warranty on all installation work.',
    validityDays: 14,
    notes: `I'm happy to walk through any of these options with you. Just give me a call.`,
  }
}
