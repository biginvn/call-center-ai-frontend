import axiosInstance from './axiosInstance'
import type { Conversation, ConversationResponse } from '@/types/conversation'


export const conversationService = {
  async getConversations(page: number = 1, size: number = 10): Promise<ConversationResponse> {
    const response = await axiosInstance.get<ConversationResponse>(`/conversations/?page=${page}&size=${size}`)
    return response.data
  },

  async getConversationById(id: string): Promise<Conversation> {
    const response = await axiosInstance.get<Conversation>(`/conversations/${id}`)
    return response.data
  },

}
