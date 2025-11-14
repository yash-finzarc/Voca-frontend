import { supabase } from './supabase-client'

export interface SystemPrompt {
  id: string
  key: string
  prompt: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export const systemPromptService = {
  /**
   * Get all system prompts
   */
  async getAll(): Promise<SystemPrompt[]> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch system prompts: ${error.message}`)
      }

      return data || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Error fetching system prompts: ${errorMessage}`)
    }
  },

  /**
   * Get the default system prompt or a prompt by key
   */
  async get(key: string = 'default'): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('prompt')
        .eq('key', key)
        .single()

      if (error) {
        // If the key doesn't exist, try to get the default prompt
        if (key !== 'default') {
          const { data: defaultData, error: defaultError } = await supabase
            .from('system_prompts')
            .select('prompt')
            .eq('key', 'default')
            .single()

          if (defaultError) {
            throw new Error(`Failed to fetch system prompt: ${defaultError.message}`)
          }
          return defaultData?.prompt || ''
        }
        throw new Error(`Failed to fetch system prompt: ${error.message}`)
      }

      return data?.prompt || ''
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Error fetching system prompt: ${errorMessage}`)
    }
  },

  /**
   * Get a system prompt by key with full details
   */
  async getByKey(key: string): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('key', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw new Error(`Failed to fetch system prompt: ${error.message}`)
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Error fetching system prompt: ${errorMessage}`)
    }
  },

  /**
   * Create or update a system prompt
   */
  async upsert(key: string, prompt: string, isDefault: boolean = false): Promise<SystemPrompt> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .upsert(
          {
            key,
            prompt,
            is_default: isDefault,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          }
        )
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save system prompt: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from Supabase')
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Error saving system prompt: ${errorMessage}`)
    }
  },

  /**
   * Update the default system prompt
   */
  async update(prompt: string): Promise<SystemPrompt> {
    return this.upsert('default', prompt, true)
  },

  /**
   * Update a system prompt by key
   */
  async updateByKey(key: string, prompt: string, isDefault: boolean = false): Promise<SystemPrompt> {
    return this.upsert(key, prompt, isDefault)
  },

  /**
   * Create a new system prompt with a custom name/key
   */
  async create(name: string, prompt: string, isDefault: boolean = false): Promise<SystemPrompt> {
    // Convert name to a valid key (lowercase, replace spaces with hyphens)
    const key = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!key) {
      throw new Error('Invalid prompt name. Please use alphanumeric characters and spaces.')
    }

    // Check if key already exists
    const existing = await this.getByKey(key)
    if (existing) {
      throw new Error(`A prompt with the name "${name}" already exists. Please choose a different name.`)
    }

    return this.upsert(key, prompt, isDefault)
  },

  /**
   * Reset to the original default prompt
   * This restores the prompt to the initial default value from the database
   */
  async reset(): Promise<SystemPrompt> {
    try {
      // Restore to the original default prompt value
      // This matches the value from the initial INSERT statement
      const defaultPrompt = 'You are Voca, a helpful voice assistant...'
      return this.update(defaultPrompt)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Error resetting system prompt: ${errorMessage}`)
    }
  },
}

