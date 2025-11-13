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
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

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
      return response.json() as Promise<T>
    }

    const text = await response.text()

    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
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

