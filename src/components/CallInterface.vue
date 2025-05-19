<template>
  <n-dialog :open="modelValue" @update:open="onOpenChange" :closeOnClickOutside="false">
    <DialogOverlay class="bg-black/200" />
    <DialogContent class="sm:max-w-md p-0 border-none bg-transparent shadow-none" @pointer-down-outside.prevent>
      <DialogTitle class="sr-only">{{ callerName || caller }} - {{ callStatus }}</DialogTitle>
      <DialogDescription class="sr-only">
        Interface điều khiển cuộc gọi cho phép bạn trả lời, từ chối, hoặc quản lý cuộc gọi đang diễn ra với {{
          callerName || caller }}
      </DialogDescription>
      <div class="w-full max-w-md mx-auto bg-background rounded-lg shadow-lg p-6">
        <div class="flex flex-col items-center justify-center space-y-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold">{{ callerName || caller }}</h2>

            <TransitionGroup name="fade">
              <div v-if="callStatus === 'Incoming'" key="incoming" class="text-sm text-muted-foreground mt-1">
                Cuộc gọi đến...
              </div>

              <div v-if="callStatus === 'Establishing'" key="connecting" class="text-sm text-muted-foreground mt-1">
                Đang kết nối...
              </div>

              <div v-if="callStatus === 'Ringing'" key="ringing" class="text-sm text-muted-foreground mt-1">
                Đang đổ chuông...
              </div>

              <div v-if="callStatus === 'Established'" key="active" class="text-sm text-muted-foreground mt-1">
                Đang trong cuộc gọi • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callStatus === 'Ended' && callDuration > 0" key="ended"
                class="text-sm text-muted-foreground mt-1">
                Cuộc gọi kết thúc • {{ formatCallDuration(callDuration) }}
              </div>

              <div v-if="callStatus === 'Ended' && callDuration === 0" key="ended-no-duration"
                class="text-sm text-muted-foreground mt-1">
                Cuộc gọi kết thúc
              </div>

              <div v-if="callStatus === 'Rejected'" key="rejected" class="text-sm text-muted-foreground mt-1">
                Cuộc gọi bị từ chối
              </div>
            </TransitionGroup>
          </div>

          <!-- Call Controls -->
          <div class="w-full">
            <div v-if="callStatus === 'Incoming'" class="flex justify-center gap-4">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleRejectCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Từ chối</span>
              </n-button>

              <n-button size="lg" variant="default" class="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
                @click="handleAnswerCall">
                <Phone class="h-6 w-6" />
                <span class="sr-only">Trả lời</span>
              </n-button>
            </div>

            <div v-if="callStatus === 'Establishing'" class="flex justify-center">
              <n-button size="lg" variant="destructive" class="h-14 w-14 rounded-full" @click="handleEndCall">
                <PhoneOff class="h-6 w-6" />
                <span class="sr-only">Kết thúc</span>
              </n-button>
            </div>

            <div v-if="callStatus === 'Established'" class="grid grid-cols-2 gap-4 mt-4">
              <n-button variant="outline" class="flex flex-col items-center justify-center h-16 p-2"
                @click="toggleMute">
                <component :is="isMuted ? MicOff : Mic" class="h-5 w-5 mb-1" />
                <span class="text-xs">{{ isMuted ? 'Bật mic' : 'Tắt mic' }}</span>
              </n-button>

              <n-button variant="destructive" class="flex flex-col items-center justify-center h-16 p-2"
                @click="handleEndCall">
                <PhoneOff class="h-5 w-5 mr-2" />
                Kết thúc
              </n-button>
            </div>

            <div v-if="callStatus === 'Ended'" class="flex justify-center mt-4">
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

const props = defineProps<{
  modelValue: boolean
  defaultState?: string
  callerName?: string
  autoEndCall?: boolean
  autoEndTimeout?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'answer'): void
  (e: 'reject'): void
  (e: 'end'): void
}>()

const sipStore = useSipStore()

const {
  callStatus,
  caller,
  isMuted,
  callDuration,
  handleHangup,
  handleAnswer,
  handleReject,
  toggleMute,
  handleCall
} = sipStore

// Watch for changes in showCallInterface from store
watch(() => sipStore.showCallInterface, (newValue) => {
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue)
  }
}, { immediate: true })

// Watch for changes in modelValue from parent
watch(() => props.modelValue, (newValue) => {
  if (newValue !== sipStore.showCallInterface) {
    sipStore.showCallInterface = newValue
  }
}, { immediate: true })

const onOpenChange = (value: boolean) => {
  emit('update:modelValue', value)
  sipStore.showCallInterface = value
}

const formatCallDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const handleEndCall = () => {
  handleHangup()
  emit('end')
  onOpenChange(false)
}

const handleAnswerCall = () => {
  handleAnswer()
  emit('answer')
}

const handleRejectCall = () => {
  handleReject()
  emit('reject')
}

// Watch for auto end call
watch(() => props.autoEndCall, (newValue) => {
  if (newValue && props.autoEndTimeout) {
    setTimeout(() => {
      handleEndCall()
    }, props.autoEndTimeout)
  }
})

// Watch for default state changes
watch(() => props.defaultState, (newState) => {
  if (newState) {
    // Handle state changes if needed
  }
})

// Expose the handleCall function to parent
defineExpose({
  makeCall: handleCall
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
