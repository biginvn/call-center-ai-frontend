import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSip } from '@/services/sipService'

export const useSipStore = defineStore('sip', () => {
  const sipService = useSip()
  const extension = ref('')
  const password = ref('')
  const showCallInterface = ref(false)

  const login = async (ext: string, pwd: string) => {
    extension.value = ext
    password.value = pwd
    await sipService.handleLogin(ext, pwd)
  }

  const logout = async () => {
    await sipService.handleLogout()
    extension.value = ''
    password.value = ''
  }

  // Expose computed properties to track SIP service state
  const isRegistered = computed(() => sipService.isRegistered.value)
  const status = computed(() => sipService.status.value)
  const callStatus = computed(() => sipService.callStatus.value)
  const caller = computed(() => sipService.caller.value)
  const isMuted = computed(() => sipService.isMuted.value)
  const callDuration = computed(() => sipService.callDuration.value)

  // Watch for changes in sipService.showCallInterface
  watch(() => sipService.showCallInterface.value, (newValue) => {
    showCallInterface.value = newValue
  })

  return {
    extension,
    password,
    isRegistered,
    status,
    callStatus,
    caller,
    showCallInterface,
    isMuted,
    callDuration,
    login,
    logout,
    handleAnswer: sipService.handleAnswer,
    handleReject: sipService.handleReject,
    handleHangup: sipService.handleHangup,
    handleCall: sipService.handleCall,
    toggleMute: sipService.toggleMute
  }
})
