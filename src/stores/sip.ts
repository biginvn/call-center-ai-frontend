import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { SipService } from '@/services/sipService'
import { useAuthStore } from './auth'
import type { SessionDescriptionHandler, Session } from 'sip.js'
import { SessionState, Inviter, Invitation } from 'sip.js'

type SipSessionType = Session | Invitation | Inviter

export const useSipStore = defineStore('sip', () => {
  // State
  const session = ref<SipSessionType | null>(null)
  const callStatus = ref('Idle')
  const status = ref('Not Registered')
  const debug = ref('')
  const remoteAudioRef = ref<HTMLAudioElement | null>(null)
  const sipService = ref<SipService | null>(null)

  const authStore = useAuthStore()
  const displayName = computed(() => {
    // First try to get from auth store
    if (authStore.user?.fullName) {
      return authStore.user.fullName;
    }
    // Fallback to localStorage
    const storedFullName = localStorage.getItem("fullName");
    return storedFullName || 'Unknown';
  });
  const SIP_SERVER = import.meta.env.VITE_SIP_SERVER || ''
  const SIP_PORT = import.meta.env.VITE_SIP_PORT || '8089'

  // Helper function to determine web client
  const determineWebClient = (extension: string) => {
    if (extension.startsWith('111')) {
      return 'web1'
    } else if (extension.startsWith('112')) {
      return 'web2'
    } else if (extension.startsWith('101'))
      return 'test2' // default fallback
    else
      return 'web1'
  }
  // Watch for changes in user data and reinitialize SIP service if needed
  watch(() => authStore.user, async (newUser) => {
    if (newUser && newUser.role === 'agent' && newUser.extensionNumber) {
      const extension = determineWebClient(newUser.extensionNumber.toString())
      const password = "1234" // This should be stored securely
      if (extension && password) {
        await initializeSip(extension, password)
      }
    }
  }, { immediate: true })

  // Update watch to handle localStorage as well
  watch(() => displayName.value, (newName) => {
    if (sipService.value && newName !== 'Unknown') {
      sipService.value = new SipService({
        server: SIP_SERVER,
        wsServer: `wss://${SIP_SERVER}:${SIP_PORT}/ws`,
        displayName: newName,
      });
      setupSipEvents();
    }
  });

  // Initialize SIP service
  function setupSipEvents() {
    if (!sipService.value) return

    sipService.value.setEvents({
      onRegistered: () => {
        status.value = 'Registered'
        debug.value += '\n[INFO] Registered successfully!'
      },
      onUnregistered: () => {
        status.value = 'Not Registered'
        callStatus.value = 'Idle'
        debug.value += '\n[INFO] Unregistered.'
      },
      onRegistrationFailed: (err) => {
        status.value = 'Not Registered'
        debug.value += `\n[ERROR] Registration failed: ${err?.message}`
      },
      onIncomingCall: (incomingSession, caller) => {
        callStatus.value = 'Incoming Call'
        session.value = incomingSession
        debug.value += `\n[INFO] Incoming call from ${caller}`
      },
      onCallEstablished: (activeSession) => {
        callStatus.value = 'Established'
        session.value = activeSession
        // Attach remote audio
        const sdh = activeSession.sessionDescriptionHandler as SessionDescriptionHandler & {
          peerConnection?: RTCPeerConnection
        }
        if (sdh?.peerConnection && remoteAudioRef.value) {
          sdh.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
            if (receiver.track) {
              const stream = new MediaStream([receiver.track])
              remoteAudioRef.value!.srcObject = stream
              remoteAudioRef.value!.play().catch(() => { })
            }
          })
        }
        debug.value += '\n[INFO] Call established.'
      },
      onCallEnded: () => {
        callStatus.value = 'Ended'
        session.value = null
        debug.value += '\n[INFO] Call ended.'
        if (remoteAudioRef.value) {
          remoteAudioRef.value.srcObject = null
        }
      },
      onDebug: (msg) => {
        debug.value += `\n${msg}`
      },
    })
  }

  // Methods
  const initializeSip = async (extension: string, password: string) => {
    // Create SIP service instance if it doesn't exist
    if (!sipService.value) {
      sipService.value = new SipService({
        server: '54.169.56.19',
        wsServer: 'wss://54.169.56.19:8089/ws',
        displayName: displayName.value,
      })
      setupSipEvents()
    }
    await sipService.value.login(extension, password)
  }

  const logout = async () => {
    if (sipService.value) {
      await sipService.value.logout()
    }
  }

  const makeCall = async (destination: string) => {
    try {
      if (!sipService.value) {
        debug.value += '\n[Error] SIP service not initialized.'
        return
      }

      // Set call status to Establishing before making the call
      callStatus.value = 'Establishing'
      debug.value += `\n[INFO] Calling extension ${destination}...`

      // Make the call and get the session
      const newSession = await sipService.value.call(destination)
      if (newSession) {
        session.value = newSession
      }

    } catch (error) {
      debug.value += `\n[Error] Failed to make call: ${error}`
      callStatus.value = 'Ended'
      session.value = null
    }
  }

  const hangup = () => {
    if (!sipService.value) {
      debug.value += '\n[ERROR] Cannot hangup: SIP service not initialized'
      return
    }

    if (!session.value) {
      debug.value += '\n[INFO] No active session to hangup'
      callStatus.value = 'Ended'
      return
    }

    // Type guard to ensure session.value exists and has a state
    if (!('state' in session.value)) {
      debug.value += '\n[ERROR] Invalid session object'
      return
    }

    callStatus.value = 'Ended'
    debug.value += '\n[INFO] Hanging up...'

    try {
      switch (session.value.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session.value instanceof Inviter) {
            session.value.cancel()
          } else {
            (session.value as Invitation).reject()
          }
          break
        case SessionState.Established:
          debug.value += '\n[INFO] Sending BYE request...'
          if (session.value && 'bye' in session.value) {
            session.value.bye()
          } else {
            throw new Error('Session does not support BYE method')
          }
          break
        case SessionState.Terminating:
        case SessionState.Terminated:
          debug.value += '\n[INFO] Session already terminating or terminated'
          break
        default:
          debug.value += '\n[WARNING] Unknown session state'
      }
    } catch (error) {
      if (error instanceof Error) {
        debug.value += `\n[ERROR] Failed to hangup: ${error.message}`
      } else {
        debug.value += `\n[ERROR] Failed to hangup: ${String(error)}`
      }
      // Reset session state on error
      session.value = null
      callStatus.value = 'Ended'
    }
  }

  const accept = async () => {
    if (session.value && sipService.value) {
      await sipService.value.acceptCall(session.value as Invitation)
      console.log('Call accepted hahaha')
    }
  }

  const reject = async () => {
    if (session.value && sipService.value) {
      // Check session state before rejecting
      if (session.value.state === SessionState.Initial || session.value.state === SessionState.Establishing) {
        if (session.value instanceof Invitation) {
          session.value.reject()
        } else if (session.value instanceof Inviter) {
          session.value.cancel()
        }
      }
      session.value = null
      callStatus.value = 'Ended'
    }
  }

  const toggleMute = (isMuted: boolean) => {
    if (sipService.value) {
      sipService.value.toggleMute(isMuted)
    }
  }

  return {
    session,
    callStatus,
    status,
    debug,
    remoteAudioRef,
    displayName,
    initializeSip,
    logout,
    makeCall,
    hangup,
    accept,
    reject,
    toggleMute,
  }
})
