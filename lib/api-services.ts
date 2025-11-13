import { apiClient } from "./api-client"

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

export const ngrokApi = {
  start: () => apiClient.post("/api/ngrok/start"),
  stop: () => apiClient.post("/api/ngrok/stop"),
  getStatus: () => apiClient.get("/api/ngrok/status"),
  setUrl: (url: string) => apiClient.post("/api/ngrok/set-url", { url }),
}

export const logsApi = {
  getLogs: (limit: number = 100) => apiClient.get(`/api/logs?limit=${limit}`),
}

// Health check to verify backend connection
export const healthApi = {
  check: () => apiClient.get("/health"),
  checkRoot: () => apiClient.get("/"),
}

