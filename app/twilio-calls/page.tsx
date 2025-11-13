"use client"

import { useCallback, useEffect, useState } from "react"

import { twilioApi } from "@/lib/api-services"

type Country = { name: string; code: string }
type TwilioCall = { sid: string; to: string; status: string }
type TwilioStatusResponse = {
  active_calls?: Array<Record<string, unknown>>
  call_count?: number
  running?: boolean
  message?: string
  [key: string]: unknown
}
type PendingAction = "start" | "call" | "hangup" | "refresh" | null

const defaultCountries: Country[] = [
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
  const [countries, setCountries] = useState<Country[]>(defaultCountries)
  const [selectedCountry, setSelectedCountry] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [activeCalls, setActiveCalls] = useState<TwilioCall[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [callCount, setCallCount] = useState(0)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message])
  }, [])

  const refreshStatus = useCallback(async () => {
    const status = (await twilioApi.getStatus()) as TwilioStatusResponse
    let mappedCalls: TwilioCall[] = []
    if (Array.isArray(status?.active_calls)) {
      mappedCalls = status.active_calls
        .map((call) => {
          if (!call) return null
          const sid = String(
            (call.sid as string | undefined) ??
              (call.call_sid as string | undefined) ??
              "unknown",
          )
          const to = String(
            (call.to as string | undefined) ??
              (call.to_number as string | undefined) ??
              (call.to_formatted as string | undefined) ??
              "unknown",
          )
          const statusText = String(
            (call.status as string | undefined) ??
              (call.state as string | undefined) ??
              "unknown",
          )
          return { sid, to, status: statusText }
        })
        .filter(Boolean) as TwilioCall[]
      setActiveCalls(mappedCalls)
    } else {
      setActiveCalls([])
    }

    if (typeof status?.call_count === "number") {
      setCallCount(status.call_count)
    } else if (mappedCalls.length) {
      setCallCount(mappedCalls.length)
    }

    return status
  }, [])

  const handleStartServer = useCallback(async () => {
    setPendingAction("start")
    addLog("Starting Twilio server...")
    try {
      const response = await twilioApi.startServer()
      if (response && typeof response === "object" && "message" in response) {
        addLog(String(response.message))
      } else {
        addLog("✅ Twilio server started")
      }
      await refreshStatus()
    } catch (error) {
      console.error("Failed to start Twilio server", error)
      addLog(`❌ Failed to start server: ${String(error)}`)
    } finally {
      setPendingAction(null)
    }
  }, [addLog, refreshStatus])

  const handleMakeCall = useCallback(async () => {
    if (!phoneNumber) {
      addLog("Please enter a phone number before making a call.")
      return
    }

    const country = countries[selectedCountry]
    if (!country) {
      addLog("Invalid country selection.")
      return
    }

    const fullNumber = `${country.code}${phoneNumber}`

    setPendingAction("call")
    addLog(`Initiating call to ${fullNumber}...`)
    try {
      const result = await twilioApi.makeCall(fullNumber)
      if (result && typeof result === "object" && "message" in result) {
        addLog(String(result.message))
      } else {
        addLog(`✅ Call initiated to ${fullNumber}`)
      }
      await refreshStatus()
    } catch (error) {
      console.error("Failed to make call", error)
      addLog(`❌ Call failed: ${String(error)}`)
    } finally {
      setPendingAction(null)
    }
  }, [addLog, countries, phoneNumber, refreshStatus, selectedCountry])

  const handleHangUpAll = useCallback(async () => {
    if (activeCalls.length === 0) {
      addLog("No active calls to hang up.")
      return
    }

    setPendingAction("hangup")
    addLog("Requesting hangup for all active calls...")
    try {
      const response = await twilioApi.hangupAll()
      if (response && typeof response === "object" && "message" in response) {
        addLog(String(response.message))
      } else {
        addLog("✅ Hangup request sent")
      }
      await refreshStatus()
    } catch (error) {
      console.error("Failed to hang up calls", error)
      addLog(`❌ Failed to hang up calls: ${String(error)}`)
    } finally {
      setPendingAction(null)
    }
  }, [activeCalls.length, addLog, refreshStatus])

  const handleRefreshStatus = useCallback(async () => {
    setPendingAction("refresh")
    try {
      await refreshStatus()
      addLog("Status refreshed")
    } catch (error) {
      console.error("Failed to refresh status", error)
      addLog(`❌ Failed to refresh status: ${String(error)}`)
    } finally {
      setPendingAction(null)
    }
  }, [addLog, refreshStatus])

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const config = await twilioApi.checkConfigured()
        if (!isMounted) return
        const configured =
          typeof config === "object" && config && "configured" in config
            ? Boolean((config as Record<string, unknown>).configured)
            : config
        addLog(`Twilio configured: ${configured ? "Yes" : "No"}`)
      } catch (error) {
        if (!isMounted) return
        addLog(`Failed to verify Twilio configuration: ${String(error)}`)
      }

      try {
        const codes = await twilioApi.getCountryCodes()
        if (!isMounted) return
        if (Array.isArray(codes) && codes.length > 0) {
          const mapped = codes
            .map((item) => {
              if (!item || typeof item !== "object") return null
              const name = "name" in item && typeof item.name === "string" ? item.name : null
              const code = "code" in item && typeof item.code === "string" ? item.code : null
              return name && code ? { name, code } : null
            })
            .filter(Boolean) as Country[]
          if (mapped.length > 0) {
            setCountries(mapped)
            setSelectedCountry(0)
            addLog("Loaded country codes from API")
          }
        }
      } catch (error) {
        if (!isMounted) return
        addLog(`Using default country list (fetch failed: ${String(error)})`)
      }

      try {
        await refreshStatus()
      } catch (error) {
        if (!isMounted) return
        addLog(`Unable to load Twilio status: ${String(error)}`)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [addLog, refreshStatus])

  const selectedCountryData = countries[selectedCountry]
  const fullNumberDisplay =
    selectedCountryData && phoneNumber ? `${selectedCountryData.code} ${phoneNumber}` : null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Twilio Calls</h1>
          <p className="mt-1 text-gray-600">Manage your Twilio voice calls</p>
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Phone Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Country:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {countries.map((country, idx) => (
                    <option key={`${country.code}-${idx}`} value={idx}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone Number (without country code):
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="5854604655"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {fullNumberDisplay && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-600">Full Phone Number:</p>
                <p className="text-lg font-semibold text-blue-600">{fullNumberDisplay}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handleStartServer}
              disabled={pendingAction !== null}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Start Twilio Server
            </button>
            <button
              onClick={handleMakeCall}
              disabled={pendingAction !== null || !phoneNumber}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              Make Call
            </button>
            <button
              onClick={handleHangUpAll}
              disabled={pendingAction !== null || activeCalls.length === 0}
              className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              Hang Up All
            </button>
            <button
              onClick={handleRefreshStatus}
              disabled={pendingAction !== null}
              className="rounded-lg bg-gray-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Refresh Status
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Call Status</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="font-medium">
              Active calls: {activeCalls.length} {callCount ? `| Total calls placed: ${callCount}` : ""}
            </div>
            {activeCalls.length > 0 ? (
              activeCalls.map((call, idx) => (
                <div
                  key={`${call.sid}-${idx}`}
                  className="space-y-1 rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs"
                >
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

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Logs</h2>
          <p className="mb-4 text-sm text-gray-600">Call activity and system logs</p>
          <div className="h-80 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-700">
            {logs.length === 0 ? (
              <div className="text-gray-400">[INFO] Waiting for activity...</div>
            ) : (
              logs.map((log, idx) => (
                <div key={`${log}-${idx}`} className="text-blue-600">
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
