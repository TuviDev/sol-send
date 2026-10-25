import { NextRequest, NextResponse } from 'next/server'

function multiHopperBase(network: string | null) {
  return network === 'mainnet-beta'
    ? 'https://multihopper.com/api/v1'
    : 'https://devnet.multihopper.com/api/v1'
}

async function proxy(request: NextRequest, path: string[]) {
  const apiKey = process.env.MULTIHOPPER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          message:
            'MULTIHOPPER_API_KEY is not set. Add it to .env.local (mh_test_… for devnet, mh_live_… for mainnet).',
        },
      },
      { status: 500 },
    )
  }

  const target = `${multiHopperBase(request.nextUrl.searchParams.get('network'))}/${path.join('/')}`
  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  }

  const init: RequestInit = { method: request.method, headers }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text()
    if (body) init.body = body
  }

  const response = await fetch(target, init)
  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  return proxy(request, path)
}
