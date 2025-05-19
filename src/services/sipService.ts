import { ref, onUnmounted } from 'vue'
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  RegistererState,
  Invitation,
  Session
} from 'sip.js'
import type { UserAgentOptions } from 'sip.js'

// Configuration constants
const RECONNECTION_ATTEMPTS = 3
const RECONNECTION_DELAY = 4

export function useSip() {
  const ua = ref<UserAgent | null>(null)
  const registerer = ref<Registerer | null>(null)
  const session = ref<any>(null)
  const status = ref('Not Registered')
  const callStatus = ref('Idle')
  const isRegistered = ref(false)
  const debug = ref('')
  const incomingCall = ref<any>(null)
  const caller = ref('')
  const isMuted = ref(false)
  const callDuration = ref(0)
  const durationRef = ref<number | null>(null)
  const remoteAudioRef = ref<HTMLAudioElement | null>(null)
  const showCallInterface = ref(false)

  // Reconnection state
  let attemptingReconnection = false
  let shouldBeConnected = false

  const startTimer = () => {
    callDuration.value = 0
    durationRef.value = window.setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  const stopTimer = () => {
    if (durationRef.value) {
      clearInterval(durationRef.value)
      durationRef.value = null
    }
  }

  const toggleMute = () => {
    if (!session.value) return
    const pc = session.value.sessionDescriptionHandler?.peerConnection
    if (!pc) return
    pc.getSenders().forEach((sender: any) => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = isMuted.value
      }
    })
    isMuted.value = !isMuted.value
  }

  const attemptReconnection = async (reconnectionAttempt = 1) => {
    if (!shouldBeConnected || !ua.value || attemptingReconnection) {
      return
    }

    if (reconnectionAttempt > RECONNECTION_ATTEMPTS) {
      debug.value += '\n[ERROR] Maximum reconnection attempts reached'
      return
    }

    attemptingReconnection = true

    setTimeout(async () => {
      if (!shouldBeConnected || !ua.value) {
        attemptingReconnection = false
        return
      }

      try {
        await ua.value.reconnect()
        attemptingReconnection = false
        debug.value += '\n[INFO] Reconnection successful'
      } catch (error) {
        debug.value += `\n[ERROR] Reconnection attempt ${reconnectionAttempt} failed`
        attemptingReconnection = false
        attemptReconnection(++reconnectionAttempt)
      }
    }, reconnectionAttempt === 1 ? 0 : RECONNECTION_DELAY * 1000)
  }

  const handleLogin = async (extension: string, password: string) => {
    if (ua.value) return
    if (!extension || !password) {
      debug.value += '\n[Error] Missing extension or password'
      return
    }

    const uri = UserAgent.makeURI(`sip:${extension}@54.169.56.19`)
    if (!uri) {
      throw new Error("Failed to create URI")
    }

    const userAgentOptions: UserAgentOptions = {
      uri,
      displayName: 'Nguyễn Văn A',
      authorizationUsername: extension,
      authorizationPassword: password,
      transportOptions: {
        server: 'wss://54.169.56.19:8089/ws',
        keepAliveInterval: 10
      }
    }

    const userAgent = new UserAgent(userAgentOptions)

    userAgent.delegate = {
      onConnect: () => {
        debug.value += '\n[DEBUG] WebSocket connected to Asterisk.'
        shouldBeConnected = true
        // Re-register on connect
        registerer.value?.register()
      },
      onDisconnect: (error?: Error) => {
        debug.value += `\n[DEBUG] WebSocket disconnected. ${error?.message || ''}`
        status.value = 'Not Registered'
        isRegistered.value = false

        // Attempt reconnection on error
        if (error) {
          attemptReconnection()
        }
      },
      onInvite: async (invitation: Invitation) => {
        const callerId = invitation.remoteIdentity.uri.user
        caller.value = callerId || ''
        incomingCall.value = invitation
        callStatus.value = 'Incoming'
        showCallInterface.value = true

        // Setup session delegate
        const incomingSession: Session = invitation
        setupSessionDelegate(incomingSession)
      }
    }

    ua.value = userAgent
    await userAgent.start()

    const reg = new Registerer(userAgent)
    reg.stateChange.addListener((newState) => {
      debug.value += `\n[DEBUG] Registerer State Change: ${newState}`
      let statusStr
      switch (newState) {
        case RegistererState.Initial:
          statusStr = 'Initial'
          break
        case RegistererState.Registered:
          statusStr = 'Registered'
          break
        case RegistererState.Unregistered:
          statusStr = 'Unregistered'
          break
        case RegistererState.Terminated:
          statusStr = 'Terminated'
          break
        default:
          statusStr = 'Unknown'
      }
      console.log('[SIP] Registration state changed:', statusStr)
      status.value = statusStr
      isRegistered.value = newState === RegistererState.Registered
      console.log('[SIP] isRegistered updated to:', isRegistered.value)
    })

    try {
      await reg.register()
      console.log('[SIP] Registration completed')
      registerer.value = reg
    } catch (error) {
      console.error('[SIP] Registration failed:', error)
      debug.value += `\n[ERROR] Registration failed: ${error}`
    }
  }

  const setupSessionDelegate = (session: Session) => {
    session.delegate = {
      onRefer: (referral) => {
        debug.value += '\n[DEBUG] Received REFER request'
        // Handle referral if needed
      }
    }

    session.stateChange.addListener((state: SessionState) => {
      debug.value += `\n[DEBUG] Session State: ${state}`
      handleSessionState(state, session)
    })
  }

  const handleSessionState = (state: SessionState, session: Session) => {
    if (state === SessionState.Established) {
      callStatus.value = 'Established'
      startTimer()
      const sdh = session.sessionDescriptionHandler
      if (sdh?.peerConnection && remoteAudioRef.value) {
        sdh.peerConnection.getReceivers().forEach((receiver: any) => {
          if (receiver.track) {
            const stream = new MediaStream([receiver.track])
            remoteAudioRef.value!.srcObject = stream
            remoteAudioRef.value!.play().catch(() => { })
          }
        })
      }
    }

    if (state === SessionState.Terminated) {
      callStatus.value = 'Ended'
      stopTimer()
      incomingCall.value = null
      session.value = null
      showCallInterface.value = false
    }
  }

  const handleLogout = async () => {
    if (!registerer.value) return
    await registerer.value.unregister()
    registerer.value = null
    ua.value = null
    status.value = 'Not Registered'
    isRegistered.value = false
    callStatus.value = 'Idle'
    stopTimer()
    debug.value += '\n[INFO] Logged out successfully.'
  }

  const handleCall = async (destination: string) => {
    if (!ua.value || !destination) return
    const target = UserAgent.makeURI(`sip:${destination}@54.169.56.19`)
    if (!target) {
      debug.value += '\n[Error] Invalid destination URI.'
      return
    }

    callStatus.value = 'Establishing'
    debug.value += `\n[INFO] Calling extension ${destination}...`

    const inviter = new Inviter(ua.value, target)
    inviter.stateChange.addListener((callState) => {
      debug.value += `\n[DEBUG] Call State: ${callState}`

      if (callState === SessionState.Established) {
        callStatus.value = 'Established'
        startTimer()
        const sdh = inviter.sessionDescriptionHandler
        if (sdh?.peerConnection && remoteAudioRef.value) {
          sdh.peerConnection.getReceivers().forEach((receiver: any) => {
            if (receiver.track) {
              const stream = new MediaStream([receiver.track])
              remoteAudioRef.value!.srcObject = stream
              remoteAudioRef.value!.play().catch(() => { })
            }
          })
        }
      } else if (callState === SessionState.Terminated) {
        callStatus.value = 'Ended'
        stopTimer()
        session.value = null
      }
    })

    session.value = inviter
    await inviter.invite()
  }

  const handleHangup = () => {
    if (!session.value) return
    session.value.bye()
    session.value = null
    stopTimer()
    callStatus.value = 'Ended'
    debug.value += '\n[INFO] Call ended.'
  }

  const handleAnswer = async () => {
    if (!incomingCall.value) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      console.log('Microphone OK', stream)
    } catch (err) {
      debug.value += `\n[ERROR] Microphone access failed: ${err.message}`
      return
    }

    await incomingCall.value.accept()
    session.value = incomingCall.value
  }

  const handleReject = () => {
    if (!incomingCall.value) return
    incomingCall.value.reject()
    incomingCall.value = null
  }

  // Add window online event listener
  if (typeof window !== 'undefined') {
    window.addEventListener("online", () => {
      attemptReconnection()
    })
  }

  onUnmounted(() => {
    stopTimer()
    shouldBeConnected = false
    if (registerer.value) {
      registerer.value.unregister()
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener("online", attemptReconnection)
    }
  })

  return {
    ua,
    registerer,
    session,
    status,
    callStatus,
    isRegistered,
    debug,
    incomingCall,
    caller,
    isMuted,
    callDuration,
    remoteAudioRef,
    showCallInterface,
    handleLogin,
    handleLogout,
    handleCall,
    handleHangup,
    handleAnswer,
    handleReject,
    toggleMute,
  }
}
