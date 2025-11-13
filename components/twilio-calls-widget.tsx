"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const countries = [
  { code: "+1", name: "United States" },
  { code: "+44", name: "United Kingdom" },
  { code: "+91", name: "India" },
  { code: "+86", name: "China" },
  { code: "+81", name: "Japan" },
]

interface TwilioCallsWidgetProps {
  addLog: (message: string) => void
  addCallStatus: (status: string) => void
  callStatus: string[]
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function TwilioCallsWidget({
  addLog,
  addCallStatus,
  callStatus,
  setIsLoading,
  isLoading,
}: TwilioCallsWidgetProps) {
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
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Twilio Calls</CardTitle>
        <CardDescription>Manage phone calls via Twilio</CardDescription>
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
              Will call: <span className="font-mono">{displayNumber}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button onClick={handleStartServer} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
            Start Twilio Server
          </Button>
          <Button
            onClick={handleMakeCall}
            disabled={isLoading || !phoneNumber}
            className="bg-blue-600 hover:bg-blue-700 text-white"
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

        <div className="mt-4 h-36 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50 font-mono text-xs text-gray-700 space-y-1">
          {callStatus.length === 0 ? (
            <p className="text-gray-500">No active calls</p>
          ) : (
            callStatus.map((status, idx) => <div key={idx}>{status}</div>)
          )}
        </div>
      </CardContent>
    </Card>
  )
}
