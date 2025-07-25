<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/80" />
    <DialogContent class="p-0 border-none bg-transparent shadow-none [&>button:last-child]:hidden"
      @pointer-down-outside.prevent>
      <div class="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div class="text-center w-full">
          <!-- AI Avatar -->
          <div class="relative mb-8 flex justify-center">
            <div
              class="w-48 h-48 bg-gradient-to-r from-blue-400 to-blue-700 rounded-full flex items-center justify-center shadow-2xl mx-auto">
              <div v-if="callState === 'connecting'" class="animate-pulse">
                <Phone class="w-24 h-24 text-white" />
              </div>
              <div v-else-if="callState === 'active'" class="animate-bounce">
                <MessageSquare class="w-24 h-24 text-white" />
              </div>
            </div>
            <div v-if="callState === 'active'"
              class="absolute -inset-4 border-4 border-blue-300 rounded-full animate-ping opacity-20"></div>
          </div>

          <!-- Status -->
          <div class="mb-6">
            <h2 class="text-3xl font-bold text-white mb-2">
              <span v-if="callState === 'connecting'">Connecting...</span>
              <span v-else-if="callState === 'active'">Connected to AI Assistant</span>
              <span v-else-if="callState === 'ended'">Call Ended</span>
            </h2>
            <div v-if="callState === 'active'" class="flex items-center justify-center space-x-2 text-blue-200">
              <Clock class="w-5 h-5" />
              <span class="text-xl font-mono">{{ formatCallDuration(callDuration) }}</span>
            </div>
          </div>

          <!-- Controls -->
          <div v-if="callState === 'active'" class="flex items-center justify-center space-x-6 mb-8">
            <button @click="isMuted = !isMuted"
              :class="['w-14 h-14 rounded-full flex items-center justify-center transition-all', isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600']">
              <component :is="isMuted ? MicOff : Mic" class="w-6 h-6 text-white" />
            </button>
            <div class="flex items-center space-x-3">
              <button @click="adjustVolume(Math.max(0, volume - 10))"
                class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                <VolumeX class="w-4 h-4 text-white" />
              </button>
              <div class="w-24 bg-slate-600 rounded-full h-2">
                <div class="bg-blue-400 h-2 rounded-full transition-all duration-200" :style="{ width: volume + '%' }">
                </div>
              </div>
              <button @click="adjustVolume(Math.min(100, volume + 10))"
                class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                <Volume2 class="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <!-- End Call Button -->
          <div v-if="callState !== 'ended'" class="mb-4">
            <button @click="handleEndCall"
              class="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-red-300">
              End Call
            </button>
          </div>

          <!-- Ended State -->
          <div v-if="callState === 'ended'" class="text-blue-200">
            <p class="mb-4">Processing transcription...</p>
            <div class="w-8 h-8 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <button class="mt-6 px-6 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
              @click="onOpenChange(false)">Close</button>
          </div>
        </div>
      </div>
    </DialogContent>
  </n-dialog>
  <audio ref="remoteAudioRef" autoplay></audio>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Phone, MessageSquare, Mic, MicOff, Volume2, VolumeX, Clock } from 'lucide-vue-next'
import { NDialog, DialogContent, DialogOverlay } from '@/components/ui/dialog'

type CallState = 'connecting' | 'active' | 'ended'

interface Props {
  modelValue: boolean
  defaultState?: CallState
  autoEndCall?: boolean
  autoEndTimeout?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  defaultState: 'connecting',
  autoEndCall: false,
  autoEndTimeout: 30000,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'end'): void
}>()

const callState = ref<CallState>(props.defaultState)
const callDuration = ref(0)
const isMuted = ref(false)
let timer: ReturnType<typeof window.setInterval> | null = null
const remoteAudioRef = ref<HTMLAudioElement | null>(null)

// Timer management functions
const startTimer = () => {
  callDuration.value = 0
  if (timer) {
    clearInterval(timer)
  }
  timer = setInterval(() => {
    callDuration.value++
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// Reset state when dialog opens
watch(() => props.modelValue, (newOpen) => {
  if (newOpen) {
    callState.value = props.defaultState
    callDuration.value = 0
    isMuted.value = false
    // Reset remote audio
    if (remoteAudioRef.value) {
      remoteAudioRef.value.srcObject = null
    }
  }
})

watch([() => callState.value, () => props.autoEndCall], ([newCallState, autoEndCall]) => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  if (newCallState === 'active') {
    timer = setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  if (autoEndCall && newCallState === 'active') {
    setTimeout(() => {
      callState.value = 'ended'
      emit('end')
    }, props.autoEndTimeout)
  }
})

onUnmounted(() => {
  stopTimer()
})

const handleEndCall = () => {
  callState.value = 'ended'
  emit('end')
  stopTimer()
  setTimeout(() => emit('update:modelValue', false), 1000)
}

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const onOpenChange = (value: boolean) => {
  emit('update:modelValue', value)
}

// Add volume state and adjustVolume method
const volume = ref(80)
const adjustVolume = (newVolume: number) => {
  volume.value = Math.max(0, Math.min(100, newVolume))
}

// Expose methods and refs for parent component
defineExpose({
  callState,
  startTimer,
  stopTimer,
  remoteAudioRef,
  isMuted
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
