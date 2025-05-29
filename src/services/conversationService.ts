import axiosInstance from './axiosInstance'
import type { Conversation, ConversationResponse } from '@/types/conversation'

interface SessionResponse {
  id: string
  object: string
  model: string
  modalities: string[]
  instructions: string
  voice: string
  input_audio_format: string
  output_audio_format: string
  input_audio_transcription: {
    model: string
  }
  turn_detection: {
    create_response: boolean
    interrupt_response: boolean
    eagerness: string
    prefix_padding_ms: number
    silence_duration_ms: number
    threshold: number
  }
  tools: Record<string, unknown>[]
  tool_choice: string
  temperature: number
  max_response_output_tokens: string
  client_secret: {
    value: string
    expires_at: number
  }
}

export const conversationService = {
  async getConversations(): Promise<ConversationResponse> {
    const response = await axiosInstance.get<ConversationResponse>('/conversations/')
    return response.data
  },

  async getConversationById(id: string): Promise<Conversation> {
    const response = await axiosInstance.get<Conversation>(`/conversations/${id}`)
    return response.data
  },

  async getSession(instructions: string): Promise<SessionResponse> {
    const response = await axiosInstance.post<SessionResponse>('/realtime/session', {
      instructions
    })
    return response.data
  }
}
