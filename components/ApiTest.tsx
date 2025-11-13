"use client"

import { useEffect, useState } from "react"

import { apiClient } from "@/lib/api-client"
import { ngrokApi, twilioApi } from "@/lib/api-services"

type ApiHealth = {
  status?: string
  [key: string]: unknown
}

export default function ApiTest() {
  const [status, setStatus] = useState<string>("Testing...")
  const [ngrokUrl, setNgrokUrl] = useState<string>("")

  useEffect(() => {
    async function testConnection() {
      try {
        const health = await apiClient.get<ApiHealth>("/health")
        setStatus(`✅ API Connected: ${JSON.stringify(health)}`)

        const ngrokStatus = await ngrokApi.getStatus()
        if (ngrokStatus?.running && ngrokStatus?.url) {
          setNgrokUrl(ngrokStatus.url as string)
        }

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
      {ngrokUrl && <p className="mt-2 text-green-600">Ngrok URL: {ngrokUrl}</p>}
    </div>
  )
}

