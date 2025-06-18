<script setup lang="ts">
import { onMounted, ref, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import { NBadge } from '@/components/ui/badge'
import type { Conversation, Message } from '@/types/conversation'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { Bot, Play, Pause, Rewind, FastForward } from 'lucide-vue-next'
import WaveSurfer from 'wavesurfer.js'

const route = useRoute()
const conversationStore = useConversationStore()
const conversation = ref<Conversation | null>(null)
const wavesurfer = ref<WaveSurfer | null>(null)
const currentMessageIndex = ref(-1)
const isPlaying = ref(false)
const waveformRef = ref<HTMLElement | null>(null)
const audioDuration = ref(0)
const currentTime = ref(0)

onMounted(async () => {
  const conversationId = route.params.id as string
  await conversationStore.fetchConversationById(conversationId)
  if (conversationStore.currentConversation) {
    conversation.value = conversationStore.currentConversation
    await nextTick()
    initWaveSurfer()
  }
})

const initWaveSurfer = () => {
  if (!waveformRef.value) {
    console.warn('WaveSurfer initialization failed: Missing waveformRef')
    return
  }

  if (!conversation.value?.record_url) {
    console.warn('WaveSurfer initialization failed: Missing record_url')
    return
  }

  wavesurfer.value = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#1dcdff',
    progressColor: '#1d5cff',
    cursorColor: '#1dcdff',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 50,
    barGap: 3,
    url: conversation.value.record_url,
  })

  wavesurfer.value.on('timeupdate', (time: number) => {
    if (!conversation.value?.messages) return

    // Find the current message based on time
    const messageIndex = conversation.value.messages.findIndex(
      (message) => message.start_time <= time && message.end_time >= time
    )

    if (messageIndex !== -1 && messageIndex !== currentMessageIndex.value) {
      currentMessageIndex.value = messageIndex
    }
    currentTime.value = time
  })

  wavesurfer.value.on('play', () => {
    isPlaying.value = true
  })

  wavesurfer.value.on('pause', () => {
    isPlaying.value = false
  })

  wavesurfer.value.on('ready', () => {
    audioDuration.value = wavesurfer.value?.getDuration() || 0
  })
}

const togglePlay = () => {
  if (!wavesurfer.value) return
  wavesurfer.value.playPause()
}

const skipBackward = () => {
  if (!wavesurfer.value) return
  wavesurfer.value.skip(-5)
}

const skipForward = () => {
  if (!wavesurfer.value) return
  wavesurfer.value.skip(5)
}

const handleMessageClick = (message: Message) => {
  if (wavesurfer.value && message.start_time !== undefined) {
    wavesurfer.value.setTime(message.start_time)
  }
}

onUnmounted(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }
})

const getMoodText = (mood: string) => {
  switch (mood) {
    case 'positive':
      return 'Positive'
    case 'negative':
      return 'Negative'
    case 'unknown':
      return 'Unknown'
    case 'neutral':
      return 'Neutral'
    default:
      return mood
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'start':
      return 'Started'
    case 'accept':
      return 'Accepted'
    case 'decline':
      return 'Declined'
    case 'closed':
      return 'Closed'
    default:
      return status
  }
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatMessageTime = (startTime: number, endTime: number) => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

const moodSegments = computed(() => {
  if (!conversation.value?.messages || !audioDuration.value) return []
  return conversation.value.messages
    .filter(msg => msg.mood === 'positive' || msg.mood === 'negative')
    .map(msg => {
      const left = (msg.start_time / audioDuration.value) * 100
      const width = ((msg.end_time - msg.start_time) / audioDuration.value) * 100
      return {
        left: `${left}%`,
        width: `${width}%`,
        color: msg.mood === 'positive' ? '#22c55e' : '#ef4444', // green or red
      }
    })
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <header class="sticky top-[64px] left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10">
      <div class="grid gap-1 mb-4">
        <h1 class="text-xl font-bold">Call Details</h1>
      </div>
      <div v-if="conversation" class="space-y-4">
        <div ref="waveformRef" class="w-full"></div>
        <div class="relative w-full h-3 mt-2">
          <template v-for="(segment, idx) in moodSegments" :key="idx">
            <div class="absolute h-full rounded" :style="{
              left: segment.left,
              width: segment.width,
              backgroundColor: segment.color,
              opacity: 0.7
            }"></div>
          </template>
        </div>
        <div class="flex justify-center items-center gap-4">
          <button @click="skipBackward" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <Rewind class="h-6 w-6" />
          </button>
          <button @click="togglePlay" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <component :is="isPlaying ? Pause : Play" class="h-6 w-6" />
          </button>
          <button @click="skipForward" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <FastForward class="h-6 w-6" />
          </button>
        </div>
        <div class="flex justify-center text-sm text-muted-foreground">
          <span>{{ formatTime(currentTime) }} / {{ formatTime(audioDuration) }}</span>
        </div>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div v-if="conversation" class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <!-- Column 1: Call Details -->
        <div class="md:col-span-1">
          <div class="bg-card rounded-lg border p-4">
            <h3 class="font-semibold mb-4">Call Information</h3>
            <div class="text-sm space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Time:</span>
                <span>{{ formatDate(conversation.created_at) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">From:</span>
                <div class="text-right">
                  <div class="flex items-center gap-1">
                    {{ conversation.from_user.fullname }}
                    <Bot v-if="conversation.from_user.email === 'ai@gmail.com'" class="h-4 w-4" />
                  </div>
                  <div class="text-xs text-muted-foreground">{{ conversation.from_user.email }}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">To:</span>
                <div class="text-right">
                  <div class="flex items-center gap-1">
                    {{ conversation.to_user.fullname }}
                    <Bot v-if="conversation.to_user.email === 'ai@gmail.com'" class="h-4 w-4" />
                  </div>
                  <div class="text-xs text-muted-foreground">{{ conversation.to_user.email }}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Status:</span>
                <n-badge class="text-xs" :variant="conversation.status === 'closed' ? 'default' :
                  conversation.status === 'decline' ? 'destructive' :
                    conversation.status === 'accept' ? 'default' : 'outline'">
                  {{ getStatusText(conversation.status) }}
                </n-badge>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Sentiment:</span>
                <n-badge class="text-xs" :class="{ 'bg-green-500': conversation.sentiment === 'positive' }"
                  :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                  {{ getMoodText(conversation.sentiment) }}
                </n-badge>
              </div>
              <div class="mt-4">
                <h4 class="font-medium mb-2">Summary</h4>
                <div class="p-3 rounded-lg bg-muted">
                  {{ conversation.summarize || 'No summary available' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Messages -->
        <div class="md:col-span-1">
          <div class="bg-card rounded-lg border p-4 h-full">
            <h3 class="font-semibold mb-4">Transcription</h3>
            <div class="space-y-4">
              <div v-if="conversationStore.loading"
                class="flex items-center justify-center h-[200px] text-muted-foreground">
                Loading conversation...
              </div>
              <div
                v-else-if="!conversation.messages || conversation.messages.length === 0 || (conversation.messages[0] && conversation.messages[0].content === 'Không thể nghe được nội dung hoặc nội dung không có ý nghĩa')"
                class="flex items-center justify-center h-[200px] text-muted-foreground">
                No conversation details available
              </div>
              <div v-else v-for="(message, index) in conversation.messages" :key="message.id" :class="[
                'flex space-x-2 cursor-pointer hover:bg-muted/30 transition-colors',
                message.sender_id.id === conversation.from_user.id ? 'justify-end' : 'justify-start',
                index === currentMessageIndex ? 'bg-muted/50 rounded-lg p-2' : ''
              ]" @click="handleMessageClick(message)">
                <div v-if="message.sender_id.id !== conversation.from_user.id"
                  class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  <Bot v-if="message.sender_id.email === 'ai@gmail.com'" class="h-4 w-4" />
                  <template v-else>{{ message.sender_id.fullname.charAt(0) }}</template>
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
                        ? 'bg-green-500 text-white'
                        : message.mood === 'negative'
                          ? 'bg-red-500 text-white'
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
                    <span class="text-xs text-muted-foreground">{{ formatMessageTime(message.start_time,
                      message.end_time) }}</span>
                  </div>
                </div>
                <div v-if="message.sender_id.id === conversation.from_user.id"
                  class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  <Bot v-if="message.sender_id.email === 'ai@gmail.com'" class="h-4 w-4" />
                  <template v-else>{{ message.sender_id.fullname.charAt(0) }}</template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
