// Backend API configuration
// Set NEXT_PUBLIC_API_BASE_URL to your Linode server URL (e.g., http://172.105.50.83:8000 or https://your-domain.com)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// WebSocket URL - typically same base as API but with ws:// or wss:// protocol
// If not explicitly set, convert HTTP/HTTPS to WS/WSS automatically
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (API_BASE_URL ? API_BASE_URL.replace(/^https?:/, (match) => (match === "https:" ? "wss:" : "ws:")) : "ws://localhost:8000")

if (!API_BASE_URL) {
  console.error("❌ API configuration missing. Set NEXT_PUBLIC_API_BASE_URL in .env.local")
}

export class ApiClient {
  private readonly baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL || "http://localhost:8000"
    console.log(`[API Client] Initialized with base URL: ${this.baseURL}`)
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      console.warn(`[API Client] ⚠️ No NEXT_PUBLIC_API_BASE_URL configured, using default: ${this.baseURL}`)
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    console.log(`[API Client] Making request to: ${url}`)
    console.log(`[API Client] Base URL: ${this.baseURL}`)
    console.log(`[API Client] Environment variable: ${process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET"}`)

    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
    } catch (error) {
      // Network error - fetch failed before getting a response
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[API Client] Network error when fetching ${url}:`, errorMessage)
      console.error(`[API Client] Full error:`, error)
      
      // Provide detailed diagnostic information
      const diagnostics = [
        `❌ Network Error: Failed to fetch from ${url}`,
        `📋 Diagnostics:`,
        `   1. Check if backend is running on: ${this.baseURL}`,
        `   2. Check if ${this.baseURL} is accessible from your browser`,
        `   3. Verify CORS is configured on backend to allow: ${typeof window !== 'undefined' ? window.location.origin : 'your frontend URL'}`,
        `   4. Check Linode firewall settings - port must be open`,
        `   5. If using HTTP (not HTTPS), verify the backend URL is correct`,
        `   6. Environment variable NEXT_PUBLIC_API_BASE_URL: ${process.env.NEXT_PUBLIC_API_BASE_URL || "NOT CONFIGURED"}`,
        ``,
        `💡 Try:`,
        `   - Open ${this.baseURL}/health in your browser to test connectivity`,
        `   - Check backend logs on Linode server`,
        `   - Verify firewall allows connections on the backend port`,
      ]
      
      console.error(diagnostics.join('\n'))
      
      throw new Error(
        `Network Error: Failed to connect to ${url}\n\n` +
        `Possible causes:\n` +
        `1. Backend server is not running on ${this.baseURL}\n` +
        `2. CORS not configured (backend must allow requests from ${typeof window !== 'undefined' ? window.location.origin : 'your frontend'})\n` +
        `3. Firewall blocking connection (check Linode firewall settings)\n` +
        `4. Wrong URL configured (current: ${this.baseURL})\n\n` +
        `Environment variable: ${process.env.NEXT_PUBLIC_API_BASE_URL || "NOT SET"}\n` +
        `Test URL: ${this.baseURL}/health`
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (response.status === 204 || response.status === 205) {
      return undefined as T
    }

    if (!response.ok) {
      const bodyText = await response.text()
      let detail = bodyText
      try {
        const parsed = JSON.parse(bodyText)
        if (parsed && typeof parsed === "object" && "message" in parsed) {
          detail = String(parsed.message)
        }
      } catch {
        // ignore parse error, keep raw text
      }

      const formattedDetail = detail ? ` - ${detail.slice(0, 500)}` : ""
      throw new Error(`API Error: ${response.status} ${response.statusText}${formattedDetail}`)
    }

    // for ok responses we may have consumed body if !ok? but we already return above before.
    // Need to restore text: for ok we haven't read.

    if (contentType.includes("application/json")) {
      const jsonData = await response.json()
      console.log(`[API Client] ${endpoint} - Raw JSON response:`, jsonData)
      console.log(`[API Client] ${endpoint} - Response type:`, typeof jsonData)
      console.log(`[API Client] ${endpoint} - Response keys:`, typeof jsonData === "object" && jsonData !== null ? Object.keys(jsonData) : "N/A")
      return jsonData as T
    }

    const text = await response.text()
    console.log(`[API Client] ${endpoint} - Raw text response (first 500 chars):`, text.slice(0, 500))
    
    // Check if response is HTML (404 page, server error page, etc.)
    if (text.trim().toLowerCase().startsWith("<!doctype html") || text.includes("<html")) {
      console.error(`[API Client] ${endpoint} - Received HTML response instead of JSON!`)
      console.error(`[API Client] ${endpoint} - Full URL was: ${url}`)
      console.error(`[API Client] ${endpoint} - This usually means: 1) Endpoint doesn't exist (404), 2) Backend server is down, or 3) Server error`)
      throw new Error(`API returned HTML error page for ${endpoint} at ${url}. Check if endpoint exists and backend server is running.`)
    }

    try {
      const parsed = JSON.parse(text)
      console.log(`[API Client] ${endpoint} - Parsed JSON:`, parsed)
      return parsed as T
    } catch {
      console.warn(`[API Client] ${endpoint} - Failed to parse as JSON, returning as text`)
      return text as unknown as T
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { 
      method: "GET",
      cache: "no-store", // Prevent caching
    })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient()

export const connectWebSocket = (
  endpoint: string,
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void,
): WebSocket => {
  const wsURL = `${WS_URL ?? ""}${endpoint}`
  const ws = new WebSocket(wsURL)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data?.type !== "ping") {
        onMessage(data)
      }
    } catch (error) {
      console.error("WebSocket parse error:", error)
    }
  }

  ws.onerror = (error) => {
    console.error("WebSocket error:", error)
    onError?.(error)
  }

  ws.onopen = () => {
    console.log("✅ WebSocket connected")
  }

  ws.onclose = () => {
    console.log("WebSocket disconnected")
  }

  return ws
}

export { API_BASE_URL, WS_URL }

