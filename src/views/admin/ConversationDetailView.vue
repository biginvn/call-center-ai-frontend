<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import { NBadge } from '@/components/ui/badge'
import { NDialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Conversation } from '@/types/conversation'

const route = useRoute()
const conversationStore = useConversationStore()
const conversation = ref<Conversation | null>(null)

onMounted(async () => {
  const conversationId = route.params.id as string
  await conversationStore.fetchConversationById(conversationId)
  if (conversationStore.currentConversation) {
    conversation.value = conversationStore.currentConversation
  }
})

const getMoodText = (mood: string) => {
  switch (mood) {
    case 'positive':
      return 'Tích cực'
    case 'negative':
      return 'Tiêu cực'
    case 'unknown':
      return 'Không xác định'
    case 'neutral':
      return 'Trung tính'
    default:
      return mood
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'start':
      return 'Bắt đầu'
    case 'accept':
      return 'Trả lời'
    case 'decline':
      return 'Từ chối'
    case 'closed':
      return 'Đã đóng'
    default:
      return status
  }
}
</script>

<template>
  <n-dialog :open="true" class="!p-0 !m-0 !max-w-none md:!max-w-[90vw] !w-screen md:!w-[90vw] !h-screen md:!h-[90vh]">
    <DialogContent
      class="!p-0 !m-0 !max-w-none !w-screen md:!w-[90vw] !h-screen md:!h-[90vh] flex flex-col [&>button:last-child]:hidden">
      <DialogHeader class="p-4 md:p-6 border-b flex-shrink-0">
        <DialogTitle>Chi tiết cuộc gọi</DialogTitle>
      </DialogHeader>
      <div v-if="conversation && conversation.record_url" class="px-4 md:px-6 flex-shrink-0">
        <audio :src="conversation.record_url" controls class="w-full"></audio>
      </div>
      <div v-if="conversation" class="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 p-4 lg:p-6 flex-1 min-h-0">
        <!-- Column 1: Call Details -->
        <div class="md:col-span-1 overflow-y-auto">
          <div class="h-full">
            <h3 class="font-semibold mb-1 sticky top-0 bg-background pt-1">Thông tin cuộc gọi</h3>
            <div class="text-sm space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Thời gian:</span>
                <span>{{ formatDate(conversation.created_at) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Từ:</span>
                <div class="text-right">
                  <div>{{ conversation.from_user.fullname }}</div>
                  <div class="text-xs text-muted-foreground">{{ conversation.from_user.email }}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Đến:</span>
                <div class="text-right">
                  <div>{{ conversation.to_user.fullname }}</div>
                  <div class="text-xs text-muted-foreground">{{ conversation.to_user.email }}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Trạng thái:</span>
                <n-badge class="text-xs" :variant="conversation.status === 'closed' ? 'default' :
                  conversation.status === 'decline' ? 'destructive' :
                    conversation.status === 'accept' ? 'default' : 'outline'">
                  {{ getStatusText(conversation.status) }}
                </n-badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Messages -->
        <div class="md:col-span-2 overflow-y-auto">
          <div class="h-full">
            <h3 class="font-semibold mb-2 sticky top-0 bg-background pt-1">Tin nhắn</h3>
            <div class="space-y-4">
              <div v-if="conversationStore.loading"
                class="flex items-center justify-center h-[200px] text-muted-foreground">
                Đang tải cuộc hội thoại...
              </div>
              <div
                v-else-if="!conversation.messages || conversation.messages.length === 0 || (conversation.messages[0] && conversation.messages[0].content === 'Không thể nghe được nội dung hoặc nội dung không có ý nghĩa')"
                class="flex items-center justify-center h-[200px] text-muted-foreground">
                Không có chi tiết cuộc hội thoại
              </div>
              <div v-else v-for="message in conversation.messages" :key="message.id" :class="[
                'flex space-x-2',
                message.sender_id.id === conversation.from_user.id ? 'justify-end' : 'justify-start'
              ]">
                <div v-if="message.sender_id.id !== conversation.from_user.id"
                  class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {{ message.sender_id.fullname.charAt(0) }}
                </div>
                <div :class="[
                  'flex flex-col',
                  message.sender_id.id === conversation.from_user.id ? 'items-end' : 'items-start'
                ]">
                  <span class="text-sm font-medium">{{ message.sender_id.fullname }}</span>
                  <div :class="[
                    'p-3 rounded-lg max-w-[70%]',
                    message.sender_id.id === conversation.from_user.id
                      ? message.mood === 'positive'
                        ? 'bg-green-500 text-white'
                        : message.mood === 'negative'
                          ? 'bg-red-500 text-white'
                          : 'bg-muted'
                      : message.mood === 'positive'
                        ? 'bg-green-100 text-green-900'
                        : message.mood === 'negative'
                          ? 'bg-red-100 text-red-900'
                          : 'bg-muted'
                  ]">
                    <p class="text-sm">{{ message.content }}</p>
                  </div>
                  <div class="flex items-center space-x-2 mt-1">
                    <n-badge class="text-xs" :class="{ 'bg-green-500': message.mood === 'positive' }"
                      :variant="message.mood === 'positive' ? 'default' : message.mood === 'negative' ? 'destructive' : 'outline'">
                      {{ getMoodText(message.mood) }}
                    </n-badge>
                  </div>
                </div>
                <div v-if="message.sender_id.id === conversation.from_user.id"
                  class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {{ message.sender_id.fullname.charAt(0) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Summary -->
        <div class="md:col-span-2 overflow-y-auto">
          <div class="h-full">
            <h3 class="font-semibold mb-2 sticky top-0 bg-background pt-1">Tóm tắt</h3>
            <div class="p-4 rounded-lg bg-muted">
              {{ conversation.summarize || 'Không có tóm tắt' }}
            </div>
            <div>
              <h3 class="font-semibold pt-2 mb-2">Tâm trạng</h3>
              <n-badge class="text-xs"
                :variant="conversation.mood === 'positive' ? 'default' : conversation.mood === 'negative' ? 'destructive' : 'outline'">
                {{ getMoodText(conversation.mood) }}
              </n-badge>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </n-dialog>
</template>
