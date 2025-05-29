<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import { NBadge } from '@/components/ui/badge'
import type { Conversation, Message } from '@/types/conversation'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'

const route = useRoute()
const conversationStore = useConversationStore()
const conversation = ref<Conversation | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const currentTime = ref(0)
const currentMessageIndex = ref(-1)

onMounted(async () => {
  const conversationId = route.params.id as string
  await conversationStore.fetchConversationById(conversationId)
  if (conversationStore.currentConversation) {
    conversation.value = conversationStore.currentConversation
  }
})

// Watch for audio time updates
watch(currentTime, (newTime) => {
  if (!conversation.value?.messages) return

  // Find the current message based on time
  const messageIndex = conversation.value.messages.findIndex(
    (message, index) => {
      const nextMessage = conversation.value?.messages[index + 1]
      return message.time <= newTime && (!nextMessage || nextMessage.time > newTime)
    }
  )

  if (messageIndex !== -1 && messageIndex !== currentMessageIndex.value) {
    currentMessageIndex.value = messageIndex
  }
})

const handleTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const handleMessageClick = (message: Message) => {
  if (audioRef.value && message.time) {
    audioRef.value.currentTime = message.time
  }
}

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

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Chi tiết cuộc gọi</h1>
      </div>

      <div v-if="conversation && conversation.record_url" class="mb-6">
        <audio :src="conversation.record_url" controls class="w-full" ref="audioRef"
          @timeupdate="handleTimeUpdate"></audio>
      </div>

      <div v-if="conversation" class="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        <!-- Column 1: Call Details -->
        <div class="md:col-span-1">
          <div class="bg-card rounded-lg border p-4">
            <h3 class="font-semibold mb-4">Thông tin cuộc gọi</h3>
            <div class="text-sm space-y-3">
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
        <div class="md:col-span-2">
          <div class="bg-card rounded-lg border p-4 h-full">
            <h3 class="font-semibold mb-4">Tin nhắn</h3>
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
              <div v-else v-for="(message, index) in conversation.messages" :key="message.id" :class="[
                'flex space-x-2 cursor-pointer hover:bg-muted/30 transition-colors',
                message.sender_id.id === conversation.from_user.id ? 'justify-end' : 'justify-start',
                index === currentMessageIndex ? 'bg-muted/50 rounded-lg p-2' : ''
              ]" @click="handleMessageClick(message)">
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
                  <div class="flex items-center mt-1" :class="[
                    message.sender_id.id === conversation.from_user.id ? 'flex-row-reverse gap-2' : 'flex-row space-x-2'
                  ]">
                    <n-badge class="text-xs" :class="{ 'bg-green-500': message.mood === 'positive' }"
                      :variant="message.mood === 'positive' ? 'default' : message.mood === 'negative' ? 'destructive' : 'outline'">
                      {{ getMoodText(message.mood) }}
                    </n-badge>
                    <span class="text-xs text-muted-foreground">{{ formatTime(message.time) }}</span>
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
        <div class="md:col-span-2">
          <div class="bg-card rounded-lg border p-4 h-full">
            <h3 class="font-semibold mb-4">Tóm tắt</h3>
            <div class="p-4 rounded-lg bg-muted mb-4">
              {{ conversation.summarize || 'Không có tóm tắt' }}
            </div>
            <div>
              <h3 class="font-semibold mb-2">Tâm trạng</h3>
              <n-badge class="text-xs"
                :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                {{ getMoodText(conversation.sentiment) }}
              </n-badge>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
