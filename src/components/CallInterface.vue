<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/200" />
    <DialogContent class="sm:max-w-md p-0 border-none bg-transparent shadow-none [&>button:last-child]:hidden"
      @pointer-down-outside.prevent>
      <DialogTitle class="sr-only">{{ callerName }} - {{ getCallStateText }}</DialogTitle>
      <DialogDescription class="sr-only">
        Call control interface that allows you to answer, reject, or manage ongoing calls with {{
          callerName }}
      </DialogDescription>
      <div class="w-full max-w-md mx-auto bg-background rounded-lg shadow-lg p-6">
        <div class="flex flex-col items-center justify-center space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold">{{ callerName }}</h2>

            <TransitionGroup name="fade">
              <div v-if="callState === 'incoming'" key="incoming" class="text-sm text-muted-foreground mt-1">
                Incoming call...
              </div>

              <div v-if="callState === 'connecting'" key="connecting" class="text-sm text-muted-foreground mt-1">
                Connecting...
              </div>

              <div v-if="callState === 'ringing'" key="ringing" class="text-sm text-muted-foreground mt-1">
                Ringing...
              </div>

              <div v-if="callState === 'active'" key="active" class="text-sm text-muted-foreground mt-1">
                In call • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callState === 'ended' && callDuration > 0" key="ended"
                class="text-sm text-muted-foreground mt-1">
                Call ended • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callState === 'ended' && callDuration === 0" key="ended-no-duration"
                class="text-sm text-muted-foreground mt-1">
                Call ended
              </div>

              <div v-if="callState === 'rejected'" key="rejected" class="text-sm text-muted-foreground mt-1">
                Call rejected
              </div>
            </TransitionGroup>
          </div>

          <!-- Call Controls -->
          <div class="w-full">
            <div v-if="callState === 'incoming'" class="flex justify-center gap-4">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Reject</span>
              </n-button>

              <n-button size="lg" variant="default" class="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
                @click="handleAnswer">
                <Phone class="h-6 w-6" />
                <span class="sr-only">Answer</span>
              </n-button>
            </div>

            <div v-if="callState === 'outgoing'" class="flex justify-center">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Kết thúc</span>
              </n-button>
            </div>

            <div v-if="callState === 'connecting' || callState === 'ringing'" class="flex justify-center">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Kết thúc</span>
              </n-button>
            </div>

            <div v-if="callState === 'active'" class="grid grid-cols-2 gap-4 mt-4">
              <n-button variant="outline" class="flex flex-col items-center justify-center h-16 p-2"
                @click="isMuted = !isMuted">
                <component :is="isMuted ? MicOff : Mic" class="h-5 w-5 mb-1" />
                <span class="text-xs">{{ isMuted ? 'Unmute' : 'Mute' }}</span>
              </n-button>

              <!-- <n-button variant="outline" class="flex flex-col items-center justify-center h-16 p-2"
                @click="isVideoOff = !isVideoOff">
                <component :is="isVideoOff ? VideoOff : Video" class="h-5 w-5 mb-1" />
                <span class="text-xs">{{ isVideoOff ? 'Video On' : 'Video Off' }}</span>
              </n-button> -->


              <n-button variant="destructive" class="flex flex-col items-center justify-center h-16 p-2"
                @click="handleEndCall">
                <PhoneOff class="h-5 w-5 mr-2" />
                End call
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
  <audio ref="ringtoneRef" preload="auto" loop>
    <source src="@/assets/audio/ringtone.mp3" type="audio/mpeg">
  </audio>
  <audio ref="dialingRef" preload="auto" loop>
    <source src="@/assets/audio/dialing.mp3" type="audio/mpeg">
  </audio>
  <audio ref="connectedRef" preload="auto">
    <source src="@/assets/audio/connected.mp3" type="audio/mpeg">
  </audio>
  <audio ref="terminatedRef" preload="auto">
    <source src="@/assets/audio/disconnected.mp3" type="audio/mpeg">
  </audio>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from 'vue'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-vue-next'
import { NDialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { NButton } from '@/components/ui/button'
import { useSipStore } from '@/stores/sip'
import type { SessionDescriptionHandler } from 'sip.js'

type CallState = 'incoming' | 'outgoing' | 'connecting' | 'ringing' | 'active' | 'ended' | 'rejected'

interface Props {
  modelValue: boolean
  defaultState?: CallState
  callerName?: string
  callerAvatar?: string
  autoEndCall?: boolean
  autoEndTimeout?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  defaultState: 'incoming',
  callerName: '',
  callerAvatar: '/placeholder.svg?height=100&width=100',
  autoEndCall: false,
  autoEndTimeout: 30000,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'answer'): void
  (e: 'reject'): void
  (e: 'end'): void
}>()

const sipStore = useSipStore()
const callState = ref<CallState>(props.defaultState)
const callDuration = ref(0)
const isMuted = ref(false)
// const isVideoOff = ref(true)
const isSpeakerOff = ref(false)
let timer: ReturnType<typeof window.setInterval> | null = null
const ringtoneRef = ref<HTMLAudioElement | null>(null)
const dialingRef = ref<HTMLAudioElement | null>(null)
const connectedRef = ref<HTMLAudioElement | null>(null)
const terminatedRef = ref<HTMLAudioElement | null>(null)
const currentCallerName = ref('')
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

// Watch for session changes to update caller name
watch(() => sipStore.session, (newSession) => {
  if (newSession) {
    // Update caller name from session's remote identity
    const remoteUser = newSession.remoteIdentity.uri.user
    if (remoteUser) {
      currentCallerName.value = remoteUser
    }
  }
}, { immediate: true })

// Get caller name
const callerName = computed(() => {
  // If we have a current caller name from the session, use that
  if (currentCallerName.value) {
    return currentCallerName.value
  }
  // Otherwise fall back to the prop value
  return props.callerName
})

// Get call state text
const getCallStateText = computed(() => {
  switch (callState.value) {
    case 'incoming':
      return 'Incoming call'
    case 'connecting':
      return 'Connecting'
    case 'ringing':
      return 'Ringing'
    case 'active':
      return `In call • ${formatCallDuration(callDuration.value)}`
    case 'ended':
      return callDuration.value > 0 ? `Call ended • ${formatCallDuration(callDuration.value)}` : 'Call ended'
    case 'rejected':
      return 'Call rejected'
    default:
      return ''
  }
})

// Initialize audio elements
onMounted(() => {
  if (ringtoneRef.value) {
    ringtoneRef.value.load()
  }
  if (dialingRef.value) {
    dialingRef.value.load()
  }
  if (connectedRef.value) {
    connectedRef.value.load()
  }
  if (terminatedRef.value) {
    terminatedRef.value.load()
  }
})

watch(remoteAudioRef, (el) => {
  if (el) sipStore.remoteAudioRef = el
})
// Reset state when dialog opens
watch(() => props.modelValue, (newOpen) => {
  if (newOpen) {
    callState.value = props.defaultState
    callDuration.value = 0
    isMuted.value = false
    // isVideoOff.value = true
    isSpeakerOff.value = false
    // Reset ringtone
    if (ringtoneRef.value) {
      ringtoneRef.value.currentTime = 0
    }
    // Reset remote audio
    if (sipStore.remoteAudioRef) {
      sipStore.remoteAudioRef.srcObject = null

    }
  } else {
    // Clear caller name when dialog closes
    currentCallerName.value = ''
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

  if (autoEndCall && newCallState === 'outgoing') {
    setTimeout(() => {
      callState.value = 'active'
    }, 3000)
  }

  if (autoEndCall && newCallState === 'active') {
    setTimeout(() => {
      callState.value = 'ended'
      emit('end')
    }, props.autoEndTimeout)
  }
})

// Watch for SIP call status changes
watch(() => sipStore.callStatus, (newStatus) => {
  switch (newStatus) {
    case 'Incoming Call':
      callState.value = 'incoming'
      // Play ringtone
      if (ringtoneRef.value) {
        ringtoneRef.value.currentTime = 0
        ringtoneRef.value.play().catch((error) => {
          console.error('Failed to play ringtone:', error)
        })
      }
      break
    case 'Establishing':
      callState.value = 'connecting'
      // Stop ringtone and play dialing sound
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
      }
      if (dialingRef.value) {
        dialingRef.value.currentTime = 0
        dialingRef.value.play().catch((error) => {
          console.error('Failed to play dialing sound:', error)
        })
      }
      break
    case 'Established':
      callState.value = 'active'
      startTimer()
      // Stop all sounds and play connected sound
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
      }
      if (dialingRef.value) {
        dialingRef.value.pause()
        dialingRef.value.currentTime = 0
      }
      if (connectedRef.value) {
        connectedRef.value.currentTime = 0
        connectedRef.value.play().catch((error) => {
          console.error('Failed to play connected sound:', error)
        })
      }
      // Ensure audio is playing
      if (sipStore.remoteAudioRef) {
        sipStore.remoteAudioRef.play().catch((error) => {
          console.error('Failed to play remote audio:', error)
        })
      }
      break
    case 'Ended':
      callState.value = 'ended'
      stopTimer()
      // Stop all sounds and play terminated sound
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
      }
      if (dialingRef.value) {
        dialingRef.value.pause()
        dialingRef.value.currentTime = 0
      }
      if (connectedRef.value) {
        connectedRef.value.pause()
        connectedRef.value.currentTime = 0
      }
      if (terminatedRef.value) {
        terminatedRef.value.currentTime = 0
        terminatedRef.value.play().catch((error) => {
          console.error('Failed to play terminated sound:', error)
        })
      }
      // Reset audio
      if (sipStore.remoteAudioRef) {
        sipStore.remoteAudioRef.srcObject = null
      }
      // Stop and release local audio tracks after a short delay to avoid abrupt call termination
      setTimeout(() => {
        if (sipStore.session) {
          const sdh = sipStore.session.sessionDescriptionHandler as SessionDescriptionHandler & {
            peerConnection?: RTCPeerConnection
          }
          if (sdh?.peerConnection) {
            sdh.peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
              if (sender.track && sender.track.kind === 'audio') {
                sender.track.stop()
              }
            })
          }
        }
      }, 1000) // 1 second delay
      break
  }
})

// Watch for mute state changes
watch(isMuted, (newMuted) => {
  if (sipStore.session) {
    const sdh = sipStore.session.sessionDescriptionHandler as SessionDescriptionHandler & {
      peerConnection?: RTCPeerConnection
    }
    if (sdh?.peerConnection) {
      sdh.peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = !newMuted
        }
      })
    }
  }
})

// Watch for speaker state changes
watch(isSpeakerOff, (newSpeakerOff) => {
  const audioElement = sipStore.remoteAudioRef
  if (audioElement) {
    audioElement.muted = newSpeakerOff
  }
})

// Watch for incoming calls to play ringtone
watch(() => callState.value, (newState) => {
  if (newState === 'incoming' && ringtoneRef.value) {
    ringtoneRef.value.play().catch((error) => {
      console.error('Failed to play ringtone:', error)
    })
  } else if (ringtoneRef.value) {
    ringtoneRef.value.pause()
    ringtoneRef.value.currentTime = 0
  }
})

onUnmounted(() => {
  stopTimer()
})

const handleAnswer = async () => {
  try {
    await sipStore.accept()
    callState.value = 'active'
    emit('answer')
  } catch (error) {
    console.error('Error answering call:', error)
  }
}


const handleEndCall = async () => {
  try {
    sipStore.hangup()
    callState.value = 'ended'
    emit('end')

    stopTimer()
    setTimeout(() => emit('update:modelValue', false), 1000)
  } catch (error) {
    console.error('Error ending call:', error)
    // Still update UI state even if hangup fails
    stopTimer()
    emit('update:modelValue', false)
  }
}

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const onOpenChange = (value: boolean) => {
  emit('update:modelValue', value)
}
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
