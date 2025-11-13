"use client"

import type React from "react"

import Sidebar from "./sidebar"
import Header from "./header"
import Footer from "./footer"
import { useState } from "react"

interface LayoutWrapperProps {
  children: React.ReactNode
  showFooter?: boolean
}

export default function LayoutWrapper({ children, showFooter = true }: LayoutWrapperProps) {
  const [logs, setLogs] = useState<string[]>(["[INFO] Dashboard initialized"])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="fixed left-0 top-0 h-screen">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
        {showFooter && <Footer logs={logs} />}
      </div>
    </div>
  )
}
