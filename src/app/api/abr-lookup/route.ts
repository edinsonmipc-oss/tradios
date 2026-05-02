import { NextRequest, NextResponse } from 'next/server'

interface AbrEntityName {
  value: string
}

interface AbrField {
  value: string
}

interface AbrSearchResult {
  Abn: AbrField
  AbnStatus: AbrField
  EntityName: AbrEntityName
  EntityType: AbrField
  Address: AbrField
  AddressState: AbrField
  AddressPostcode: AbrField
  GstStatus: AbrField
  GstRegistrationDate: AbrField
}

interface AbrSearchResults {
  AbnSearchResult: AbrSearchResult
}

interface AbrError {
  error: string
}

interface AbrResponse {
  AbnSearchResults?: AbrSearchResults
  Message?: string
  ExceptionDescription?: string
  Error?: string
}

interface AbnLookupResult {
  name: string
  abn: string
  status: string
  address: string
  gst: string
  entity_type: string
}

function constructAddress(result: AbrSearchResult): string {
  const parts: string[] = []
  if (result.Address?.value) parts.push(result.Address.value)
  if (result.AddressState?.value) parts.push(result.AddressState.value)
  if (result.AddressPostcode?.value) parts.push(result.AddressPostcode.value)
  return parts.join(', ') || 'Address not available'
}

export async function POST(request: NextRequest) {
  let body: { abn?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const abn = (body.abn || '').replace(/\s/g, '')

  if (!/^\d{11}$/.test(abn)) {
    return NextResponse.json({ error: 'Invalid ABN format. Must be 11 digits.' }, { status: 400 })
  }

  const guid = process.env.ABR_GUID

  if (!guid) {
    return NextResponse.json(
      {
        error:
          'ABR GUID not configured. Register for a free GUID at https://abr.business.gov.au/Tools/WebServicesAgreement.aspx',
      },
      { status: 500 }
    )
  }

  try {
    const url = `https://abr.business.gov.au/ABRJSONSearch.aspx?guid=${guid}&query=${abn}&authentication=guid&type=ABN`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      console.error('ABR API HTTP error:', res.status, errorText)
      return NextResponse.json({ error: `ABR service returned status ${res.status}` }, { status: 502 })
    }

    const text = await res.text()

    // The ABR API returns JSONP — strip any padding
    let jsonText = text.trim()
    if (jsonText.startsWith('(') && jsonText.endsWith(')')) {
      jsonText = jsonText.slice(1, -1)
    }

    const data: AbrResponse = JSON.parse(jsonText)

    // Check for error responses from ABR
    if (data.Message || data.ExceptionDescription) {
      return NextResponse.json(
        { error: data.Message || data.ExceptionDescription || 'ABN not found' },
        { status: 404 }
      )
    }

    if (!data.AbnSearchResults?.AbnSearchResult) {
      return NextResponse.json({ error: 'ABN not found in Australian Business Register' }, { status: 404 })
    }

    const result = data.AbnSearchResults.AbnSearchResult

    const lookupResult: AbnLookupResult = {
      name: result.EntityName?.value || 'Unknown',
      abn: result.Abn?.value || abn,
      status: result.AbnStatus?.value || 'Unknown',
      address: constructAddress(result),
      gst: result.GstStatus?.value || 'No',
      entity_type: result.EntityType?.value || 'Unknown',
    }

    return NextResponse.json(lookupResult)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to look up ABN'
    console.error('ABR lookup error:', error)

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'ABR service timed out. Please try again.' }, { status: 504 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
