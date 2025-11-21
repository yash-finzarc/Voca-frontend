import { apiClient } from "./api-client"

const buildQueryString = (params: Record<string, string | number | boolean | undefined | null>) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

export const localVoiceApi = {
  startContinuous: () => apiClient.post("/api/local-voice/start-continuous"),
  stopContinuous: () => apiClient.post("/api/local-voice/stop-continuous"),
  oneMinuteTest: () => apiClient.post("/api/local-voice/one-minute-test"),
  getStatus: () => apiClient.get("/api/local-voice/status"),
}

export const twilioApi = {
  getCountryCodes: () => apiClient.get("/api/twilio/country-codes"),
  checkConfigured: () => apiClient.get("/api/twilio/configured"),
  startServer: () => apiClient.post("/api/twilio/start-server"),
  makeCall: (phoneNumber: string) =>
    apiClient.post("/api/twilio/make-call", { phone_number: phoneNumber }),
  hangupAll: () => apiClient.post("/api/twilio/hangup-all"),
  getStatus: () => apiClient.get("/api/twilio/status"),
  getCallStatus: () => apiClient.get("/api/twilio/call-status"),
  getCallStatusSummary: (limit: number = 15) => apiClient.get(`/api/twilio/call-status/summary?limit=${limit}`),
}

// ngrok API removed - using Linode server instead
// If you need ngrok functionality, you can re-add these endpoints
// export const ngrokApi = {
//   start: () => apiClient.post("/api/ngrok/start"),
//   stop: () => apiClient.post("/api/ngrok/stop"),
//   getStatus: () => apiClient.get("/api/ngrok/status"),
//   setUrl: (url: string) => apiClient.post("/api/ngrok/set-url", { url }),
// }

export const logsApi = {
  getLogs: (limit: number = 100) => apiClient.get(`/api/logs?limit=${limit}`),
}

// Health check to verify backend connection
export const healthApi = {
  check: () => apiClient.get("/health"),
  checkRoot: () => apiClient.get("/"),
}

type SystemPromptPayload = {
  name?: string
  prompt: string
  welcome_message?: string
  is_active?: boolean
}

// System Prompt APIs (Multi-tenant, organization_id is optional)
// Note: If /list endpoint doesn't exist, use getActive() instead
export const systemPromptApi = {
  list: (organizationId?: string) => {
    // Try /list endpoint, but it may not exist on all backends
    const endpoint = `/api/system-prompt/list${buildQueryString({
      organization_id: organizationId,
    })}`
    return apiClient.get(endpoint)
  },
  getActive: (organizationId?: string) =>
    apiClient.get(
      `/api/system-prompt${buildQueryString({
        organization_id: organizationId,
      })}`,
    ),
  getById: (promptId: string, organizationId?: string) =>
    apiClient.get(
      `/api/system-prompt/${promptId}${buildQueryString({
        organization_id: organizationId,
      })}`,
    ),
  create: async (payload: SystemPromptPayload, organizationId?: string) => {
    const requestBody: Record<string, unknown> = {
      ...payload,
    }
    // Only include organization_id if provided
    if (organizationId && organizationId.trim() !== "") {
      requestBody.organization_id = organizationId
    }
    console.log("[systemPromptApi.create] Request body:", requestBody)
    const result = await apiClient.post("/api/system-prompt", requestBody)
    console.log("[systemPromptApi.create] Response:", result)
    return result
  },
  update: (promptId: string, payload: SystemPromptPayload, organizationId?: string) => {
    const requestBody: Record<string, unknown> = {
      ...payload,
    }
    // Only include organization_id if provided
    if (organizationId && organizationId.trim() !== "") {
      requestBody.organization_id = organizationId
    }
    return apiClient.put(`/api/system-prompt/${promptId}`, requestBody)
  },
  activate: (promptId: string, organizationId?: string) => {
    const requestBody: Record<string, unknown> = {}
    // Only include organization_id if provided
    if (organizationId && organizationId.trim() !== "") {
      requestBody.organization_id = organizationId
    }
    return apiClient.post(`/api/system-prompt/${promptId}/activate`, requestBody)
  },
  reset: (organizationId?: string) => {
    const requestBody: Record<string, unknown> = {}
    // Only include organization_id if provided
    if (organizationId && organizationId.trim() !== "") {
      requestBody.organization_id = organizationId
    }
    return apiClient.post("/api/system-prompt/reset", requestBody)
  },
  updateWelcomeMessage: (welcomeMessage: string, organizationId?: string) => {
    const requestBody: Record<string, unknown> = {
      welcome_message: welcomeMessage,
    }
    // Only include organization_id if provided
    if (organizationId && organizationId.trim() !== "") {
      requestBody.organization_id = organizationId
    }
    // Use PUT method to update welcome message via dedicated endpoint
    return apiClient.put("/api/system-prompt/welcome-message", requestBody)
  },
}

// Conversation APIs
export const conversationsApi = {
  list: (organizationId: string, limit?: number) =>
    apiClient.get(
      `/api/conversations${buildQueryString({
        organization_id: organizationId,
        limit,
      })}`,
    ),
  get: (organizationId: string, conversationId: string) =>
    apiClient.get(
      `/api/conversations/${conversationId}${buildQueryString({
        organization_id: organizationId,
      })}`,
    ),
}

