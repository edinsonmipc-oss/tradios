'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Copy,
  RefreshCw,
  Shrink,
  Sparkles,
  Languages,
  Check,
  SendHorizonal,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobType =
  | 'Paving'
  | 'Brick paving'
  | 'Driveway'
  | 'Garden cleanup'
  | 'Landscaping'
  | 'Fence'
  | 'Decking'
  | 'Retaining wall'
  | 'Repair job'
  | 'Quote follow-up'
  | 'Invoice/payment follow-up'
  | 'General enquiry'

type Tone =
  | 'Basic English'
  | 'Friendly'
  | 'Professional'
  | 'Short SMS'
  | 'Detailed quote reply'

const JOB_TYPES: JobType[] = [
  'Paving',
  'Brick paving',
  'Driveway',
  'Garden cleanup',
  'Landscaping',
  'Fence',
  'Decking',
  'Retaining wall',
  'Repair job',
  'Quote follow-up',
  'Invoice/payment follow-up',
  'General enquiry',
]

const TONES: Tone[] = [
  'Basic English',
  'Friendly',
  'Professional',
  'Short SMS',
  'Detailed quote reply',
]

// ---------------------------------------------------------------------------
// Template engine — returns the base reply for a given job type
// AI API INTEGRATION POINT: Replace this function with an API call that
// takes the client message, job type, and tone, and returns an AI-generated
// reply.
// ---------------------------------------------------------------------------

function getTemplateReply(jobType: JobType, tone: Tone, clientMessage: string): string {
  let base: string

  const newWorkTypes: JobType[] = ['Paving', 'Brick paving', 'Driveway']
  const followUpTypes: JobType[] = ['Quote follow-up', 'Invoice/payment follow-up']

  if (newWorkTypes.includes(jobType)) {
    base = `Hi, thanks for your message. Yes, I can help with ${jobType.toLowerCase()}. Could you please send me a few photos of the area, the approximate measurements, and your suburb? Once I see the access and the size, I can give you a better idea of the price or organise a site visit. Thanks, Antonio.`
  } else if (jobType === 'Repair job') {
    // AI API INTEGRATION POINT: For repair jobs, analyse the client message
    // to determine if the client is asking about a specific issue, requesting
    // a quote, or asking for an urgent visit. Adjust the reply accordingly.
    base = `Hi, thanks for your message. Yes, I can help with that repair job. Could you please send me a few photos of the area, the approximate measurements, and your suburb? Once I see the access and the size, I can give you a better idea of the price or organise a site visit. Thanks, Antonio.`
  } else if (followUpTypes.includes(jobType)) {
    base = `Hi, just following up on the quote I sent. Let me know if you have any questions or if you would like to go ahead. Thanks, Antonio.`
  } else if (
    jobType === 'Garden cleanup' ||
    jobType === 'Landscaping' ||
    jobType === 'Fence' ||
    jobType === 'Decking' ||
    jobType === 'Retaining wall'
  ) {
    base = `Hi, thanks for your message. Yes, I can help with ${jobType.toLowerCase()}. Could you please send me a few photos of the area, the approximate measurements, and your suburb? Once I see the access and the size, I can give you a better idea of the price or organise a site visit. Thanks, Antonio.`
  } else {
    // General enquiry fallback
    base = `Hi, thanks for reaching out to Prime Hermes Tradie Services. Could you please tell me a bit more about what you need, including the type of work, approximate size or area, and your location? That will help me provide a better idea of pricing and next steps. Thanks, Antonio.`
  }

  // -- Check client message keywords for overrides --------------------------
  // AI API INTEGRATION POINT: Replace this keyword matching with an AI call
  // that understands the full context of the client message.
  const lowerMsg = clientMessage.toLowerCase()

  // Discount / price negotiation
  if (
    lowerMsg.includes('discount') ||
    lowerMsg.includes('too expensive') ||
    lowerMsg.includes('can you do it for') ||
    lowerMsg.includes('cheaper') ||
    lowerMsg.includes('price match')
  ) {
    base = `Hi, I understand. My price includes proper base preparation, compaction, materials, labour, clean-up, and a strong finish. I don't like doing cheap work that may fail later. I can also check if there is a simpler option to reduce the cost.`
  }

  // Review request
  if (
    lowerMsg.includes('review') ||
    lowerMsg.includes('feedback') ||
    lowerMsg.includes('google') ||
    (lowerMsg.includes('rate') && !lowerMsg.includes('quote') && !lowerMsg.includes('price'))
  ) {
    base = `Hi, thanks again for the job. I hope you're happy with the work. If you have a moment, I'd really appreciate a Google review. It helps my small business a lot. Thanks, Antonio.`
  }

  // Payment / invoice
  if (
    lowerMsg.includes('invoice') ||
    lowerMsg.includes('payment') ||
    lowerMsg.includes('paid') ||
    lowerMsg.includes('owing') ||
    lowerMsg.includes('due') ||
    lowerMsg.includes('bill')
  ) {
    base = `Hi, just a friendly reminder about the invoice. Let me know once payment has been processed. Thanks, Antonio.`
  }

  // Urgent / come today
  if (
    lowerMsg.includes('today') ||
    lowerMsg.includes('urgent') ||
    lowerMsg.includes('asap') ||
    lowerMsg.includes('emergency') ||
    lowerMsg.includes('now') ||
    lowerMsg.includes('right away')
  ) {
    base = `Hi, thanks for your message. I may not be able to come today as I'm working on site, but if you send me photos, measurements, and the address/suburb, I can first check the job and let you know the next available time for a visit. Thanks, Antonio.`
  }

  // -- Apply tone modifications ---------------------------------------------
  // AI API INTEGRATION POINT: Replace tone transformations with an AI call
  // that rewrites the reply in the requested tone.
  return applyTone(base, tone, jobType)
}

function applyTone(reply: string, tone: Tone, _jobType: JobType): string {
  switch (tone) {
    case 'Basic English':
      // Already in simple English — return as-is
      return reply

    case 'Friendly': {
      const friendly = reply
        .replace('Thanks, Antonio.', 'Cheers, Antonio 🙂')
        .replace('Hi,', 'Hey,')
        .replace('Hi, thanks', 'Hey, thanks')
        .replace('Could you please', 'Could you please')
      // Add a friendly opener if not already there
      if (!friendly.includes('Hope you\'re doing well')) {
        return friendly.replace(
          /^(Hey|Hi)[^.]*\./,
          '$& Hope you\'re doing well!'
        )
      }
      return friendly
    }

    case 'Professional': {
      const prof = reply
        .replace('Hi,', 'Dear client,')
        .replace('Thanks, Antonio.', 'Kind regards,\nAntonio\nPrime Hermes Tradie Services')
        .replace('Cheers', 'Kind regards')
      return prof
    }

    case 'Short SMS': {
      const short = reply
        .replace('Could you please send me a few photos of the area, the approximate measurements, and your suburb?', 'Pls send photos, measurements & suburb.')
        .replace('Once I see the access and the size, I can give you a better idea of the price or organise a site visit.', 'I\'ll check access & size then advise price or book a visit.')
        .replace('Could you please tell me a bit more about what you need, including the type of work, approximate size or area, and your location?', 'Tell me what you need, size & location pls.')
        .replace('That will help me provide a better idea of pricing and next steps.', 'I can then give you a price.')
        .replace('Let me know if you have any questions or if you would like to go ahead.', 'Any questions? Lmk if you want to proceed.')
        .replace('Let me know once payment has been processed.', 'Lmk once paid.')
        .replace('Thanks, Antonio.', 'Tx, Antonio.')
      return short
    }

    case 'Detailed quote reply': {
      const detailed = reply
        .replace(
          'Thanks, Antonio.',
          'Please let me know if you have any questions about the scope of work.\n\nBest regards,\nAntonio\nPrime Hermes Tradie Services'
        )
        .replace(
          'Yes, I can help with',
          'Yes, I would be happy to provide a quote for'
        )
      if (!detailed.includes('scope of work')) {
        return detailed.replace(
          /(Thanks, Antonio\.)/,
          'I take pride in delivering high-quality work with proper materials and workmanship. Please let me know if you have any questions.\n\n$1'
        )
      }
      return detailed
    }

    default:
      return reply
  }
}

// AI API INTEGRATION POINT: Add a function here that calls an AI API
// (e.g. OpenAI, Anthropic) to generate a fully context-aware reply based on
// the client message, job type, and tone.
//
// Example:
// async function generateAiReply(clientMessage: string, jobType: JobType, tone: Tone): Promise<string> {
//   const response = await fetch('/api/ai/generate-reply', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ clientMessage, jobType, tone }),
//   })
//   const data = await response.json()
//   return data.reply
// }

// ---------------------------------------------------------------------------
// Utility helpers (these will also be replaced by AI API calls)
// AI API INTEGRATION POINT: Replace these rewrite functions with AI calls.
// ---------------------------------------------------------------------------

function makeShorter(reply: string): string {
  // Simple shortening: remove redundant phrases
  let s = reply
    .replace('Could you please send me a few photos of the area, the approximate measurements, and your suburb?', 'Pls send photos, measurements & suburb.')
    .replace('Once I see the access and the size, I can give you a better idea of the price or organise a site visit.', 'I\'ll check & advise price or visit.')
    .replace('Could you please tell me a bit more about what you need, including the type of work, approximate size or area, and your location?', 'Pls tell me the work type, size & location.')
    .replace('That will help me provide a better idea of pricing and next steps.', 'Then I can give a price.')
    .replace('I hope you\'re happy with the work.', 'Hope you\'re happy.')
    .replace('I\'d really appreciate a Google review. It helps my small business a lot.', 'A Google review helps my small business.')
    .replace('Let me know once payment has been processed.', 'Lmk when paid.')
    .replace('Let me know if you have any questions or if you would like to go ahead.', 'Any Qs? Lmk to proceed.')
    .replace('Please let me know if you have any questions about the scope of work.', 'Any Qs?')
    .replace('I take pride in delivering high-quality work with proper materials and workmanship.', '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  // Shorten sign-off
  if (s.includes('Kind regards')) {
    s = s.replace(/Kind regards,\nAntonio\nPrime Hermes Tradie Services/, 'Tx, Antonio.')
  } else if (s.includes('Cheers')) {
    s = s.replace(/Cheers.*/, 'Tx, Antonio.')
  } else {
    s = s.replace('Thanks, Antonio.', 'Tx, Antonio.')
  }

  return s
}

function makeMoreProfessional(reply: string): string {
  let p = reply
  // Replace casual greetings
  p = p.replace(/^Hey,/, 'Dear client,')
  p = p.replace(/^Hi,/, 'Dear client,')
  // Replace casual sign-offs
  p = p.replace(/Cheers,.*/, 'Kind regards,\nAntonio\nPrime Hermes Tradie Services')
  p = p.replace(/Tx, Antonio\./, 'Kind regards,\nAntonio\nPrime Hermes Tradie Services')
  p = p.replace(/Thanks, Antonio\./, 'Kind regards,\nAntonio\nPrime Hermes Tradie Services')
  // Upgrade language
  p = p.replace(/can help/, 'would be happy to assist')
  p = p.replace(/send me/, 'provide')
  p = p.replace(/let you know/, 'advise')
  p = p.replace(/I'll check/, 'I will review')
  p = p.replace(/pls/i, 'please')
  p = p.replace(/Lmk/i, 'Please let me know')
  p = p.replace(/Any Qs/i, 'Should you have any questions')
  p = p.replace(/Tx/i, 'Thank you')

  return p
}

function translateToSpanish(reply: string): string {
  // AI API INTEGRATION POINT: Replace this simple dictionary with an AI
  // translation API call for accurate Spanish translations.
  const translations: Record<string, string> = {
    'Hi': 'Hola',
    'Hey': 'Hola',
    'Dear client': 'Estimado cliente',
    'Thanks': 'Gracias',
    'Tx': 'Gracias',
    'Cheers': 'Saludos',
    'thank you': 'gracias',
    'Thank you': 'Gracias',
    'Hope you\'re doing well': 'Espero que esté bien',
    'Hope you\'re happy': 'Espero que esté contento',
    'I hope you\'re happy with the work': 'Espero que esté satisfecho con el trabajo',
    'Yes, I can help with': 'Sí, puedo ayudar con',
    'Yes, I would be happy to provide a quote for': 'Sí, con gusto le proporcionaré un presupuesto para',
    'I can help with': 'puedo ayudar con',
    'would be happy to assist': 'con gusto le ayudaré',
    'Could you please send me a few photos of the area, the approximate measurements, and your suburb': '¿Podría enviarme algunas fotos del área, las medidas aproximadas y su suburbio',
    'Once I see the access and the size, I can give you a better idea of the price or organise a site visit': 'Una vez que vea el acceso y el tamaño, podré darle una mejor idea del precio u organizar una visita al sitio',
    'Tell me what you need, size & location pls': 'Dígame qué necesita, tamaño y ubicación por favor',
    'Pls send photos, measurements & suburb': 'Por favor envíe fotos, medidas y suburbio',
    'Pls tell me the work type, size & location': 'Por favor dígame el tipo de trabajo, tamaño y ubicación',
    'I will review': 'Revisaré',
    'I\'ll check & advise price or visit': 'Revisaré y le informaré el precio o la visita',
    'I\'ll check access & size then advise price or book a visit': 'Revisaré el acceso y el tamaño y luego le informaré el precio o reservaré una visita',
    'I can then give you a price': 'Entonces puedo darle un precio',
    'Then I can give a price': 'Entonces puedo darle un precio',
    'Could you please tell me a bit more about what you need, including the type of work, approximate size or area, and your location': '¿Podría contarme un poco más sobre lo que necesita, incluyendo el tipo de trabajo, el tamaño aproximado y su ubicación',
    'That will help me provide a better idea of pricing and next steps': 'Eso me ayudará a darle una mejor idea del precio y los próximos pasos',
    'just following up on the quote I sent': 'solo dando seguimiento al presupuesto que envié',
    'Let me know if you have any questions or if you would like to go ahead': 'Avíseme si tiene alguna pregunta o si desea continuar',
    'Any questions? Lmk if you want to proceed': '¿Alguna pregunta? Avíseme si desea continuar',
    'Any Qs? Lmk to proceed': '¿Alguna pregunta? Avíseme para continuar',
    'should you have any questions': 'si tiene alguna pregunta',
    'Please let me know if you have any questions about the scope of work': 'Por favor, hágame saber si tiene alguna pregunta sobre el alcance del trabajo',
    'I understand. My price includes proper base preparation, compaction, materials, labour, clean-up, and a strong finish': 'Entiendo. Mi precio incluye preparación adecuada de la base, compactación, materiales, mano de obra, limpieza y un acabado resistente',
    'I don\'t like doing cheap work that may fail later': 'No me gusta hacer trabajos baratos que puedan fallar después',
    'I can also check if there is a simpler option to reduce the cost': 'También puedo verificar si hay una opción más simple para reducir el costo',
    'thanks again for the job': 'gracias nuevamente por el trabajo',
    'If you have a moment, I\'d really appreciate a Google review': 'Si tiene un momento, realmente agradecería una reseña en Google',
    'It helps my small business a lot': 'Ayuda mucho a mi pequeño negocio',
    'A Google review helps my small business': 'Una reseña en Google ayuda a mi pequeño negocio',
    'just a friendly reminder about the invoice': 'solo un recordatorio amistoso sobre la factura',
    'Let me know once payment has been processed': 'Avíseme una vez que se haya procesado el pago',
    'Lmk when paid': 'Avíseme cuando esté pagado',
    'Lmk once paid': 'Avíseme cuando esté pagado',
    'Please let me know': 'Por favor avíseme',
    'I may not be able to come today as I\'m working on site': 'Puede que no pueda ir hoy porque estoy trabajando en obra',
    'but if you send me photos, measurements, and the address/suburb': 'pero si me envía fotos, medidas y la dirección/suburbio',
    'I can first check the job and let you know the next available time for a visit': 'primero puedo revisar el trabajo y avisarle la próxima hora disponible para una visita',
    'thanks for reaching out to Prime Hermes Tradie Services': 'gracias por contactar a Prime Hermes Tradie Services',
    'Prime Hermes Tradie Services': 'Prime Hermes Tradie Services',
    'thanks for your message': 'gracias por su mensaje',
    'Please let me know if you have any questions': 'Por favor, hágame saber si tiene alguna pregunta',
    'I take pride in delivering high-quality work with proper materials and workmanship': 'Me enorgullece ofrecer un trabajo de alta calidad con materiales y mano de obra adecuados',
    'Best regards': 'Saludos cordiales',
    'Kind regards': 'Saludos cordiales',
    'Antonio': 'Antonio',
    'provide': 'proporcionar',
    'advise': 'informar',
    'please': 'por favor',
    'provide a better idea': 'dar una mejor idea',
    'price': 'precio',
    'pricing': 'precios',
    'photos': 'fotos',
    'measurements': 'medidas',
    'suburb': 'suburbio',
    'location': 'ubicación',
    'area': 'área',
    'size': 'tamaño',
    'work': 'trabajo',
    'job': 'trabajo',
    'cheap work': 'trabajo barato',
    'proper materials': 'materiales adecuados',
    'strong finish': 'acabado resistente',
    'simpler option': 'opción más simple',
    'cost': 'costo',
    'quote': 'presupuesto',
    'invoice': 'factura',
    'payment': 'pago',
    'paid': 'pagado',
    'visit': 'visita',
    'site': 'obra',
    'questions': 'preguntas',
    'question': 'pregunta',
    'access': 'acceso',
    'review': 'reseña',
    'rating': 'calificación',
    'Google': 'Google',
    'business': 'negocio',
    'small business': 'pequeño negocio',
    'today': 'hoy',
    'next available time': 'próxima hora disponible',
    'Give a': 'Dar una',
    'Any': 'Alguna',
    'Note': 'Nota',
    'Dear': 'Estimado',
    'client': 'cliente',
  }

  // Sort keys by length (longest first) to match multi-word phrases before single words
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length)

  let translated = reply
  for (const key of sortedKeys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    translated = translated.replace(new RegExp(escaped, 'g'), translations[key])
  }

  // Replace spaces as needed
  translated = translated.replace(/😀/g, '')
  translated = translated.replace(/🙂/g, '')

  return translated
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ClientMessagePage() {
  const [clientMessage, setClientMessage] = useState('')
  const [jobType, setJobType] = useState<JobType>('General enquiry')
  const [tone, setTone] = useState<Tone>('Friendly')
  const [generatedReply, setGeneratedReply] = useState<string | null>(null)
  const [shortVersion, setShortVersion] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!clientMessage.trim()) {
      toast.error('Please paste the client message first')
      return
    }

    setIsGenerating(true)

    try {
      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientMessage, jobType, tone }),
      })
      const data = await res.json()
      if (data.reply) {
        setGeneratedReply(data.reply)
        if (data.shortVersion) setShortVersion(data.shortVersion)
      } else {
        toast.error(data.error || 'Failed to generate reply')
      }
    } catch {
      toast.error('Failed to connect to AI. Using template fallback.')
      const reply = getTemplateReply(jobType, tone, clientMessage)
      setGeneratedReply(reply)
    }
    setIsGenerating(false)
  }, [clientMessage, jobType, tone])

  const handleRegenerate = useCallback(async () => {
    if (!clientMessage.trim()) {
      toast.error('Please paste the client message first')
      return
    }
    setIsGenerating(true)

    try {
      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientMessage, jobType, tone }),
      })
      const data = await res.json()
      if (data.reply) {
        setGeneratedReply(data.reply)
        toast.success('Reply regenerated')
      } else {
        toast.error(data.error || 'Failed to regenerate')
      }
    } catch {
      const reply = getTemplateReply(jobType, tone, clientMessage)
      setGeneratedReply(reply)
      toast.success('Reply regenerated')
    }
    setIsGenerating(false)
  }, [clientMessage, jobType, tone])

  const handleCopy = useCallback(async () => {
    if (!generatedReply) return
    try {
      await navigator.clipboard.writeText(generatedReply)
      setCopied(true)
      toast.success('Reply copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [generatedReply])

  const handleMakeShorter = useCallback(async () => {
    if (!generatedReply) return
    try {
      const res = await fetch('/api/assistant/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: generatedReply, action: 'shorten' }),
      })
      const data = await res.json()
      if (data.reply) setGeneratedReply(data.reply)
      toast.success('Reply shortened')
    } catch {
      toast.error('Failed to shorten')
    }
  }, [generatedReply])

  const handleMakeMoreProfessional = useCallback(async () => {
    if (!generatedReply) return
    try {
      const res = await fetch('/api/assistant/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: generatedReply, action: 'professional' }),
      })
      const data = await res.json()
      if (data.reply) setGeneratedReply(data.reply)
      toast.success('Reply made more professional')
    } catch {
      toast.error('Failed to rewrite')
    }
  }, [generatedReply])

  const handleTranslateToSpanish = useCallback(async () => {
    if (!generatedReply) return
    try {
      const res = await fetch('/api/assistant/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: generatedReply, action: 'spanish' }),
      })
      const data = await res.json()
      if (data.reply) setGeneratedReply(data.reply)
      toast.success('Translated to Spanish')
    } catch {
      toast.error('Failed to translate')
    }
  }, [generatedReply])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">
          Client Message Assistant
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Paste a client message and generate a professional reply for Prime
          Hermes Tradie Services
        </p>
      </div>

      {/* ── Input Card ── */}
      <div className="rounded-xl border border-[#1e3a5f] bg-[#131c31] p-4 sm:p-6">
        <div className="space-y-4">
          {/* Job type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as JobType)}
              className="w-full rounded-lg border border-[#1e293b] bg-[#0a0f1c] px-3 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50"
            >
              {JOB_TYPES.map((jt) => (
                <option key={jt} value={jt}>
                  {jt}
                </option>
              ))}
            </select>
          </div>

          {/* Tone selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full rounded-lg border border-[#1e293b] bg-[#0a0f1c] px-3 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Client message textarea */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Client&apos;s Message
            </label>
            <textarea
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              placeholder="Paste the client's message here..."
              rows={5}
              className="w-full resize-y rounded-lg border border-[#1e293b] bg-[#0a0f1c] px-3 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#94a3b8]/50 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            loading={isGenerating}
            className="w-full sm:w-auto"
          >
            <SendHorizonal className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Reply'}
          </Button>
        </div>
      </div>

      {/* ── Generated Reply ── */}
      {generatedReply && (
        <div className="rounded-xl border border-[#1e3a5f] bg-[#131c31] p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#0d9488]/10 p-2">
                <MessageSquare className="h-4 w-4 text-[#0d9488]" />
              </div>
              <h2 className="text-sm font-semibold text-[#f1f5f9]">
                Generated Reply
              </h2>
            </div>
            <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-xs font-medium text-[#0d9488]">
              via Template
            </span>
          </div>

          {/* Reply content */}
          <div className="rounded-lg border border-[#1e293b] bg-[#0a0f1c] p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f1f5f9]">
              {generatedReply}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleMakeShorter}
            >
              <Shrink className="h-3.5 w-3.5" />
              Make Shorter
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleMakeMoreProfessional}
            >
              <Sparkles className="h-3.5 w-3.5" />
              More Professional
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTranslateToSpanish}
            >
              <Languages className="h-3.5 w-3.5" />
              Spanish
            </Button>
          </div>

          {/* Footer business name */}
          <p className="mt-4 border-t border-[#1e293b] pt-3 text-center text-xs text-[#94a3b8]">
            Prime Hermes Tradie Services &mdash; Professional Reply Generator
          </p>
        </div>
      )}

      {/* ── AI API Integration Note ── */}
      {/* AI API INTEGRATION POINT:
          To integrate a real AI API:
          1. Create an API route at app/api/ai/generate-reply/route.ts
          2. Replace the setTimeout in handleGenerate with a fetch() call
          3. Pass { clientMessage, jobType, tone } in the request body
          4. Use the AI response instead of getTemplateReply()
          5. Replace the rewrite helpers (makeShorter, makeMoreProfessional,
             translateToSpanish) with API calls to the same or different
             endpoints for better quality.
      */}
    </div>
  )
}
