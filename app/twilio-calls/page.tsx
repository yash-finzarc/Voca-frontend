"use client"

import { useState } from "react"

const countries = [
  { name: "United States", code: "+1" },
  { name: "Canada", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "Australia", code: "+61" },
  { name: "India", code: "+91" },
  { name: "Germany", code: "+49" },
  { name: "France", code: "+33" },
  { name: "Italy", code: "+39" },
  { name: "Spain", code: "+34" },
  { name: "Netherlands", code: "+31" },
  { name: "Belgium", code: "+32" },
  { name: "Switzerland", code: "+41" },
  { name: "Austria", code: "+43" },
  { name: "Sweden", code: "+46" },
  { name: "Norway", code: "+47" },
  { name: "Denmark", code: "+45" },
  { name: "Finland", code: "+358" },
  { name: "Poland", code: "+48" },
  { name: "Czech Republic", code: "+420" },
  { name: "Greece", code: "+30" },
  { name: "Portugal", code: "+351" },
  { name: "Ireland", code: "+353" },
  { name: "Japan", code: "+81" },
  { name: "South Korea", code: "+82" },
  { name: "China", code: "+86" },
  { name: "Singapore", code: "+65" },
  { name: "Malaysia", code: "+60" },
  { name: "Thailand", code: "+66" },
  { name: "Philippines", code: "+63" },
  { name: "Indonesia", code: "+62" },
  { name: "Vietnam", code: "+84" },
  { name: "Brazil", code: "+55" },
  { name: "Mexico", code: "+52" },
  { name: "Argentina", code: "+54" },
  { name: "South Africa", code: "+27" },
  { name: "Russia", code: "+7" },
  { name: "United Arab Emirates", code: "+971" },
]

export default function TwilioCallsPage() {
  const [selectedCountry, setSelectedCountry] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [activeCalls, setActiveCalls] = useState<Array<{ sid: string; to: string; status: string }>>([])
  const [logs, setLogs] = useState<string[]>([])
  const [callCount, setCallCount] = useState(0)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  const handleStartServer = () => {
    addLog("Loading STT...")
    addLog("Loading TTS...")
    addLog("Models ready.")
    setTimeout(() => {
      addLog("Twilio server started successfully")
    }, 500)
  }

  const handleMakeCall = () => {
    if (phoneNumber) {
      const callSid = `CA${Math.random().toString(16).substring(2, 23)}`
      setActiveCalls([{ sid: callSid, to: phoneNumber, status: "initiated" }])
      addLog(`Call initiated to ${phoneNumber}, SID: ${callSid}`)
      setCallCount((prev) => prev + 1)
    }
  }

  const handleHangUpAll = () => {
    if (activeCalls.length > 0) {
      addLog(`Hanging up all calls...`)
      setActiveCalls([])
    }
  }

  const handleRefreshStatus = () => {
    addLog("Status refreshed")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Twilio Calls</h1>
          <p className="text-gray-600 mt-1">Manage your Twilio voice calls</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Phone Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {countries.map((country, idx) => (
                    <option key={idx} value={idx}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (without country code):
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="5854604655"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {phoneNumber && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Full Phone Number:</p>
                <p className="text-lg font-semibold text-blue-600">
                  {countries[selectedCountry].code} {phoneNumber}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleStartServer}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Start Twilio Server
            </button>
            <button
              onClick={handleMakeCall}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Make Call
            </button>
            <button
              onClick={handleHangUpAll}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Hang Up All
            </button>
            <button
              onClick={handleRefreshStatus}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Status</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <div className="font-medium">Active calls: {activeCalls.length}</div>
            {activeCalls.length > 0 ? (
              activeCalls.map((call, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200 text-xs space-y-1 font-mono">
                  <div>Call SID: {call.sid}</div>
                  <div>Status: {call.status}</div>
                  <div>To: {call.to}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400">No active calls</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Logs</h2>
          <p className="text-sm text-gray-600 mb-4">Call activity and system logs</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs text-gray-700 space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-400">[INFO] Waiting for activity...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="text-blue-600">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
