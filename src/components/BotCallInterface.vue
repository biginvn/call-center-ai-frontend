<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/80" />
    <DialogContent
      class="p-0 !w-screen min-h-screen sm:max-w-none bg-gradient-to-br from-slate-900 to-blue-900 border-none [&>button:last-child]:hidden"
      @pointer-down-outside.prevent>
      <div class=" flex items-center justify-center">
        <div class="text-center w-full">
          <!-- AI Avatar -->
          <div class="relative mb-8 flex justify-center">
            <div
              class="w-48 h-48 rounded-full flex items-center justify-center shadow-2xl mx-auto overflow-hidden bg-gradient-to-r from-blue-400 to-blue-700">
              <img src="/src/assets/Diallog.png" alt="AI Avatar" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Status -->
          <div class="mb-6">
            <h2 class="text-3xl font-bold text-white mb-2">
              <span v-if="callState === 'connecting'">Connecting...</span>
              <span v-else-if="callState === 'active'">DialoggAI Voicebot</span>
              <span v-else-if="callState === 'ended'">Call Ended</span>
            </h2>
            <div v-if="callState === 'active'" class="flex items-center justify-center space-x-2 text-blue-200">
              <Clock class="w-5 h-5" />
              <span class="text-xl">{{ formatCallDuration(callDuration) }}</span>
            </div>
          </div>

          <!-- Controls -->
          <div v-if="callState === 'active'" class="flex items-center justify-center space-x-6 mb-8">
            <button @click="isMuted = !isMuted"
              :class="['w-14 h-14 rounded-full flex items-center justify-center transition-all', isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600']">
              <component :is="isMuted ? MicOff : Mic" class="w-6 h-6 text-white" />
            </button>
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
            <p class="mb-4">Ending call...</p>
            <div class="w-8 h-8 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    </DialogContent>
  </n-dialog>
  <audio ref="remoteAudioRef" autoplay></audio>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Mic, MicOff, Clock } from 'lucide-vue-next'
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


// Expose methods and refs for parent component
defineExpose({
  callState,
  startTimer,
  stopTimer,
  remoteAudioRef,
  isMuted,
  callDuration
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
