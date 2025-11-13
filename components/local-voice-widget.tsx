"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface LocalVoiceWidgetProps {
  addLog: (message: string) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function LocalVoiceWidget({ addLog, setIsLoading, isLoading }: LocalVoiceWidgetProps) {
  const [isRunning, setIsRunning] = useState(false)

  const handleStartContinuous = () => {
    setIsLoading(true)
    setIsRunning(true)
    addLog("Started continuous call")
    setTimeout(() => setIsLoading(false), 500)
  }

  const handleStop = () => {
    setIsLoading(true)
    setIsRunning(false)
    addLog("Stopped call")
    setTimeout(() => setIsLoading(false), 500)
  }

  const handleOneMinuteTest = () => {
    setIsLoading(true)
    addLog("Started one-minute test call")
    addLog("Call connected")
    setTimeout(() => {
      addLog("Test call completed")
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Local Voice</CardTitle>
        <CardDescription>Test voice processing locally</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleStartContinuous}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Start Continuous Call
          </Button>
          <Button
            onClick={handleStop}
            disabled={isLoading || !isRunning}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Stop
          </Button>
          <Button
            onClick={handleOneMinuteTest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            One Minute Test
          </Button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100">
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold">{isRunning ? "Running..." : "Ready"}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
