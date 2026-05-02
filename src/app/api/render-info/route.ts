import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    serviceId: process.env.RENDER_SERVICE_ID || null,
    serviceName: process.env.RENDER_SERVICE_NAME || null,
    serviceType: process.env.RENDER_SERVICE_TYPE || null,
    instanceId: process.env.RENDER_INSTANCE_ID || null,
    region: process.env.RENDER_REGION || null,
  })
}
