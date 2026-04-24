'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

export function EperBadge() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/signup') return null
  return (
    <a
      href="https://epertechnologies.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Built by Eper Technologies"
      className="fixed bottom-3 left-3 z-40 opacity-70 hover:opacity-100 transition-opacity"
    >
      <Image src="/eper-logo.webp" alt="Eper Technologies" width={14} height={14} />
    </a>
  )
}
