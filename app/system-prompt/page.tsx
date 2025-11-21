"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Save, RotateCcw, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { systemPromptApi } from "@/lib/api-services"
import { useOrganization } from "@/lib/organization-context"

type PromptRecord = {
  id: string
  name: string
  prompt: string
  welcomeMessage?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const normalizePromptResponse = (item: unknown): PromptRecord | null => {
  if (!item || typeof item !== "object") {
    console.log("[normalizePromptResponse] Invalid item:", item)
    return null
  }
  const record = item as Record<string, unknown>
  console.log("[normalizePromptResponse] Processing record:", record, "Keys:", Object.keys(record))
  
  const id = String(record.id ?? record.key ?? "")
  if (!id) {
    console.log("[normalizePromptResponse] No ID found in record")
    return null
  }

  // Use name if available, otherwise fall back to key, then a default
  const name = String(record.name ?? record.key ?? "Untitled Prompt")
  console.log("[normalizePromptResponse] Extracted name:", name, "from record.name:", record.name, "record.key:", record.key)

  const normalized = {
    id,
    name,
    prompt: String(record.prompt ?? ""),
    welcomeMessage: record.welcome_message ? String(record.welcome_message) : undefined,
    isActive: Boolean(record.is_active ?? record.isDefault ?? record.is_active_prompt ?? record.is_default),
    createdAt: record.created_at ? String(record.created_at) : undefined,
    updatedAt: record.updated_at ? String(record.updated_at) : undefined,
  }
  
  console.log("[normalizePromptResponse] Normalized result:", normalized)
  return normalized
}

const extractPromptList = (payload: unknown): PromptRecord[] => {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload.map(normalizePromptResponse).filter((item): item is PromptRecord => Boolean(item))
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>
    
    // Check if it's a single prompt object (has id or key)
    if (record.id || record.key) {
      const single = normalizePromptResponse(record)
      return single ? [single] : []
    }
    
    // Check for nested prompts array
    if (Array.isArray(record.prompts)) {
      return record.prompts
        .map(normalizePromptResponse)
        .filter((item): item is PromptRecord => Boolean(item))
    }
    
    // Check for data field (common API pattern)
    if (Array.isArray(record.data)) {
      return record.data
        .map(normalizePromptResponse)
        .filter((item): item is PromptRecord => Boolean(item))
    }
  }

  return []
}

export default function SystemPromptPage() {
  const { organizationId } = useOrganization()
  const [prompt, setPrompt] = useState("")
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [originalWelcomeMessage, setOriginalWelcomeMessage] = useState("")
  const [selectedPromptId, setSelectedPromptId] = useState<string>("")
  const [prompts, setPrompts] = useState<PromptRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingWelcomeMessage, setIsSavingWelcomeMessage] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPromptName, setNewPromptName] = useState("")
  const [newPromptText, setNewPromptText] = useState("")
  const [newWelcomeMessage, setNewWelcomeMessage] = useState("")

  const selectedPrompt = useMemo(
    () => prompts.find((record) => record.id === selectedPromptId),
    [prompts, selectedPromptId],
  )

  const loadPrompts = useCallback(
    async (preserveSelection: boolean = true) => {
      setIsLoading(true)
      setIsLoadingPrompts(true)
      setError(null) // Clear previous errors
      try {
        let response: unknown
        let promptList: PromptRecord[] = []
        let listError: unknown = null
        let activeError: unknown = null

        // Try to get list of prompts first
        try {
          console.log("[loadPrompts] Attempting to fetch prompt list...", { organizationId: organizationId || "none" })
          response = await systemPromptApi.list(organizationId || undefined)
          console.log("[loadPrompts] List response received:", response)
          console.log("[loadPrompts] Response type:", typeof response)
          console.log("[loadPrompts] Response is array?", Array.isArray(response))
          
          promptList = extractPromptList(response)
          console.log("[loadPrompts] Extracted prompt list:", promptList)
          console.log("[loadPrompts] Prompt list length:", promptList.length)
        } catch (listErr) {
          listError = listErr
          const listErrMessage = listErr instanceof Error ? listErr.message : String(listErr)
          console.warn("[loadPrompts] List endpoint failed:", listErrMessage)
          console.warn("[loadPrompts] List error details:", listErr)
          
          // If list endpoint doesn't exist (405), try getting active prompt instead
          if (listErrMessage.includes("405") || listErrMessage.includes("Method Not Allowed")) {
            console.log("[loadPrompts] List endpoint not available (405), trying getActive as fallback")
          } else {
            // For other errors (network, 404, 500, etc.), still try getActive
            console.log("[loadPrompts] List endpoint error, trying getActive as fallback:", listErrMessage)
          }
          
          try {
            console.log("[loadPrompts] Attempting to fetch active prompt...", { organizationId: organizationId || "none" })
            response = await systemPromptApi.getActive(organizationId || undefined)
            console.log("[loadPrompts] getActive response received:", response)
            console.log("[loadPrompts] getActive response type:", typeof response)
            // extractPromptList now handles single objects too
            promptList = extractPromptList(response)
            console.log("[loadPrompts] Extracted prompt list from getActive:", promptList)
            console.log("[loadPrompts] Prompt list length after getActive:", promptList.length)
          } catch (activeErr) {
            activeError = activeErr
            const activeErrMessage = activeErr instanceof Error ? activeErr.message : String(activeErr)
            console.error("[loadPrompts] Both list and getActive failed:")
            console.error("[loadPrompts]   List error:", listErrMessage)
            console.error("[loadPrompts]   Active error:", activeErrMessage)
            promptList = []
            
            // Show a helpful error message
            if (activeErrMessage.includes("Network Error") || activeErrMessage.includes("Failed to fetch")) {
              setError(`Failed to connect to backend. Check if the backend server is running and accessible. Error: ${activeErrMessage}`)
            } else if (activeErrMessage.includes("404")) {
              setError(`System prompt endpoint not found. The backend may not have the /api/system-prompt endpoint configured.`)
            } else {
              setError(`Failed to load system prompts. List endpoint: ${listErrMessage || "failed"}. Active endpoint: ${activeErrMessage || "failed"}`)
            }
          }
        }

        setPrompts(promptList)

        if (!promptList.length) {
          setSelectedPromptId("")
          setPrompt("")
          setOriginalPrompt("")
          setWelcomeMessage("")
          setOriginalWelcomeMessage("")
          
          // Only show "no prompts" message if there was no error (user can create new)
          if (!listError && !activeError) {
            console.log("[loadPrompts] No prompts found, but no errors occurred")
          }
          setIsLoading(false)
          setIsLoadingPrompts(false)
          return
        }

        if (preserveSelection && selectedPromptId) {
          const stillExists = promptList.some((promptRecord) => promptRecord.id === selectedPromptId)
          if (stillExists) {
            setIsLoading(false)
            setIsLoadingPrompts(false)
            return
          }
        }

        const nextPrompt =
          promptList.find((promptRecord) => promptRecord.isActive) ?? promptList[0]
        setSelectedPromptId(nextPrompt.id)
        setPrompt(nextPrompt.prompt)
        setOriginalPrompt(nextPrompt.prompt)
        setWelcomeMessage(nextPrompt.welcomeMessage ?? "")
        setOriginalWelcomeMessage(nextPrompt.welcomeMessage ?? "")
      } catch (err) {
        // Only set error for unexpected errors (not 405 from missing /list endpoint)
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error("[loadPrompts] Unexpected error:", err)
        // Check if it's a 405 error (method not allowed) - this is expected if /list doesn't exist
        if (errorMessage.includes("405") || errorMessage.includes("Method Not Allowed")) {
          console.log("[loadPrompts] List endpoint not available (expected if backend doesn't support it)")
          // Don't set error - we already tried getActive as fallback
        } else {
          setError(`Failed to load system prompts: ${errorMessage}`)
        }
      } finally {
        setIsLoading(false)
        setIsLoadingPrompts(false)
      }
    },
    [organizationId, selectedPromptId],
  )

  useEffect(() => {
    void loadPrompts(false)
  }, [loadPrompts])

  useEffect(() => {
    if (!selectedPromptId) {
      return
    }
    const current = prompts.find((record) => record.id === selectedPromptId)
    if (current) {
      setPrompt(current.prompt)
      setOriginalPrompt(current.prompt)
      setWelcomeMessage(current.welcomeMessage ?? "")
      setOriginalWelcomeMessage(current.welcomeMessage ?? "")
    }
  }, [prompts, selectedPromptId])

  const handleSave = useCallback(async () => {
    if (!selectedPromptId) {
      setMessage({ type: "error", text: "Select a prompt before saving" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (prompt === originalPrompt && welcomeMessage === originalWelcomeMessage) {
      setMessage({ type: "error", text: "No changes to save" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      // organizationId is optional - backend will update default prompt if not provided
      await systemPromptApi.update(
        selectedPromptId,
        { prompt, welcome_message: welcomeMessage },
        organizationId || undefined,
      )
      setOriginalPrompt(prompt)
      setOriginalWelcomeMessage(welcomeMessage)
      await loadPrompts(true)
      setMessage({ type: "success", text: "System prompt and welcome message updated successfully!" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to save system prompt: ${errorMessage}`)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }, [organizationId, selectedPromptId, prompt, originalPrompt, welcomeMessage, originalWelcomeMessage, loadPrompts])

  const handleSaveWelcomeMessage = useCallback(async () => {
    if (!selectedPromptId) {
      setMessage({ type: "error", text: "Select a prompt before saving" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (welcomeMessage === originalWelcomeMessage) {
      setMessage({ type: "error", text: "No changes to save" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsSavingWelcomeMessage(true)
    setError(null)
    setMessage(null)

    try {
      // Use the dedicated welcome message endpoint
      await systemPromptApi.updateWelcomeMessage(
        welcomeMessage,
        organizationId || undefined,
      )
      setOriginalWelcomeMessage(welcomeMessage)
      await loadPrompts(true)
      setMessage({ type: "success", text: "Welcome message updated successfully!" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to save welcome message: ${errorMessage}`)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSavingWelcomeMessage(false)
    }
  }, [organizationId, selectedPromptId, welcomeMessage, originalWelcomeMessage, loadPrompts])

  const handleCreatePrompt = useCallback(async () => {
    if (!newPromptName.trim()) {
      setMessage({ type: "error", text: "Please enter a name for the prompt" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (!newPromptText.trim()) {
      setMessage({ type: "error", text: "Please enter the prompt text" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsCreating(true)
    setError(null)
    setMessage(null)

    try {
      console.log("[Create Prompt] Calling API with:", {
        organizationId: organizationId || "(not provided - will save as default)",
        name: newPromptName.trim(),
        prompt: newPromptText,
        is_active: true,
      })

      // organizationId is optional - backend will save as default if not provided
      const created = await systemPromptApi.create(
        {
          name: newPromptName.trim(),
          prompt: newPromptText,
          welcome_message: newWelcomeMessage.trim(),
          is_active: true,
        },
        organizationId || undefined,
      )

      console.log("[Create Prompt] API Response:", created)

      if (!created) {
        throw new Error("No response from server")
      }

      setIsCreateDialogOpen(false)
      setNewPromptName("")
      setNewPromptText("")
      setNewWelcomeMessage("")
      await loadPrompts(false)
      
      // Extract ID from response (handle different response formats)
      const createdRecord = created as Record<string, unknown>
      const createdId = createdRecord?.id ?? createdRecord?.prompt_id
      if (createdId) {
        setSelectedPromptId(String(createdId))
        const createdPrompt = String(createdRecord?.prompt ?? newPromptText)
        setPrompt(createdPrompt)
        setOriginalPrompt(createdPrompt)
        const createdWelcomeMessage = String(createdRecord?.welcome_message ?? newWelcomeMessage)
        setWelcomeMessage(createdWelcomeMessage)
        setOriginalWelcomeMessage(createdWelcomeMessage)
      }
      
      setMessage({ type: "success", text: `Prompt "${newPromptName}" created successfully!` })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      console.error("[Create Prompt] Error:", err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to create prompt: ${errorMessage}`)
      setMessage({ type: "error", text: `Failed to create prompt: ${errorMessage}` })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsCreating(false)
    }
  }, [organizationId, newPromptName, newPromptText, newWelcomeMessage, loadPrompts])

  const handlePromptChange = useCallback(
    (value: string) => {
      if (value === "__create_new__") {
        setIsCreateDialogOpen(true)
        return
      }

      if (value !== selectedPromptId) {
        setSelectedPromptId(value)
        const nextPrompt = prompts.find((record) => record.id === value)
        if (nextPrompt) {
          setPrompt(nextPrompt.prompt)
          setOriginalPrompt(nextPrompt.prompt)
          setWelcomeMessage(nextPrompt.welcomeMessage ?? "")
          setOriginalWelcomeMessage(nextPrompt.welcomeMessage ?? "")
        }
      }
    },
    [selectedPromptId, prompts],
  )

  const handleReset = useCallback(async () => {
    if (!confirm("Are you sure you want to reset the system prompt to default? This cannot be undone.")) {
      return
    }

    setIsResetting(true)
    setError(null)
    setMessage(null)

    try {
      // organizationId is optional - backend will reset default prompt if not provided
      await systemPromptApi.reset(organizationId || undefined)
      await loadPrompts(false)
      setMessage({ type: "success", text: "System prompt reset to default" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to reset system prompt: ${errorMessage}`)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsResetting(false)
    }
  }, [organizationId, loadPrompts])

  const hasChanges = prompt !== originalPrompt || welcomeMessage !== originalWelcomeMessage
  const hasWelcomeMessageChanges = welcomeMessage !== originalWelcomeMessage
  const hasPromptChanges = prompt !== originalPrompt
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length
  const charCount = prompt.length
  const welcomeMessageCharCount = welcomeMessage.length

  const renderPromptOptions = () => {
    console.log("[renderPromptOptions] Current prompts state:", prompts)
    if (!prompts.length) {
      return <div className="px-3 py-2 text-sm text-muted-foreground">No prompts available</div>
    }

    return (
      <>
        {prompts.map((promptRecord) => {
          const displayName = promptRecord.name || promptRecord.id || "Untitled Prompt"
          console.log("[renderPromptOptions] Rendering prompt:", promptRecord.id, "with name:", displayName, "full record:", promptRecord)
          return (
            <SelectItem key={promptRecord.id} value={promptRecord.id}>
              <div className="flex flex-col text-left">
                <span className="font-medium">{displayName}</span>
                {promptRecord.isActive && (
                  <span className="text-xs text-green-600">Active</span>
                )}
              </div>
            </SelectItem>
          )
        })}
        <SelectItem value="__create_new__" className="text-blue-600 font-medium">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Create New Prompt</span>
          </div>
        </SelectItem>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Prompt</h1>
          <p className="mt-1 text-gray-600">Configure the AI system prompt used for voice interactions</p>
        </div>

        {organizationId && process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900 text-xs">
            <strong>Debug Info:</strong> Organization ID: <code className="bg-blue-100 px-1 rounded">{organizationId}</code>
            {" | "}
            Check browser console for API request/response logs
          </div>
        )}

        {!organizationId && process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900 text-xs">
            <strong>Info:</strong> No organization ID set - prompts will be saved as default prompts. 
            To use multi-tenant features, set <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID</code> in your environment variables.
          </div>
        )}

        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs">
            <strong>API Debug Info:</strong>
            <div className="mt-1 space-y-1">
              <div>Backend URL: <code className="bg-amber-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_BASE_URL || "NOT CONFIGURED"}</code></div>
              <div>Expected endpoints:
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li><code>/api/system-prompt/list</code> or</li>
                  <li><code>/api/system-prompt</code></li>
                </ul>
              </div>
              <div className="mt-2 text-amber-800">
                <strong>Note:</strong> If you see "NOT CONFIGURED", restart your Next.js dev server after updating .env.local
              </div>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`rounded-lg border p-4 flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Edit System Prompt & Welcome Message</CardTitle>
            <CardDescription>
              Configure the welcome message and system prompt that define the AI assistant's behavior, personality, and instructions for voice interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && !selectedPrompt ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading system prompt...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="prompt-select" className="text-sm font-medium text-gray-700">
                      Select Prompt
                    </label>
                  </div>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Select
                      value={selectedPromptId}
                      onValueChange={handlePromptChange}
                      disabled={isLoadingPrompts || !organizationId}
                    >
                      <SelectTrigger id="prompt-select" className="flex-1">
                        <SelectValue placeholder="Select a prompt..." />
                      </SelectTrigger>
                      <SelectContent>{renderPromptOptions()}</SelectContent>
                    </Select>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          New
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create New System Prompt</DialogTitle>
                          <DialogDescription>
                            Create a new system prompt with a custom name. The prompt will be scoped to the selected organization.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-prompt-name">Prompt Name</Label>
                            <Input
                              id="new-prompt-name"
                              value={newPromptName}
                              onChange={(e) => setNewPromptName(e.target.value)}
                              placeholder="e.g., Customer Support, Technical Assistant"
                            />
                            <p className="text-xs text-gray-500">Enter a descriptive name for this prompt</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-welcome-message">Welcome Message</Label>
                            <Textarea
                              id="new-welcome-message"
                              value={newWelcomeMessage}
                              onChange={(e) => setNewWelcomeMessage(e.target.value)}
                              placeholder="Enter the welcome message that will be played when a call starts..."
                              className="min-h-[120px] text-sm"
                            />
                            <p className="text-xs text-gray-500">
                              This message will be played to users when they first connect to the AI assistant
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-prompt-text">Prompt Text</Label>
                            <Textarea
                              id="new-prompt-text"
                              value={newPromptText}
                              onChange={(e) => setNewPromptText(e.target.value)}
                              placeholder="Enter the system prompt text..."
                              className="min-h-[300px] font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500">
                              Define the AI assistant's behavior, personality, and instructions
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsCreateDialogOpen(false)
                              setNewPromptName("")
                              setNewPromptText("")
                              setNewWelcomeMessage("")
                            }}
                            disabled={isCreating}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreatePrompt}
                            disabled={isCreating || !newPromptName.trim() || !newPromptText.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Prompt
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="welcome-message" className="text-sm font-medium text-gray-700">
                      Welcome Message
                    </label>
                    <div className="text-xs text-gray-500">
                      {welcomeMessageCharCount} characters
                    </div>
                  </div>
                  <Textarea
                    id="welcome-message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Enter the welcome message that will be played when a call starts..."
                    className="min-h-[120px] text-sm"
                    disabled={!selectedPromptId}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      This message will be played to users when they first connect to the AI assistant. It will be stored in the welcome_message column in Supabase.
                    </p>
                    <Button
                      onClick={handleSaveWelcomeMessage}
                      disabled={isSavingWelcomeMessage || welcomeMessage === originalWelcomeMessage || !selectedPromptId}
                      size="sm"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isSavingWelcomeMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Welcome Message
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="system-prompt" className="text-sm font-medium text-gray-700">
                        System Prompt
                      </label>
                    <div className="text-xs text-gray-500">
                      {wordCount} words • {charCount} characters
                    </div>
                  </div>
                  <Textarea
                    id="system-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter the system prompt for the AI assistant..."
                    className="min-h-[400px] font-mono text-sm"
                    disabled={!selectedPromptId}
                  />
                  <p className="text-xs text-gray-500">
                    The system prompt will be used to guide the AI's responses during voice conversations.
                  </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {hasPromptChanges && (
                      <span className="text-xs text-amber-600 font-medium">System prompt has unsaved changes</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleReset}
                      disabled={isSaving || isSavingWelcomeMessage || isResetting || !organizationId}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Reset to Default
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || isSavingWelcomeMessage || isResetting || !hasPromptChanges || !selectedPromptId}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save System Prompt
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>
                  <strong>Be specific:</strong> Clearly define the AI's role, personality, and response style
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>
                  <strong>Set boundaries:</strong> Specify what the AI should and shouldn't do
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>
                  <strong>Include context:</strong> Add relevant information about the use case or domain
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>
                  <strong>Test thoroughly:</strong> After updating, test the AI's responses to ensure it behaves as expected
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

