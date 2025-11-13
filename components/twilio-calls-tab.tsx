"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const countries = [
  { code: "+1", name: "United States" },
  { code: "+44", name: "United Kingdom" },
  { code: "+91", name: "India" },
  { code: "+86", name: "China" },
  { code: "+81", name: "Japan" },
]

const chartData = [
  { time: "00:00", calls: 12, duration: 240 },
  { time: "04:00", calls: 8, duration: 160 },
  { time: "08:00", calls: 24, duration: 480 },
  { time: "12:00", calls: 31, duration: 620 },
  { time: "16:00", calls: 28, duration: 560 },
  { time: "20:00", calls: 35, duration: 700 },
]

interface TwilioCallsTabProps {
  addLog: (message: string) => void
  addCallStatus: (status: string) => void
  callStatus: string[]
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function TwilioCallsTab({
  addLog,
  addCallStatus,
  callStatus,
  setIsLoading,
  isLoading,
}: TwilioCallsTabProps) {
  const [selectedCountry, setSelectedCountry] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isCallActive, setIsCallActive] = useState(false)

  const displayNumber = phoneNumber ? `${selectedCountry}${phoneNumber}` : ""

  const handleStartServer = () => {
    setIsLoading(true)
    addLog("Starting Twilio Server...")
    setTimeout(() => {
      addLog("Twilio Server started")
      setIsLoading(false)
    }, 1000)
  }

  const handleMakeCall = () => {
    if (!phoneNumber) {
      addLog("[ERROR] Phone number is required")
      return
    }
    setIsLoading(true)
    const callId = `SID_${Date.now()}`
    addLog(`Making call to ${displayNumber}`)
    addCallStatus(`[${callId}] INITIATED → ${displayNumber}`)
    setIsCallActive(true)
    setTimeout(() => {
      addCallStatus(`[${callId}] RINGING → ${displayNumber}`)
      addLog(`Call ringing to ${displayNumber}`)
      setIsLoading(false)
    }, 500)
  }

  const handleHangUpAll = () => {
    if (isCallActive) {
      setIsLoading(true)
      addLog("Hanging up all calls")
      addCallStatus("All calls terminated")
      setIsCallActive(false)
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  const handleRefreshStatus = () => {
    setIsLoading(true)
    addLog("Refreshing Twilio status...")
    setTimeout(() => {
      addLog("Status refreshed")
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Call Configuration</CardTitle>
          <CardDescription>Set up and manage Twilio calls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div>
                <Label className="text-sm font-medium text-gray-700">Country</Label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full sm:w-48 mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Phone</Label>
                <Input
                  type="tel"
                  placeholder="5854604655"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full sm:w-48 mt-1"
                />
              </div>
            </div>

            {displayNumber && (
              <p className="text-sm text-gray-600">
                Will call: <span className="font-mono font-semibold">{displayNumber}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              onClick={handleStartServer}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Twilio Server
            </Button>
            <Button
              onClick={handleMakeCall}
              disabled={isLoading || !phoneNumber}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Make Call
            </Button>
            <Button
              onClick={handleHangUpAll}
              disabled={isLoading || !isCallActive}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Hang Up All
            </Button>
            <Button
              onClick={handleRefreshStatus}
              disabled={isLoading}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Active Calls</CardTitle>
          <CardDescription>Current call status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50 font-mono text-xs text-gray-700 space-y-1">
            {callStatus.length === 0 ? (
              <p className="text-gray-500">No active calls</p>
            ) : (
              callStatus.map((status, idx) => <div key={idx}>{status}</div>)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Graph */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Call Analytics</CardTitle>
          <CardDescription>Calls made and total duration by time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
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
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
              <Line type="monotone" dataKey="duration" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Calls</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">138</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Connected</p>
              <p className="text-3xl font-bold text-green-600 mt-2">134</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Duration</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">2.7hrs</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
