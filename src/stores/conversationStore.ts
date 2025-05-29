import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversation } from '@/types/conversation'
import { conversationService } from '@/services/conversationService'
import { mockConversation } from '@/mocks/conversation'

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
    async fetchRecentConversations(limit: number = 5) {
      this.loading = true
      this.error = null
      try {
        const response = await conversationService.getConversations() as ConversationResponse
        // Ensure data is an array and sort by created_at in descending order
        const sortedData = Array.isArray(response.conversations) ? response.conversations : []
        this.conversations = sortedData
          .sort((a: Conversation, b: Conversation) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, limit)

        // Update pagination data
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (id === '1') {
          this.currentConversation = mockConversation
        } else {
          throw new Error('Conversation not found')
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to fetch conversation'
        this.currentConversation = null
      } finally {
        this.loading = false
      }
    }
  }
})
