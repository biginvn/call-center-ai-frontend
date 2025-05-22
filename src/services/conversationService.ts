import axiosInstance from './axiosInstance'
import type { Conversation } from '@/types/conversation'

interface ConversationResponse {
  pagination: {
    page_number: number
    page_size: number
    total_items: number
    total_pages: number
  }
  conversations: Conversation[]
}

export const conversationService = {
  async getConversations(): Promise<ConversationResponse> {
    const response = await axiosInstance.get<ConversationResponse>('/conversations/')
    return response.data
  },

  async getConversationById(id: string): Promise<Conversation> {
    const response = await axiosInstance.get<Conversation>(`/conversations/${id}`)
    return response.data
  }
}
