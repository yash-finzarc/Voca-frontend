"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { twilioApi, healthApi } from "@/lib/api-services"

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

type CallRecord = {
  call_sid: string
  status: string
  to_number?: string
  from_number?: string
  start_time?: string
  duration_human?: string
  duration_seconds?: number
  direction?: string
}

type CallStatusSummary = {
  ongoing: CallRecord[]
  declined: CallRecord[]
  completed: CallRecord[]
  others: CallRecord[]
}

type TwilioStatusCall = {
  sid: string
  to: string
  status: string
  durationSeconds?: number
  durationHuman?: string
  startedAt?: string
  endedAt?: string
  from?: string
  direction?: string
}

type CallStatusGroups = {
  active: TwilioStatusCall[]
  queued: TwilioStatusCall[]
  completed: TwilioStatusCall[]
  declined: TwilioStatusCall[]
}

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
  const [callStatusGroups, setCallStatusGroups] = useState<CallStatusGroups>({
    active: [],
    queued: [],
    completed: [],
    declined: [],
  })
  const [callStatusError, setCallStatusError] = useState<string | null>(null)
  const [lastCallStatusUpdate, setLastCallStatusUpdate] = useState<Date | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message])
  }, [])

  const normalizeCallStatus = useCallback((call: unknown): TwilioStatusCall | null => {
    if (!call || typeof call !== "object") {
      return null
    }
    const record = call as Record<string, unknown>
    const sidValue = record.sid ?? record.call_sid ?? record.Sid ?? record.CallSid
    const toValue =
      record.to ??
      record.to_number ??
      record.To ??
      record.to_formatted ??
      record.phone_number ??
      record.toNumber
    const statusValue = record.status ?? record.state ?? record.Status ?? record.call_status
    const startValue =
      record.start_time ??
      record.startTime ??
      record.date_created ??
      record.DateCreated ??
      record.time_created
    const endValue =
      record.end_time ??
      record.endTime ??
      record.date_updated ??
      record.DateUpdated ??
      record.completed_time

    const rawDuration = record.duration ?? record.duration_seconds ?? record.Duration

    const parseDurationSeconds = (value: unknown, start?: string, end?: string): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value
      }
      if (typeof value === "string") {
        const numeric = Number(value)
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
          return numeric
        }
        const hmsMatch = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
        if (hmsMatch) {
          const [, h, m, s] = hmsMatch
          return Number(h) * 3600 + Number(m) * 60 + Number(s)
        }
      }
      if (start && end) {
        const startMs = Date.parse(start)
        const endMs = Date.parse(end)
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
          return Math.round((endMs - startMs) / 1000)
        }
      }
      return undefined
    }

    const durationSeconds = parseDurationSeconds(rawDuration, startValue as string | undefined, endValue as string | undefined)

    const normalizeIso = (value: unknown): string | undefined => {
      if (!value) return undefined
      const date = new Date(value as string)
      if (Number.isNaN(date.getTime())) return undefined
      return date.toISOString()
    }

    const sid = sidValue ? String(sidValue) : "unknown"
    const to = toValue ? String(toValue) : "unknown"
    const status = statusValue ? String(statusValue) : "unknown"
    
    // Handle duration_human from CallRecord
    const durationHuman = record.duration_human as string | undefined
    
    // Handle from_number and direction from CallRecord
    const fromValue = record.from ?? record.from_number ?? record.From ?? record.fromNumber
    const from = fromValue ? String(fromValue) : undefined
    const direction = record.direction as string | undefined

    return {
      sid,
      to,
      status,
      durationSeconds,
      durationHuman,
      startedAt: normalizeIso(startValue),
      endedAt: normalizeIso(endValue),
      from,
      direction,
    }
  }, [])

  const categorizeCallStatuses = useCallback(
    (data: unknown): CallStatusGroups => {
      const groups: CallStatusGroups = { active: [], queued: [], completed: [], declined: [] }
      if (!data || typeof data !== "object") {
        return groups
      }

      const pushCalls = (calls: unknown, groupKey: keyof CallStatusGroups) => {
        if (!Array.isArray(calls)) return
        const normalized = calls
          .map((entry) => normalizeCallStatus(entry))
          .filter(Boolean) as TwilioStatusCall[]
        groups[groupKey] = normalized
      }

      const knownKeys = [
        ["active", "active"],
        ["in_progress", "active"],
        ["in-progress", "active"],
        ["ongoing", "active"],
        ["ringing", "active"],
        ["queued", "queued"],
        ["pending", "queued"],
        ["completed", "completed"],
        ["finished", "completed"],
        ["ended", "completed"],
      ] as const

      const seenKeys = new Set<string>()

      for (const [key, group] of knownKeys) {
        if (key in data) {
          pushCalls((data as Record<string, unknown>)[key], group as keyof CallStatusGroups)
          seenKeys.add(key)
        }
      }

      if ("calls" in data && Array.isArray((data as Record<string, unknown>).calls)) {
        for (const entry of (data as Record<string, unknown>).calls as unknown[]) {
          const normalized = normalizeCallStatus(entry)
          if (!normalized) continue
          const statusLower = normalized.status.toLowerCase()
          if (statusLower.includes("queue")) {
            groups.queued.push(normalized)
          } else if (
            statusLower.includes("complete") ||
            statusLower.includes("finish") ||
            statusLower.includes("ended")
          ) {
            groups.completed.push(normalized)
          } else {
            groups.active.push(normalized)
          }
        }
        seenKeys.add("calls")
      }

      if (groups.active.length === 0 && groups.completed.length === 0 && groups.queued.length === 0) {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          if (seenKeys.has(key) || !Array.isArray(value)) continue
          for (const entry of value) {
            const normalized = normalizeCallStatus(entry)
            if (!normalized) continue
            const statusLower = normalized.status.toLowerCase()
            if (statusLower.includes("queue") || key.toLowerCase().includes("queue")) {
              groups.queued.push(normalized)
            } else if (
              statusLower.includes("complete") ||
              statusLower.includes("finish") ||
              statusLower.includes("ended") ||
              key.toLowerCase().includes("complete")
            ) {
              groups.completed.push(normalized)
            } else {
              groups.active.push(normalized)
            }
          }
        }
      }

      return groups
    },
    [normalizeCallStatus],
  )

  const loadCallStatuses = useCallback(async () => {
    try {
      console.log("[Call Status] Fetching call status summary...")
      let response = await twilioApi.getCallStatusSummary(15)
      
      console.log("[Call Status] Raw response received:", response)
      console.log("[Call Status] Response type:", typeof response)
      console.log("[Call Status] Response is null?", response === null)
      console.log("[Call Status] Response is undefined?", response === undefined)
      
      let summary: CallStatusSummary | null = null

      if (!response) {
        console.error("[Call Status] Empty response from API")
        throw new Error("Empty response from API")
      }

      if (typeof response === "string") {
        console.log("[Call Status] Response is a string, checking if it's HTML...")
        
        // Check if response is HTML (404 page, server error page, etc.)
        if (response.trim().toLowerCase().startsWith("<!doctype html") || response.includes("<html")) {
          console.error("[Call Status] Received HTML response (likely server error or 404):", response.slice(0, 500))
          addLog(`❌ Backend returned HTML instead of JSON. Check if endpoint exists: /api/twilio/call-status/summary`)
          addLog(`❌ This usually means: 1) Backend server is down, 2) endpoint doesn't exist, or 3) wrong URL`)
          throw new Error("Backend returned HTML error page. Check backend server and endpoint URL.")
        }
        
        addLog(`⚠️ Received string response: ${response.slice(0, 200)}`)
        try {
          summary = JSON.parse(response) as CallStatusSummary
          console.log("[Call Status] Successfully parsed string to JSON:", summary)
        } catch (parseError) {
          console.error("[Call Status] Failed to parse string response as JSON", parseError)
          throw new Error("API returned non-JSON response")
        }
      } else if (typeof response === "object") {
        console.log("[Call Status] Response is an object, using directly")
        summary = response as CallStatusSummary
      } else {
        console.error("[Call Status] Unexpected response type:", typeof response)
        throw new Error(`Unexpected response type: ${typeof response}`)
      }

      if (!summary || typeof summary !== "object") {
        console.error("[Call Status] Invalid summary format:", summary)
        throw new Error("Invalid response format from API")
      }
      
      console.log("[Call Status] Summary object:", summary)
      console.log("[Call Status] Summary.ongoing:", summary.ongoing, "Type:", typeof summary.ongoing, "IsArray:", Array.isArray(summary.ongoing))
      console.log("[Call Status] Summary.completed:", summary.completed, "Type:", typeof summary.completed, "IsArray:", Array.isArray(summary.completed))
      console.log("[Call Status] Summary.declined:", summary.declined, "Type:", typeof summary.declined, "IsArray:", Array.isArray(summary.declined))
      console.log("[Call Status] Summary.others:", summary.others, "Type:", typeof summary.others, "IsArray:", Array.isArray(summary.others))
      console.log("[Call Status] Summary keys:", Object.keys(summary))
      
      // Map the summary structure to our groups with defensive checks
      const groups: CallStatusGroups = {
        active: [],
        queued: [],
        completed: [],
        declined: [],
      }

      // Map ongoing → active (with defensive check)
      if (Array.isArray(summary.ongoing)) {
        groups.active = summary.ongoing
          .map((entry) => normalizeCallStatus(entry))
          .filter(Boolean) as TwilioStatusCall[]
      } else {
        addLog("⚠️ Warning: summary.ongoing is not an array")
      }

      // Map completed → completed (with defensive check)
      if (Array.isArray(summary.completed)) {
        groups.completed = summary.completed
          .map((entry) => normalizeCallStatus(entry))
          .filter(Boolean) as TwilioStatusCall[]
      } else {
        addLog("⚠️ Warning: summary.completed is not an array")
      }

      // Map declined → declined (with defensive check)
      if (Array.isArray(summary.declined)) {
        groups.declined = summary.declined
          .map((entry) => normalizeCallStatus(entry))
          .filter(Boolean) as TwilioStatusCall[]
      } else {
        addLog("⚠️ Warning: summary.declined is not an array")
      }

      // Filter others for queued/ringing → queued (with defensive check)
      if (Array.isArray(summary.others)) {
        groups.queued = summary.others
          .filter((call) => {
            const statusLower = (call?.status || "").toLowerCase()
            return statusLower === "queued" || statusLower === "ringing"
          })
          .map((entry) => normalizeCallStatus(entry))
          .filter(Boolean) as TwilioStatusCall[]
      } else {
        addLog("⚠️ Warning: summary.others is not an array")
      }

      console.log("[Call Status] Groups populated:", {
        active: groups.active.length,
        queued: groups.queued.length,
        completed: groups.completed.length,
        declined: groups.declined.length,
      })
      console.log("[Call Status] Groups detail:", groups)
      
      setCallStatusGroups(groups)
      setCallStatusError(null)
      setLastCallStatusUpdate(new Date())
      
      const activeCount = groups.active.length
      const completedCount = groups.completed.length
      const declinedCount = groups.declined.length
      const queuedCount = groups.queued.length
      
      console.log("[Call Status] Final counts:", { activeCount, queuedCount, completedCount, declinedCount })
      
      addLog(
        `Call status update: active=${activeCount}, queued=${queuedCount}, completed=${completedCount}, declined=${declinedCount}`,
      )
      
      // Log the raw response for debugging
      addLog(`📊 Raw API response keys: ${Object.keys(summary).join(", ")}`)
    } catch (error) {
      const message = `Failed to load call status: ${String(error)}`
      setCallStatusError(message)
      addLog(`❌ ${message}`)
      if (error instanceof Error) {
        addLog(`❌ Error details: ${error.message}`)
        if (error.stack) {
          console.error("Call status error stack:", error.stack)
        }
      }
    }
  }, [addLog, normalizeCallStatus])

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

    await loadCallStatuses()

    return status
  }, [loadCallStatuses])

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
      // First, test backend connection
      addLog("🔍 Testing backend connection...")
      try {
        const health = await healthApi.check()
        if (!isMounted) return
        console.log("[Connection Test] Health check response:", health)
        addLog("✅ Backend connection successful")
      } catch (error) {
        if (!isMounted) return
        console.error("[Connection Test] Health check failed:", error)
        addLog(`❌ Backend connection failed: ${String(error)}`)
        addLog(`⚠️ All API calls will fail until connection is restored.`)
        addLog(`💡 Check: 1) Is backend running on Linode? 2) Is API URL correct in .env.local? 3) Check firewall/network settings`)
        // Don't continue with other API calls if health check fails
        return
      }

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
              let name = "name" in item && typeof item.name === "string" ? item.name : null
              let code = "code" in item && typeof item.code === "string" ? item.code : null
              
              // Clean up name if it already contains the code in parentheses
              if (name && code) {
                // Remove code from name if it's already there (e.g., "United States (+1)" -> "United States")
                const codeInParens = `(${code})`
                if (name.includes(codeInParens)) {
                  name = name.replace(codeInParens, "").trim()
                }
                // Also handle cases where code might be at the end without parentheses
                if (name.endsWith(code)) {
                  name = name.replace(code, "").trim()
                }
              }
              
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

  const formatDuration = useCallback((seconds?: number, startedAt?: string, endedAt?: string): string => {
    let totalSeconds = seconds
    if ((totalSeconds === undefined || Number.isNaN(totalSeconds)) && startedAt && endedAt) {
      const startMs = Date.parse(startedAt)
      const endMs = Date.parse(endedAt)
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        totalSeconds = Math.round((endMs - startMs) / 1000)
      }
    }
    if (totalSeconds === undefined || totalSeconds < 0) {
      return "—"
    }
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = Math.floor(totalSeconds % 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }, [])

  const formatTimestamp = useCallback((value?: string): string => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }, [])

  const statusBadgeClass = useCallback((status: string) => {
    const lower = status.toLowerCase()
    if (lower.includes("queue")) return "bg-amber-100 text-amber-700 border border-amber-200"
    if (lower.includes("complete") || lower.includes("finish") || lower.includes("ended"))
      return "bg-emerald-100 text-emerald-700 border border-emerald-200"
    if (lower.includes("decline") || lower.includes("fail") || lower.includes("no-answer") || lower.includes("busy"))
      return "bg-red-100 text-red-700 border border-red-200"
    return "bg-blue-100 text-blue-700 border border-blue-200"
  }, [])

  const renderCallStatusGroup = useCallback(
    (title: string, description: string, calls: TwilioStatusCall[]) => (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
        <div className="mt-3 space-y-3">
          {calls.length === 0 ? (
            <div className="text-xs text-slate-400">No calls</div>
          ) : (
            calls.map((call) => (
              <div
                key={call.sid}
                className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-600">{call.sid}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(call.status)}`}>
                    {call.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="truncate font-medium text-slate-800">To: {call.to}</span>
                    {call.from && (
                      <span className="text-[10px] text-slate-500">From: {call.from}</span>
                    )}
                  </div>
                  <span className="text-slate-500">
                    {call.durationHuman || formatDuration(call.durationSeconds, call.startedAt, call.endedAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Started: {formatTimestamp(call.startedAt)}</span>
                  {call.endedAt && <span>Ended: {formatTimestamp(call.endedAt)}</span>}
                  {call.direction && <span className="text-slate-400">({call.direction})</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    [formatDuration, formatTimestamp, statusBadgeClass],
  )

  useEffect(() => {
    if (typeof document === "undefined") return

    let intervalId: number | null = null

    const startPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
      intervalId = window.setInterval(() => {
        loadCallStatuses()
      }, 25000)
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        loadCallStatuses()
        startPolling()
      }
    }

    loadCallStatuses()
    startPolling()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [loadCallStatuses])

  const aggregatedCounts = useMemo(() => {
    const counts = {
      active: callStatusGroups.active.length,
      queued: callStatusGroups.queued.length,
      completed: callStatusGroups.completed.length,
      declined: callStatusGroups.declined.length,
    }
    console.log("[Render] aggregatedCounts calculated:", counts)
    console.log("[Render] callStatusGroups state:", callStatusGroups)
    console.log("[Render] callStatusGroups.active.length:", callStatusGroups.active.length)
    console.log("[Render] callStatusGroups.completed.length:", callStatusGroups.completed.length)
    return counts
  }, [callStatusGroups])
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
                  {countries.map((country, idx) => {
                    // Ensure we don't duplicate the code if it's already in the name
                    const codeInParens = `(${country.code})`
                    const displayName = country.name.includes(codeInParens) 
                      ? country.name 
                      : `${country.name} (${country.code})`
                    return (
                      <option key={`${country.code}-${idx}`} value={idx}>
                        {displayName}
                    </option>
                    )
                  })}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detailed Call Status</h2>
              <p className="text-sm text-gray-600">
                Live Twilio call breakdown (auto-refreshes every 25 seconds)
              </p>
            </div>
            <div className="text-xs text-gray-500">
              {lastCallStatusUpdate
                ? `Last updated: ${lastCallStatusUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Waiting for first update..."}
            </div>
          </div>

          {callStatusError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {callStatusError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {renderCallStatusGroup(
              `Active / In Progress (${aggregatedCounts.active})`,
              "Calls currently connecting or in progress",
              callStatusGroups.active,
            )}
            {renderCallStatusGroup(
              `Queued / Ringing (${aggregatedCounts.queued})`,
              "Queued or ringing calls awaiting connection",
              callStatusGroups.queued,
            )}
            {renderCallStatusGroup(
              `Completed (${aggregatedCounts.completed})`,
              "Recently completed or disconnected calls",
              callStatusGroups.completed,
            )}
            {renderCallStatusGroup(
              `Declined / Failed (${aggregatedCounts.declined})`,
              "Calls that were declined, failed, or not answered",
              callStatusGroups.declined,
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
              <p className="text-sm text-gray-600">
                Complete list of all calls fetched from backend (shows data is being retrieved)
              </p>
            </div>
            <div className="text-xs text-gray-500">
              {lastCallStatusUpdate
                ? `Last fetch: ${lastCallStatusUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "No data fetched yet"}
            </div>
          </div>

          {callStatusError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {callStatusError}
            </div>
          )}

          {(() => {
            // Combine all calls from all groups
            const allCalls: (TwilioStatusCall & { group: string })[] = [
              ...callStatusGroups.active.map((c) => ({ ...c, group: "Active" })),
              ...callStatusGroups.queued.map((c) => ({ ...c, group: "Queued" })),
              ...callStatusGroups.completed.map((c) => ({ ...c, group: "Completed" })),
              ...callStatusGroups.declined.map((c) => ({ ...c, group: "Declined" })),
            ]

            // Sort by start time (most recent first)
            allCalls.sort((a, b) => {
              const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0
              const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0
              return bTime - aTime
            })

            const totalCount = allCalls.length

            return (
              <div>
                <div className="mb-3 text-sm text-gray-700">
                  <span className="font-semibold">Total calls in history: {totalCount}</span>
                  {totalCount > 0 && (
                    <span className="ml-4 text-xs text-gray-500">
                      (Active: {callStatusGroups.active.length}, Queued: {callStatusGroups.queued.length}, 
                      Completed: {callStatusGroups.completed.length}, Declined: {callStatusGroups.declined.length})
                    </span>
                  )}
                </div>

                {totalCount === 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
                    <p className="font-semibold">No call data available</p>
                    <p className="mt-1 text-xs">
                      {callStatusError
                        ? "Error fetching data from backend. Check connection."
                        : "Waiting for call data to be fetched from backend..."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {allCalls.map((call) => (
                      <div
                        key={call.sid}
                        className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(call.status)}`}>
                              {call.status}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                              {call.group}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">{call.sid}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-500">To:</span>{" "}
                            <span className="font-medium">{call.to}</span>
                          </div>
                          {call.from && (
                            <div>
                              <span className="text-slate-500">From:</span>{" "}
                              <span className="font-medium">{call.from}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Duration:</span>{" "}
                            <span className="font-medium">
                              {call.durationHuman || formatDuration(call.durationSeconds, call.startedAt, call.endedAt)}
                            </span>
                          </div>
                          {call.direction && (
                            <div>
                              <span className="text-slate-500">Direction:</span>{" "}
                              <span className="font-medium">{call.direction}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            Started: {call.startedAt ? formatTimestamp(call.startedAt) : "—"}
                          </span>
                          {call.endedAt && <span>Ended: {formatTimestamp(call.endedAt)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
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
