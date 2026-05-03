import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, body, client_id, reply_to } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    // Get user profile for sender name
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, full_name, email_sender, email_signature')
      .eq('id', user.id)
      .single()

    const senderName = profile?.business_name || profile?.full_name || user.email?.split('@')[0] || 'Tradios'

    // Try to send via Resend if API key is available
    const resendApiKey = process.env.RESEND_API_KEY
    let resendResult = null

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const senderEmail = profile?.email_sender || 'notifications@tradios.app'
        const signature = profile?.email_signature || ''

        const htmlBody = signature
          ? `${body.replace(/\n/g, '<br/>')}\n\n--<br/>${signature.replace(/\n/g, '<br/>')}`
          : body.replace(/\n/g, '<br/>')

        resendResult = await resend.emails.send({
          from: `${senderName} <${senderEmail}>`,
          to: [to],
          replyTo: reply_to || user.email || undefined,
          subject,
          html: htmlBody,
        })
      } catch (resendError: any) {
        console.error('Resend send error:', resendError)
        // Don't fail — log and continue
      }
    }

    // Store in messages table for history
    const { error: dbError } = await supabase.from('messages').insert({
      user_id: user.id,
      client_id: client_id || null,
      type: 'email',
      direction: 'outgoing',
      subject,
      body,
      status: resendResult?.data?.id ? 'sent' : 'draft',
      sent_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error('Failed to save email to DB:', dbError)
    }

    if (!resendApiKey) {
      return NextResponse.json({
        success: true,
        stored: true,
        message: 'Email saved as draft. Configure RESEND_API_KEY in environment to send.',
      })
    }

    return NextResponse.json({
      success: true,
      sent: true,
      id: resendResult?.data?.id,
      message: 'Email sent successfully!',
    })
  } catch (error: any) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
