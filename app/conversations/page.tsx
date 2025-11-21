"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw } from "lucide-react"
import { conversationsApi } from "@/lib/api-services"
import { useOrganization } from "@/lib/organization-context"

type ConversationRecord = {
  id: string
  call_sid?: string | null
  lead_status?: string | null
  created_at?: string | null
  lead_data?: Record<string, unknown> | null
}

const statusColors: Record<string, string> = {
  qualified: "bg-green-100 text-green-800",
  interested: "bg-blue-100 text-blue-800",
  unqualified: "bg-red-100 text-red-800",
  contacted: "bg-amber-100 text-amber-800",
}

const normalizeConversation = (item: unknown): ConversationRecord | null => {
  if (!item || typeof item !== "object") return null
  const record = item as Record<string, unknown>
  const id = record.id ?? record.conversation_id ?? record.conversationId
  if (!id) return null

  return {
    id: String(id),
    call_sid: record.call_sid ? String(record.call_sid) : undefined,
    lead_status: record.lead_status ? String(record.lead_status) : undefined,
    created_at: record.created_at ? String(record.created_at) : undefined,
    lead_data: (record.lead_data as Record<string, unknown>) ?? null,
  }
}

const toConversationList = (payload: unknown): ConversationRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeConversation).filter((item): item is ConversationRecord => Boolean(item))
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.conversations)) {
      return record.conversations
        .map(normalizeConversation)
        .filter((item): item is ConversationRecord => Boolean(item))
    }
  }

  return []
}

export default function ConversationsPage() {
  const { organizationId } = useOrganization()
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    if (!organizationId) {
      setConversations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await conversationsApi.list(organizationId, 50)
      const normalized = toConversationList(response)
      setConversations(normalized)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to load conversations: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600">Review lead transcripts and statuses per organization</p>
        </div>
        <Button variant="outline" onClick={() => void loadConversations()} disabled={isLoading || !organizationId}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {!organizationId && (
        <Card>
          <CardContent className="py-6 text-sm text-amber-900">
            Organization ID is required. Configure <code>NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID</code> or sign in to select an organization.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Includes LangGraph session snapshots and lead data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-muted-foreground">Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No conversations found for this organization.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Status</TableHead>
                  <TableHead>Call SID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Lead Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      {conversation.lead_status ? (
                        <Badge className={statusColors[conversation.lead_status.toLowerCase()] ?? "bg-slate-100 text-slate-800"}>
                          {conversation.lead_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{conversation.call_sid ?? "—"}</TableCell>
                    <TableCell>
                      {conversation.created_at
                        ? new Date(conversation.created_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {conversation.lead_data
                        ? Object.entries(conversation.lead_data)
                            .map(([key, value]) => `${key}: ${value}`)
                            .slice(0, 3)
                            .join(" • ")
                        : "No lead data"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/conversations/${conversation.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}









