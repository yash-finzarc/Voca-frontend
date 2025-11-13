"use client"

import { useState } from "react"
import Sidebar from "./sidebar"
import Header from "./header"
import MainContent from "./main-content"
import Footer from "./footer"

export default function Dashboard() {
  const [logs, setLogs] = useState<string[]>(["[INFO] Dashboard initialized"])
  const [callStatus, setCallStatus] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const addCallStatus = (status: string) => {
    setCallStatus((prev) => [...prev, status])
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <MainContent
          addLog={addLog}
          addCallStatus={addCallStatus}
          callStatus={callStatus}
          setIsLoading={setIsLoading}
          isLoading={isLoading}
        />
        <Footer logs={logs} />
      </div>
    </div>
  )
}
