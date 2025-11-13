"use client"

import { useState } from "react"
import LocalVoiceTab from "./local-voice-tab"
import TwilioCallsTab from "./twilio-calls-tab"

interface MainContentProps {
  addLog: (message: string) => void
  addCallStatus: (status: string) => void
  callStatus: string[]
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function MainContent({ addLog, addCallStatus, callStatus, setIsLoading, isLoading }: MainContentProps) {
  const [activeTab, setActiveTab] = useState<"local" | "twilio">("local")

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your AI voice calls</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("local")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "local" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Local Voice
        </button>
        <button
          onClick={() => setActiveTab("twilio")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "twilio" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Twilio Calls
        </button>
      </div>

      {activeTab === "local" && <LocalVoiceTab addLog={addLog} setIsLoading={setIsLoading} isLoading={isLoading} />}

      {activeTab === "twilio" && (
        <TwilioCallsTab
          addLog={addLog}
          addCallStatus={addCallStatus}
          callStatus={callStatus}
          setIsLoading={setIsLoading}
          isLoading={isLoading}
        />
      )}
    </main>
  )
}
