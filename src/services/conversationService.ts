import axiosInstance from './axiosInstance'
import type { Conversation } from '@/types/conversation'

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await axiosInstance.get<Conversation[]>('/conversations')
    return response.data
  },

  async getConversationById(id: string): Promise<Conversation> {
    const response = await axiosInstance.get<Conversation>(`/conversations/${id}`)
    return response.data
  }
}
