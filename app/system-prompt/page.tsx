"use client"

import { useCallback, useEffect, useState } from "react"
import { systemPromptService, type SystemPrompt } from "@/lib/supabase-services"
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

export default function SystemPromptPage() {
  const [prompt, setPrompt] = useState("")
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [selectedKey, setSelectedKey] = useState<string>("default")
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPromptName, setNewPromptName] = useState("")
  const [newPromptText, setNewPromptText] = useState("")

  const loadPrompts = useCallback(async (preserveSelection: boolean = true) => {
    setIsLoadingPrompts(true)
    try {
      const allPrompts = await systemPromptService.getAll()
      setPrompts(allPrompts)
      
      // If no prompt is selected or selected prompt doesn't exist, select default
      if (preserveSelection) {
        setSelectedKey((currentKey) => {
          if (!currentKey || !allPrompts.find(p => p.key === currentKey)) {
            const defaultPrompt = allPrompts.find(p => p.key === 'default') || allPrompts[0]
            return defaultPrompt?.key || 'default'
          }
          return currentKey
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Failed to load prompts:", err)
      // Don't set error state here, just log it
    } finally {
      setIsLoadingPrompts(false)
    }
  }, [])

  const loadPrompt = useCallback(async (key: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const promptText = await systemPromptService.get(key)
      setPrompt(promptText)
      setOriginalPrompt(promptText)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to load system prompt: ${errorMessage}`)
      console.error("Failed to load system prompt:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  useEffect(() => {
    if (selectedKey) {
      loadPrompt(selectedKey)
    }
  }, [selectedKey, loadPrompt])

  const handleSave = useCallback(async () => {
    if (prompt === originalPrompt) {
      setMessage({ type: "error", text: "No changes to save" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsSaving(true)
    setError(null)
    setMessage(null)

    try {
      const currentPrompt = prompts.find(p => p.key === selectedKey)
      const isDefault = currentPrompt?.is_default || selectedKey === 'default'
      await systemPromptService.updateByKey(selectedKey, prompt, isDefault)
      setOriginalPrompt(prompt)
      await loadPrompts() // Refresh the prompts list
      setMessage({ type: "success", text: "System prompt updated successfully!" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to save system prompt: ${errorMessage}`)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }, [prompt, originalPrompt, selectedKey, prompts, loadPrompts])

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
      const created = await systemPromptService.create(newPromptName, newPromptText, false)
      await loadPrompts() // Refresh the prompts list
      setSelectedKey(created.key) // Switch to the newly created prompt
      setIsCreateDialogOpen(false)
      setNewPromptName("")
      setNewPromptText("")
      setMessage({ type: "success", text: `Prompt "${newPromptName}" created successfully!` })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to create prompt: ${errorMessage}`)
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsCreating(false)
    }
  }, [newPromptName, newPromptText, loadPrompts])

  const handlePromptChange = useCallback((key: string) => {
    if (key === "__create_new__") {
      setIsCreateDialogOpen(true)
      // Don't update selectedKey, keep the current selection
      return
    }
    // Only change if it's different to avoid unnecessary reloads
    if (key !== selectedKey) {
      setSelectedKey(key)
    }
  }, [selectedKey])

  const handleReset = useCallback(async () => {
    if (!confirm("Are you sure you want to reset the system prompt to default? This cannot be undone.")) {
      return
    }

    setIsResetting(true)
    setError(null)
    setMessage(null)

    try {
      await systemPromptService.reset()
      setSelectedKey('default')
      await loadPrompt('default') // Reload to get the default prompt
      await loadPrompts() // Refresh the prompts list
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
  }, [loadPrompt, loadPrompts])

  const hasChanges = prompt !== originalPrompt
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length
  const charCount = prompt.length

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Prompt</h1>
          <p className="mt-1 text-gray-600">Configure the AI system prompt used for voice interactions</p>
        </div>

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
            <CardTitle>Edit System Prompt</CardTitle>
            <CardDescription>
              This prompt defines the AI assistant's behavior, personality, and instructions for voice interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
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
                  <div className="flex gap-2">
                    <Select
                      value={selectedKey}
                      onValueChange={handlePromptChange}
                      disabled={isLoadingPrompts}
                    >
                      <SelectTrigger id="prompt-select" className="flex-1">
                        <SelectValue placeholder="Select a prompt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts.map((p) => (
                          <SelectItem key={p.id} value={p.key}>
                            <div className="flex items-center gap-2">
                              <span>{p.key}</span>
                              {p.is_default && (
                                <span className="text-xs text-gray-500">(Default)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__" className="text-blue-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span>Create New Prompt</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
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
                            Create a new system prompt with a custom name. The name will be converted to a URL-friendly key.
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
                            <p className="text-xs text-gray-500">
                              Enter a descriptive name for this prompt
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
                  />
                  <p className="text-xs text-gray-500">
                    The system prompt will be used to guide the AI's responses during voice conversations.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <span className="text-xs text-amber-600 font-medium">You have unsaved changes</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleReset}
                      disabled={isSaving || isResetting || isLoading}
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
                      disabled={isSaving || isResetting || isLoading || !hasChanges}
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
                          Save Changes
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

