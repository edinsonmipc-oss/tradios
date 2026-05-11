import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-001'

export async function POST(request: NextRequest) {
  try {
    const { clientMessage, jobType, tone } = await request.json()

    if (!clientMessage) {
      return NextResponse.json({ error: 'Client message is required' }, { status: 400 })
    }

    const toneInstructions: Record<string, string> = {
      'Basic English': 'Use very simple, clear English. Short sentences. Easy to understand for non-native speakers.',
      'Friendly': 'Be warm and friendly. Use a casual, approachable tone. Sound like a helpful tradie next door.',
      'Professional': 'Be professional and polished. Use proper grammar. Sound like a reputable business.',
      'Short SMS': 'Keep it very short, like an SMS. Just the essential info in 2-3 sentences.',
      'Detailed quote reply': 'Provide a detailed response covering all aspects of the job enquiry, pricing approach, and next steps.',
    }

    const toneInstruction = toneInstructions[tone] || toneInstructions['Friendly']

    // Try OpenRouter
    if (OPENROUTER_API_KEY) {
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
              content: `You are Antonio, the owner of Prime Hermes Tradie Services (also known as Antonio PrimeScape Construction / Antonio Paving). You are an Australian tradie who does paving, landscaping, fencing, decking, retaining walls, and general construction work.

CRITICAL RULES:
- You speak as Antonio — a real tradie, not a robot
- Use simple, clear English
- Be friendly and professional
- NEVER promise a fixed price without enough information
- When the client asks for a quote or price, ask for: photos of the area, approximate measurements, and their suburb/location
- Explain that a site visit may be needed for an accurate price
- Mention that price depends on: site access, excavation depth, drainage, material choice, and condition of existing base
- If the client wants a visit today and you're busy, explain you're on site and can check details first before scheduling
- If the client says the price is too expensive, explain your price includes proper base preparation, compaction, materials, labour, clean-up, and a strong finish — you don't do cheap work that fails later
- Sign off as "Thanks, Antonio"
- Never sound robotic or corporate

JOB TYPE CONTEXT: ${jobType || 'General enquiry'}

TONE: ${toneInstruction}

The response should be ready to send directly to the client. No extra commentary. Just the message.`,
            },
            { role: 'user', content: `Here is the client's message: "${clientMessage}"\n\nGenerate the perfect reply as Antonio.` },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('OpenRouter API error:', response.status, errorBody)
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const completion = await response.json()
      const content = completion?.choices?.[0]?.message?.content

      // Also generate a shorter version
      const shortResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
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
              content: 'You are Antonio, an Australian tradie. Rewrite the following message as a very short SMS version. Keep it to 2-3 sentences max. Sign off as "Thanks, Antonio". No extra commentary.',
            },
            { role: 'user', content: `Shorten this for SMS:\n\n${content}` },
          ],
          temperature: 0.5,
          max_tokens: 300,
        }),
      })

      const shortCompletion = await shortResponse.json()
      const shortContent = shortCompletion?.choices?.[0]?.message?.content || content

      return NextResponse.json({
        reply: content || '',
        shortVersion: shortContent || content || '',
      })
    }

    // Fallback template
    const templates: Record<string, string> = {
      'Paving': `Hi, thanks for your message. Yes, I can help with the paving. Could you please send me a few photos of the area, the approximate measurements, and your suburb? Once I see the access and the size, I can give you a better idea of the price or organise a site visit. Thanks, Antonio.`,
      'Quote follow-up': `Hi, just following up on the quote I sent. Let me know if you have any questions or if you would like to go ahead. Thanks, Antonio.`,
    }

    return NextResponse.json({
      reply: templates[jobType] || `Hi, thanks for reaching out to Prime Hermes Tradie Services. Could you please tell me a bit more about what you need, including the type of work, approximate size or area, and your location? That will help me provide a better idea of pricing and next steps. Thanks, Antonio.`,
      shortVersion: '',
    })
  } catch (error: any) {
    console.error('AI message generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate reply' },
      { status: 500 }
    )
  }
}
