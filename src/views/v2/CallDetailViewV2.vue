<script setup lang="ts">
import { onMounted, ref, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCallV2 } from '@/services/callsServiceV2'
import type { CallResponseV2 } from '@/services/callsServiceV2'
import { formatDistanceToNow } from 'date-fns'
import { NBadge } from '@/components/ui/badge'
import { NCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { Bot, Play, Pause, Rewind, FastForward, Download, ArrowLeft, Phone, Clock, Loader2, User } from 'lucide-vue-next'
import type { TranscriptSegment } from '@/services/callsServiceV2'
import WaveSurfer from 'wavesurfer.js'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const call = ref<CallResponseV2 | null>(null)
const wavesurfer = ref<WaveSurfer | null>(null)
const isPlaying = ref(false)
const waveformRef = ref<HTMLElement | null>(null)
const audioDuration = ref(0)
const currentTime = ref(0)
const loading = ref(false)

const loadCall = async () => {
  try {
    loading.value = true
    const callId = route.params.id as string
    call.value = await getCallV2(callId)
  } catch (error) {
    console.error('Error loading call:', error)
    toast.error('Error loading call', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    loading.value = false
    if (call.value?.recording_url) {
      await nextTick()
      initWaveSurfer()
    }
  }
}

const initWaveSurfer = () => {
  if (!waveformRef.value) {
    console.warn('WaveSurfer initialization failed: Missing waveformRef')
    return
  }

  if (!call.value?.recording_url) {
    console.warn('WaveSurfer initialization failed: Missing recording_url')
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
    url: call.value.recording_url,
  })

  wavesurfer.value.on('timeupdate', (time: number) => {
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

const handleDownload = async () => {
  if (!call.value?.recording_url) return

  try {
    const response = await fetch(call.value.recording_url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call-recording-${call.value.id}.wav`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading audio:', error)
    toast.error('Error downloading audio', {
      description: 'Please try again later',
      duration: 3000,
    })
  }
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

const formatDuration = (start: string, end?: string | null, durationSeconds?: number) => {
  if (durationSeconds !== undefined && durationSeconds > 0) {
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = Math.floor(durationSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  if (!end) return 'Ongoing'
  try {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const seconds = Math.floor((endTime - startTime) / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  } catch {
    return '-'
  }
}

const getMoodText = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive':
      return 'Positive'
    case 'negative':
      return 'Negative'
    case 'unknown':
      return 'Unknown'
    case 'neutral':
      return 'Neutral'
    default:
      return sentiment || 'Unknown'
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'system':
      return 'System'
    case 'user':
      return 'Customer'
    case 'assistant':
      return 'AI Assistant'
    case 'tool':
      return 'Tool'
    default:
      return role
  }
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'assistant':
    case 'system':
      return Bot
    case 'user':
      return User
    default:
      return User
  }
}

const formatTimestamp = (timestamp: number) => {
  const minutes = Math.floor(timestamp / 60)
  const seconds = Math.floor(timestamp % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Filter out empty messages and system messages for display
const visibleTranscript = (transcript?: TranscriptSegment[]) => {
  if (!transcript) return []
  return transcript.filter(msg => msg.content && msg.content.trim() !== '')
}

const goBack = () => {
  router.push('/v2/calls')
}

onMounted(() => {
  loadCall()
})

onUnmounted(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy()
  }
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header class="sticky top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10">
      <div class="flex items-center gap-4 mb-4">
        <n-button variant="ghost" size="icon" @click="goBack" class="flex-shrink-0">
          <ArrowLeft class="h-5 w-5" />
        </n-button>
        <div class="grid gap-1">
          <h1 class="text-xl font-bold">Call Details</h1>
        </div>
      </div>
      <div v-if="loading" class="text-center py-8">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
        <p class="text-sm text-gray-500">Loading call details...</p>
      </div>
      <div v-else-if="call && call.recording_url" class="space-y-4">
        <div ref="waveformRef" class="w-full"></div>
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
          <button @click="handleDownload" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Download audio">
            <Download class="h-6 w-6" />
          </button>
        </div>
        <div class="flex justify-center text-sm text-muted-foreground">
          <span>{{ formatTime(currentTime) }} / {{ formatTime(audioDuration) }}</span>
        </div>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div v-if="loading" class="text-center py-8">
        <Loader2 class="h-8 w-8 animate-spin mx-auto" />
      </div>
      <div v-else-if="!call" class="text-center py-8 text-gray-500">
        Call not found
      </div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <!-- Column 1: Call Details -->
        <div class="md:col-span-1">
          <n-card>
            <CardHeader>
              <CardTitle>Call Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-sm space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground flex items-center gap-1">
                    <Clock class="h-4 w-4" />
                    Time:
                  </span>
                  <span>{{ formatDate(call.start_time) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground flex items-center gap-1">
                    <Phone class="h-4 w-4" />
                    Customer Phone:
                  </span>
                  <span class="font-medium">{{ call.customer_phone || 'Unknown' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Call ID:</span>
                  <span class="font-mono text-xs">{{ call.call_id }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Start Time:</span>
                  <span>{{ new Date(call.start_time).toLocaleString() }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">End Time:</span>
                  <span>{{ call.end_time ? new Date(call.end_time).toLocaleString() : 'Ongoing' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Duration:</span>
                  <span class="font-medium">{{ formatDuration(call.start_time, call.end_time, call.duration_seconds)
                    }}</span>
                </div>
                <div v-if="call.sentiment" class="flex items-center justify-between">
                  <span class="text-muted-foreground">Sentiment:</span>
                  <n-badge class="text-xs" :class="{ 'bg-green-500': call.sentiment === 'positive' }"
                    :variant="call.sentiment === 'positive' ? 'default' : call.sentiment === 'negative' ? 'destructive' : 'outline'">
                    {{ getMoodText(call.sentiment) }}
                  </n-badge>
                </div>
                <div v-if="call.summary" class="mt-4">
                  <h4 class="font-medium mb-2">Summary</h4>
                  <div class="p-3 rounded-lg bg-muted">
                    {{ call.summary }}
                  </div>
                </div>
              </div>
            </CardContent>
          </n-card>
        </div>

        <!-- Column 2: Transcript -->
        <div class="md:col-span-1">
          <n-card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="call.transcript && visibleTranscript(call.transcript).length > 0"
                class="space-y-4 max-h-[600px] overflow-y-auto">
                <div v-for="(message, index) in visibleTranscript(call.transcript)" :key="index" :class="[
                  'flex space-x-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                ]">
                  <div v-if="message.role !== 'user'"
                    class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    <component :is="getRoleIcon(message.role)" class="h-4 w-4" />
                  </div>
                  <div :class="[
                    'flex flex-col max-w-[70%]',
                    message.role === 'user' ? 'items-end' : 'items-start'
                  ]">
                    <span class="text-xs font-medium text-muted-foreground mb-1">
                      {{ getRoleLabel(message.role) }}
                    </span>
                    <div :class="[
                      'p-3 rounded-lg',
                      message.role === 'user'
                        ? message.sentiment === 'positive'
                          ? 'bg-green-500 text-white'
                          : message.sentiment === 'negative'
                            ? 'bg-red-500 text-white'
                            : 'bg-blue-500 text-white'
                        : message.sentiment === 'positive'
                          ? 'bg-green-500 text-white'
                          : message.sentiment === 'negative'
                            ? 'bg-red-500 text-white'
                            : 'bg-muted'
                    ]">
                      <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
                    </div>
                    <div class="flex items-center mt-1 gap-2" :class="[
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    ]">
                      <n-badge class="text-xs" :class="{ 'bg-green-500': message.sentiment === 'positive' }"
                        :variant="message.sentiment === 'positive' ? 'default' : message.sentiment === 'negative' ? 'destructive' : 'outline'">
                        {{ getMoodText(message.sentiment) }}
                      </n-badge>
                      <span class="text-xs text-muted-foreground">{{ formatTimestamp(message.timestamp) }}</span>
                    </div>
                  </div>
                  <div v-if="message.role === 'user'"
                    class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    <User class="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div v-else class="flex items-center justify-center h-[200px] text-muted-foreground">
                No transcript available
              </div>
            </CardContent>
          </n-card>
        </div>
      </div>
    </main>
  </div>
</template>
