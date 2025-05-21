import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversation } from '@/types/conversation'
import { conversationService } from '@/services/conversationService'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRecentConversations(limit: number = 5) {
    loading.value = true
    error.value = null
    try {
      const data = await conversationService.getConversations()
      // Ensure data is an array and sort by created_at in descending order
      const sortedData = Array.isArray(data) ? data : []
      conversations.value = sortedData
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
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
    fetchRecentConversations
  }
})
