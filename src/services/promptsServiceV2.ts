import { getAxiosInstanceV2 } from './axiosInstanceV2'

export interface SystemPromptV2 {
  _id?: string
  content: string
  version: number
  active?: boolean
  voice_id?: string
  voice_instruction?: string
  initial_message?: string
  silence_timeout?: number
  response_delay?: number
  min_volume?: number
  wad_threshold?: number
  idle_timeout?: number
  max_idle_attempts?: number
  created_at?: string
}

// Note: This endpoint is for BOT use only (requires API Key, not JWT)
// Users should use listPromptsV2() and filter for active prompt
export const getActivePromptV2 = async (): Promise<SystemPromptV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<SystemPromptV2>('/prompts/active')
  return response.data
}

export const listPromptsV2 = async (): Promise<SystemPromptV2[]> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<SystemPromptV2[]>('/prompts/')
  return response.data
}

export const createPromptV2 = async (prompt: SystemPromptV2): Promise<SystemPromptV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.post<SystemPromptV2>('/prompts/', prompt)
  return response.data
}

// Note: API v2 may not have PATCH endpoint for prompts
// Creating a new prompt with active=true will deactivate others
export const updatePromptV2 = async (promptId: string, prompt: Partial<SystemPromptV2>): Promise<SystemPromptV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  // TODO: Update when API v2 supports PATCH /prompts/{prompt_id}
  // For now, create a new prompt with active=true to replace the old one
  const response = await axiosInstance.patch<SystemPromptV2>(`/prompts/${promptId}`, prompt)
  return response.data
}
