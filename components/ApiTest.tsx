"use client"

import { useEffect, useState } from "react"

import { apiClient } from "@/lib/api-client"
import { twilioApi } from "@/lib/api-services"

type ApiHealth = {
  status?: string
  [key: string]: unknown
}

export default function ApiTest() {
  const [status, setStatus] = useState<string>("Testing...")
  const [backendUrl, setBackendUrl] = useState<string>("")

  useEffect(() => {
    async function testConnection() {
      try {
        const health = await apiClient.get<ApiHealth>("/health")
        setStatus(`✅ API Connected: ${JSON.stringify(health)}`)

        // Get backend URL from API client
        setBackendUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "Not configured")

        const twilioConfig = await twilioApi.checkConfigured()
        console.log("Twilio configured:", twilioConfig)
      } catch (error) {
        setStatus(`❌ Connection Failed: ${String(error)}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="rounded border p-4">
      <h2 className="mb-2 text-xl font-bold">API Connection Test</h2>
      <p>{status}</p>
      {backendUrl && <p className="mt-2 text-sm text-gray-600">Backend URL: {backendUrl}</p>}
    </div>
  )
}

