import axiosInstance from './axiosInstance'
import type { Conversation, ConversationResponse } from '@/types/conversation'

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
