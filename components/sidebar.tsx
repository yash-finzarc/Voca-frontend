"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Mic, Phone } from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Local Voice", icon: Mic, href: "/local-voice" },
  { label: "Twilio Calls", icon: Phone, href: "/twilio-calls" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-2 hidden md:block">
      <div className="px-3 py-4">
        <h1 className="font-semibold text-lg text-blue-600">Voca</h1>
        <p className="text-xs text-gray-500">AI Voice Assistant</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.label} href={item.href}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive ? "bg-blue-50 border-l-4 border-blue-500 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
