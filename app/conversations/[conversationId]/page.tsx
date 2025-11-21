"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { conversationsApi } from "@/lib/api-services"
import { useOrganization } from "@/lib/organization-context"

type ConversationDetail = {
  id: string
  call_sid?: string | null
  lead_status?: string | null
  created_at?: string | null
  updated_at?: string | null
  lead_data?: Record<string, unknown> | null
  transcript?: unknown
}

const normalizeConversationDetail = (payload: unknown): ConversationDetail | null => {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const id = record.id ?? record.conversation_id ?? record.conversationId
  if (!id) return null

  return {
    id: String(id),
    call_sid: record.call_sid ? String(record.call_sid) : undefined,
    lead_status: record.lead_status ? String(record.lead_status) : undefined,
    created_at: record.created_at ? String(record.created_at) : undefined,
    updated_at: record.updated_at ? String(record.updated_at) : undefined,
    lead_data: (record.lead_data as Record<string, unknown>) ?? null,
    transcript: record.transcript,
  }
}

const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value ?? "")
  }
}

export default function ConversationDetailPage() {
  const params = useParams<{ conversationId: string }>()
  const router = useRouter()
  const { organizationId } = useOrganization()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const conversationId = params?.conversationId

  const loadConversation = useCallback(async () => {
    if (!organizationId || !conversationId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await conversationsApi.get(organizationId, conversationId)
      const normalized = normalizeConversationDetail(response)
      setConversation(normalized)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to load conversation: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, conversationId])

  useEffect(() => {
    void loadConversation()
  }, [loadConversation])

  const leadDataJson = useMemo(() => formatJson(conversation?.lead_data ?? {}), [conversation])
  const transcriptJson = useMemo(() => formatJson(conversation?.transcript ?? {}), [conversation])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversation Details</h1>
          <p className="text-gray-600">Inspect the LangGraph session, lead data, and transcript</p>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-muted-foreground">Loading conversation...</span>
        </div>
      ) : conversation ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>High-level metadata for this conversation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Conversation ID</p>
                  <p className="font-mono text-sm">{conversation.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Call SID</p>
                  <p className="font-mono text-sm">{conversation.call_sid ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Lead Status</p>
                  {conversation.lead_status ? (
                    <Badge className="mt-1 bg-blue-100 text-blue-800">{conversation.lead_status}</Badge>
                  ) : (
                    <p className="text-muted-foreground mt-1">Unknown</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Created</p>
                  <p>{conversation.created_at ? new Date(conversation.created_at).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Updated</p>
                  <p>{conversation.updated_at ? new Date(conversation.updated_at).toLocaleString() : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Data</CardTitle>
              <CardDescription>Structured lead fields captured during the LangGraph flow</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-100 p-4 rounded-md text-xs overflow-auto max-h-[400px]">
                {leadDataJson}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>Conversation transcript or state snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-100 p-4 rounded-md text-xs overflow-auto max-h-[600px]">
                {transcriptJson}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Conversation not found or you do not have access.
          </CardContent>
        </Card>
      )}
    </div>
  )
}









