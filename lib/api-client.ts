const API_MODE = process.env.NEXT_PUBLIC_API_MODE || "local"

const API_BASE_URL =
  API_MODE === "ngrok"
    ? process.env.NEXT_PUBLIC_API_BASE_URL_NGROK
    : process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL

const WS_URL =
  API_MODE === "ngrok" ? process.env.NEXT_PUBLIC_WS_URL_NGROK : process.env.NEXT_PUBLIC_WS_URL_LOCAL

if (!API_BASE_URL || !WS_URL) {
  console.error("❌ API configuration missing. Check .env file")
}

export class ApiClient {
  private readonly baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL || "http://localhost:8000"
    console.log(`[API Client] Initialized with base URL: ${this.baseURL}`)
    console.log(`[API Client] API Mode: ${API_MODE}`)
    if (!API_BASE_URL) {
      console.warn(`[API Client] ⚠️ No API_BASE_URL configured, using default: ${this.baseURL}`)
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    console.log(`[API Client] Making request to: ${url}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

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
    
    // Check if response is HTML (ngrok error, 404 page, etc.)
    if (text.trim().toLowerCase().startsWith("<!doctype html") || text.includes("<html")) {
      console.error(`[API Client] ${endpoint} - Received HTML response instead of JSON!`)
      console.error(`[API Client] ${endpoint} - Full URL was: ${url}`)
      console.error(`[API Client] ${endpoint} - This usually means: 1) Endpoint doesn't exist (404), 2) ngrok tunnel is down, or 3) Server error`)
      throw new Error(`API returned HTML error page for ${endpoint} at ${url}. Check if endpoint exists and ngrok tunnel is active.`)
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

