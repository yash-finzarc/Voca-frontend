"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function LocalVoicePage() {
  const [isActive, setIsActive] = useState(false)
  const [logs, setLogs] = useState<string[]>(["[INFO] Local voice system initialized"])

  const handleStartContinuous = () => {
    setIsActive(true)
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Loading STT...`])
    setTimeout(() => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Loading TTS...`])
    }, 500)
    setTimeout(() => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Models ready.`])
    }, 1000)
    setTimeout(() => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] VAD loop started. Speak to interact.`])
    }, 1500)
  }

  const handleStop = () => {
    setIsActive(false)
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] VAD loop stopped.`])
  }

  const handleOneMinuteTest = () => {
    setIsActive(true)
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] One minute test started.`])
    setTimeout(() => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Loading STT...`])
    }, 300)
    setTimeout(() => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Models ready.`])
    }, 800)
    setTimeout(() => {
      setIsActive(false)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Test completed.`])
    }, 60000)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Local Voice</h1>
        <p className="text-gray-600 mt-2">Manage local voice processing and testing</p>
      </div>

      {/* Voice Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Controls</CardTitle>
          <CardDescription>Manage local voice processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleStartContinuous}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
            >
              Start Continuous Call
            </Button>
            <Button
              onClick={handleStop}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg"
            >
              Stop
            </Button>
            <Button
              onClick={handleOneMinuteTest}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg"
            >
              One Minute Test
            </Button>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <p className="text-sm text-gray-600">Status:</p>
            <span className={`text-sm font-semibold ${isActive ? "text-green-600" : "text-gray-600"}`}>
              {isActive ? "Running" : "Ready"}
            </span>
            {isActive && <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>Voice activity and system logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-400">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
