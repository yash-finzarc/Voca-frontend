import { NextRequest, NextResponse } from 'next/server'

// Get backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE')
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Reconstruct the backend path
    const path = params.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    // Ensure proper URL construction (BACKEND_URL/path)
    const baseUrl = BACKEND_URL.replace(/\/$/, '') // Remove trailing slash
    const backendUrl = `${baseUrl}/${path}${searchParams ? `?${searchParams}` : ''}`

    console.log(`[API Proxy] ${method} ${backendUrl}`)

    // Get request body if present
    let body: string | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text()
      } catch {
        // No body
      }
    }

    // Forward request to backend
    const response = await fetch(backendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward any custom headers (except host)
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => !['host', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      body: body || undefined,
    })

    // Get response body
    const contentType = response.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    let responseBody: any

    if (isJSON) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }

    // Return response with CORS headers
    // Use NextResponse.json for JSON, NextResponse for other types
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': contentType || 'application/json',
    }

    if (isJSON) {
      return NextResponse.json(responseBody, {
        status: response.status,
        headers,
      })
    } else {
      return new NextResponse(responseBody, {
        status: response.status,
        headers,
      })
    }
  } catch (error) {
    console.error('[API Proxy] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Proxy error', message: errorMessage },
      { status: 500 }
    )
  }
}

