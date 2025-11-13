"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface LocalVoiceTabProps {
  addLog: (message: string) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

const chartData = [
  { time: "00:00", successful: 45, failed: 5, duration: 120 },
  { time: "04:00", successful: 52, failed: 8, duration: 145 },
  { time: "08:00", successful: 48, failed: 4, duration: 135 },
  { time: "12:00", successful: 61, failed: 9, duration: 155 },
  { time: "16:00", successful: 55, failed: 6, duration: 140 },
  { time: "20:00", successful: 67, failed: 7, duration: 165 },
]

export default function LocalVoiceTab({ addLog, setIsLoading, isLoading }: LocalVoiceTabProps) {
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
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Voice Controls</CardTitle>
          <CardDescription>Manage local voice processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              One Minute Test
            </Button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100">
            <p className="text-sm text-gray-600">
              Status: <span className="font-semibold text-blue-600">{isRunning ? "Running..." : "Ready"}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Graph */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Call Analytics</CardTitle>
          <CardDescription>Successful and failed calls by time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="successful" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Calls</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">328</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Success Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">98.5%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Avg Duration</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">145s</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
