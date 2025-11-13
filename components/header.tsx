"use client"

import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Voca - AI Voice Assistant with Twilio</h2>
      </div>
      <div className="flex items-center gap-4">
        <Badge className="bg-green-100 text-green-800">Ready</Badge>
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <User className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </header>
  )
}
