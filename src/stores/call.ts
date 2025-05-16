import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Call {
    contactName?: string
    phoneNumber: string
}

export const useCallStore = defineStore('call', () => {
    const currentCall = ref<Call | null>(null)
    const isIncomingCall = ref(false)

    const showIncomingCall = (call: Call) => {
        currentCall.value = call
        isIncomingCall.value = true
    }

    const hideIncomingCall = () => {
        currentCall.value = null
        isIncomingCall.value = false
    }

    const acceptCall = () => {
        // Add your call acceptance logic here
        hideIncomingCall()
    }

    const rejectCall = () => {
        // Add your call rejection logic here
        hideIncomingCall()
    }

    return {
        currentCall,
        isIncomingCall,
        showIncomingCall,
        hideIncomingCall,
        acceptCall,
        rejectCall
    }
}) 