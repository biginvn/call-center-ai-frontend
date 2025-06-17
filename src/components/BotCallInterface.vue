<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/200" />
    <DialogContent class="sm:max-w-md p-0 border-none bg-transparent shadow-none [&>button:last-child]:hidden"
      @pointer-down-outside.prevent>
      <DialogTitle class="sr-only">AI Assistant - {{ getCallStateText }}</DialogTitle>
      <DialogDescription class="sr-only">
        Call control interface with AI Assistant
      </DialogDescription>
      <div class="w-full max-w-md mx-auto bg-background rounded-lg shadow-lg p-6">
        <div class="flex flex-col items-center justify-center space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold">AI Assistant</h2>

            <TransitionGroup name="fade">
              <div v-if="callState === 'connecting'" key="connecting" class="text-sm text-muted-foreground mt-1">
                Connecting...
              </div>

              <div v-if="callState === 'active'" key="active" class="text-sm text-muted-foreground mt-1">
                In call • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callState === 'ended'" key="ended" class="text-sm text-muted-foreground mt-1">
                Call ended • {{ formatCallDuration(callDuration) }}
              </div>
            </TransitionGroup>
          </div>

          <!-- Call Controls -->
          <div class="w-full">
            <div v-if="callState === 'connecting'" class="flex justify-center">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Cancel</span>
              </n-button>
            </div>

            <div v-if="callState === 'active'" class="grid grid-cols-2 gap-4 mt-4">
              <n-button variant="outline" class="flex flex-col items-center justify-center h-16 p-2"
                @click="isMuted = !isMuted">
                <component :is="isMuted ? MicOff : Mic" class="h-5 w-5 mb-1" />
                <span class="text-xs">{{ isMuted ? 'Unmute' : 'Mute' }}</span>
              </n-button>

              <n-button variant="destructive" class="flex flex-col items-center justify-center h-16 p-2"
                @click="handleEndCall">
                <PhoneOff class="h-5 w-5 mr-2" />
                End Call
              </n-button>
            </div>

            <div v-if="callState === 'ended'" class="flex justify-center mt-4">
              <n-button variant="outline" @click="onOpenChange(false)">
                Close
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </n-dialog>
  <audio ref="remoteAudioRef" autoplay></audio>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { PhoneOff, Mic, MicOff } from 'lucide-vue-next'
import { NDialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { NButton } from '@/components/ui/button'

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

// Get call state text
const getCallStateText = computed(() => {
  switch (callState.value) {
    case 'connecting':
      return 'Connecting'
    case 'active':
      return `In call • ${formatCallDuration(callDuration.value)}`
    case 'ended':
      return callDuration.value > 0 ? `Call ended • ${formatCallDuration(callDuration.value)}` : 'Call ended'
    default:
      return ''
  }
})

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
