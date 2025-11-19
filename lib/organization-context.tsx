"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type OrganizationContextValue = {
  organizationId: string
  setOrganizationId: (organizationId: string) => void
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

const FALLBACK_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? ""

type OrganizationProviderProps = {
  children: ReactNode
  initialOrganizationId?: string
}

export function OrganizationProvider({ children, initialOrganizationId }: OrganizationProviderProps) {
  const [organizationId, setOrganizationId] = useState(initialOrganizationId || FALLBACK_ORG_ID)

  const value = useMemo(
    () => ({
      organizationId,
      setOrganizationId,
    }),
    [organizationId],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}





