<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/200" />
    <DialogContent class="sm:max-w-md p-0 border-none bg-transparent shadow-none" @pointer-down-outside.prevent>
      <DialogTitle class="sr-only">{{ callerName }} - {{ getCallStateText }}</DialogTitle>
      <DialogDescription class="sr-only">
        Interface điều khiển cuộc gọi cho phép bạn trả lời, từ chối, hoặc quản lý cuộc gọi đang diễn ra với {{
          callerName }}
      </DialogDescription>
      <div class="w-full max-w-md mx-auto bg-background rounded-lg shadow-lg p-6">
        <div class="flex flex-col items-center justify-center space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold">{{ callerName }}</h2>

            <TransitionGroup name="fade">
              <div v-if="callState === 'incoming'" key="incoming" class="text-sm text-muted-foreground mt-1">
                Cuộc gọi đến...
              </div>

              <div v-if="callState === 'connecting'" key="connecting" class="text-sm text-muted-foreground mt-1">
                Đang kết nối...
              </div>

              <div v-if="callState === 'ringing'" key="ringing" class="text-sm text-muted-foreground mt-1">
                Đang đổ chuông...
              </div>

              <div v-if="callState === 'active'" key="active" class="text-sm text-muted-foreground mt-1">
                Đang trong cuộc gọi • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callState === 'ended' && callDuration > 0" key="ended"
                class="text-sm text-muted-foreground mt-1">
                Cuộc gọi kết thúc • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callState === 'ended' && callDuration === 0" key="ended-no-duration"
                class="text-sm text-muted-foreground mt-1">
                Cuộc gọi kết thúc
              </div>

              <div v-if="callState === 'rejected'" key="rejected" class="text-sm text-muted-foreground mt-1">
                Cuộc gọi bị từ chối
              </div>
            </TransitionGroup>
          </div>

          <!-- Call Controls -->
          <div class="w-full">
            <div v-if="callState === 'incoming'" class="flex justify-center gap-4">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Từ chối</span>
              </n-button>

              <n-button size="lg" variant="default" class="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
                @click="handleAnswer">
                <Phone class="h-6 w-6" />
                <span class="sr-only">Trả lời</span>
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
                <span class="text-xs">{{ isMuted ? 'Bật mic' : 'Tắt mic' }}</span>
              </n-button>

              <!-- <n-button variant="outline" class="flex flex-col items-center justify-center h-16 p-2"
                @click="isVideoOff = !isVideoOff">
                <component :is="isVideoOff ? VideoOff : Video" class="h-5 w-5 mb-1" />
                <span class="text-xs">{{ isVideoOff ? 'Video On' : 'Video Off' }}</span>
              </n-button> -->


              <n-button variant="destructive" class="flex flex-col items-center justify-center h-16 p-2"
                @click="handleEndCall">
                <PhoneOff class="h-5 w-5 mr-2" />
                Kết thúc
              </n-button>
            </div>

            <div v-if="callState === 'ended'" class="flex justify-center mt-4">
              <n-button variant="outline" @click="onOpenChange(false)">
                Đóng
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </n-dialog>
  <audio ref="remoteAudioRef" autoplay></audio>
  <audio ref="ringtoneRef" preload="auto" loop>
    <source src="@/assets/audio/ringtone_vippro.mp3" type="audio/mpeg">
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
  if (newSession && !props.callerName) {
    currentCallerName.value =
      newSession.remoteIdentity.uri.user || "undefined"
  }
})

// Get caller name
const callerName = computed(() => {
  return currentCallerName.value || props.callerName
})

// Get call state text
const getCallStateText = computed(() => {
  switch (callState.value) {
    case 'incoming':
      return 'Cuộc gọi đến'
    case 'connecting':
      return 'Đang kết nối'
    case 'ringing':
      return 'Đang đổ chuông'
    case 'active':
      return `Đang trong cuộc gọi • ${formatCallDuration(callDuration.value)}`
    case 'ended':
      return callDuration.value > 0 ? `Cuộc gọi kết thúc • ${formatCallDuration(callDuration.value)}` : 'Cuộc gọi kết thúc'
    case 'rejected':
      return 'Cuộc gọi bị từ chối'
    default:
      return ''
  }
})

// Initialize audio element
onMounted(() => {
  if (ringtoneRef.value) {
    ringtoneRef.value.load()
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
      // Stop ringtone
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
      }
      break
    case 'Established':
      callState.value = 'active'
      startTimer()
      // Stop ringtone
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
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
      // Stop ringtone
      if (ringtoneRef.value) {
        ringtoneRef.value.pause()
        ringtoneRef.value.currentTime = 0
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
