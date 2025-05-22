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

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<PaginationData>({
    page_number: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 1
  })

  async function fetchRecentConversations(limit: number = 5) {
    loading.value = true
    error.value = null
    try {
      const response = await conversationService.getConversations() as ConversationResponse
      // Ensure data is an array and sort by created_at in descending order
      const sortedData = Array.isArray(response.conversations) ? response.conversations : []
      conversations.value = sortedData
        .sort((a: Conversation, b: Conversation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, limit)

      // Update pagination data
      if (response.pagination) {
        pagination.value = response.pagination
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch conversations'
    } finally {
      loading.value = false
    }
  }

  return {
    conversations,
    loading,
    error,
    pagination,
    fetchRecentConversations
  }
})
