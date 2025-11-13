"use client"

interface FooterProps {
  logs?: string[]
}

export default function Footer({ logs }: FooterProps) {
  return (
    <footer className="bg-white border-t border-gray-200 p-4">
      <p className="text-xs text-gray-500">© 2025 Voca AI Voice Assistant. All rights reserved.</p>
    </footer>
  )
}
