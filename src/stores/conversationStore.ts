import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversation } from '@/types/conversation'
import { conversationService } from '@/services/conversationService'

interface PaginationData {
  page_number: number
  page_size: number
  total_items: number
  total_pages: number
}

interface ConversationResponse {
  pagination: PaginationData
  conversations: Conversation[]
}

export const useConversationStore = defineStore('conversation', {
  state: () => ({
    conversations: ref<Conversation[]>([]),
    currentConversation: null as Conversation | null,
    loading: ref(false),
    error: ref<string | null>(null),
    pagination: ref<PaginationData>({
      page_number: 1,
      page_size: 10,
      total_items: 0,
      total_pages: 1
    })
  }),

  actions: {
    async fetchRecentConversations(page: number = 1, size: number = 10) {
      this.loading = true
      this.error = null
      try {
        const response = await conversationService.getConversations(page, size) as ConversationResponse
        this.conversations = response.conversations
        if (response.pagination) {
          this.pagination = response.pagination
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch conversations'
      } finally {
        this.loading = false
      }
    },

    async fetchConversationById(id: string) {
      this.loading = true
      this.error = null

      try {
        const response = await conversationService.getConversationById(id)
        this.currentConversation = response
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch conversation'
        this.currentConversation = null
      } finally {
        this.loading = false
      }
    }
  }
})
