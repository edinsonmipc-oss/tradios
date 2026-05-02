import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote, QuoteItem } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuotePrintPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(name, phone, email, address)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!quote) notFound()

  const typedQuote = quote as unknown as Quote
  const items = typedQuote.items || []
  const gst = typedQuote.gst || 0
  const subtotal = typedQuote.subtotal || 0

  return (
    <html>
      <head>
        <title>{typedQuote.quote_number} - Quote</title>
        <style>{`
          @page { margin: 20mm 15mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
          .header-left h1 { font-size: 28px; color: #2563eb; margin: 0 0 4px 0; }
          .header-left p { color: #666; margin: 0; font-size: 14px; }
          .header-right { text-align: right; }
          .header-right h2 { font-size: 22px; margin: 0 0 4px 0; }
          .header-right .status { background: #2563eb; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; display: inline-block; }
          .client-section { margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .client-section h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .client-section p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          thead th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px; }
          thead th:last-child, tbody td:last-child { text-align: right; }
          thead th:nth-child(2), thead th:nth-child(3), tbody td:nth-child(2), tbody td:nth-child(3) { text-align: center; }
          tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tbody tr:last-child td { border-bottom: none; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #2563eb; margin-top: 6px; padding-top: 10px; color: #2563eb; }
          .notes { margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .notes h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .notes p { margin: 0; white-space: pre-wrap; color: #444; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print" style={{ textAlign: 'center', marginBottom: 20 }}>
          <button onClick={() => window.print()} style={{ padding: '10px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>
            🖨️ Print / Save as PDF
          </button>
          <p style={{ color: '#666', marginTop: 8, fontSize: 13 }}>On mobile: press Print, then choose "Save as PDF"</p>
        </div>

        <div className="header">
          <div className="header-left">
            <h1>QUOTE</h1>
            <p>{typedQuote.title}</p>
          </div>
          <div className="header-right">
            <h2>{typedQuote.quote_number}</h2>
            <span className="status">{typedQuote.status?.toUpperCase()}</span>
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Date: {formatDate(typedQuote.created_at)}</p>
          </div>
        </div>

        {typedQuote.clients && (
          <div className="client-section">
            <h3>Bill To</h3>
            <p style={{ fontWeight: 'bold', fontSize: 16 }}>{(typedQuote.clients as any).name || 'N/A'}</p>
            {(typedQuote.clients as any).phone && <p style={{ color: '#444' }}>{(typedQuote.clients as any).phone}</p>}
            {(typedQuote.clients as any).email && <p style={{ color: '#444' }}>{(typedQuote.clients as any).email}</p>}
            {(typedQuote.clients as any).address && <p style={{ color: '#444' }}>{(typedQuote.clients as any).address}</p>}
          </div>
        )}

        {items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Description</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '12%' }}>Rate</th>
                <th style={{ width: '15%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: QuoteItem, i: number) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                  <td style={{ textAlign: 'center' }}>${item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="totals">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {gst > 0 && (
            <div className="totals-row">
              <span>GST (10%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
          )}
          <div className="totals-row total">
            <span>Total</span>
            <span>${(typedQuote.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {typedQuote.notes && (
          <div className="notes">
            <h3>Notes & Terms</h3>
            <p>{typedQuote.notes}</p>
          </div>
        )}

        <div className="footer">
          <p>Thank you for your business!</p>
          <p style={{ marginTop: 4, fontSize: 11 }}>
            {(typedQuote.clients as any)?.name || 'PrimeScape Construction'} • {(typedQuote.clients as any)?.phone || ''}
          </p>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => window.print(), 500);` }} />
      </body>
    </html>
  )
}
