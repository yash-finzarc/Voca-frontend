import { NextRequest, NextResponse } from 'next/server'

// Get backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8000'

// Helper to resolve params (handles both Promise and direct params)
async function resolveParams(
  params: Promise<{ path: string[] }> | { path: string[] }
): Promise<{ path: string[] }> {
  if (params instanceof Promise) {
    return await params
  }
  return params
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await resolveParams(context.params)
    return handleRequest(request, resolvedParams, 'GET')
  } catch (error) {
    console.error('[API Proxy GET] Error resolving params:', error)
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await resolveParams(context.params)
    return handleRequest(request, resolvedParams, 'POST')
  } catch (error) {
    console.error('[API Proxy POST] Error resolving params:', error)
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await resolveParams(context.params)
    return handleRequest(request, resolvedParams, 'PUT')
  } catch (error) {
    console.error('[API Proxy PUT] Error resolving params:', error)
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await resolveParams(context.params)
    return handleRequest(request, resolvedParams, 'DELETE')
  } catch (error) {
    console.error('[API Proxy DELETE] Error resolving params:', error)
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    )
  }
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
    // Log params for debugging
    console.log('[API Proxy] Received params:', JSON.stringify(params))
    console.log('[API Proxy] Request URL:', request.url)
    
    // Extract path from params or fallback to URL parsing
    let path: string = ''
    
    if (params && params.path && Array.isArray(params.path) && params.path.length > 0) {
      // Use params if available
      path = params.path.join('/')
      console.log('[API Proxy] Using params.path:', path)
    } else {
      // Fallback: extract path from URL
      // URL format: https://domain.com/api/proxy/api/system-prompt
      // We need to extract everything after /api/proxy/
      const url = new URL(request.url)
      const pathname = url.pathname
      const proxyPrefix = '/api/proxy'
      
      if (pathname.startsWith(proxyPrefix)) {
        path = pathname.slice(proxyPrefix.length + 1) // +1 to remove leading /
        console.log('[API Proxy] Extracted path from URL:', path)
      } else {
        console.error('[API Proxy] Could not extract path from URL:', pathname)
        return NextResponse.json(
          { error: 'Invalid request path', details: 'Could not determine backend path' },
          { status: 400 }
        )
      }
    }
    const searchParams = request.nextUrl.searchParams.toString()
    // Ensure proper URL construction (BACKEND_URL/path)
    const baseUrl = BACKEND_URL.replace(/\/$/, '') // Remove trailing slash
    const backendUrl = path 
      ? `${baseUrl}/${path}${searchParams ? `?${searchParams}` : ''}`
      : `${baseUrl}${searchParams ? `?${searchParams}` : ''}`

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

