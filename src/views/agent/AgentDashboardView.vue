<script lang="ts">
export const description =
  'An application shell with a header and main content area. The header has a navbar, a search input and and a user nav dropdown. The user nav is toggled by a button with an avatar image. The main content area is divided into two rows. The first row has a grid of cards with statistics. The second row has a grid of cards with a table of recent transactions and a list of recent sales.'
export const iframeHeight = '825px'
export const containerClass = 'w-full h-full'
</script>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NButton } from '@/components/ui/button'
import { NCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CircleUser, Bot } from 'lucide-vue-next'
import { Wifi, WifiOff } from 'lucide-vue-next'
import PhoneDialpad from '@/components/PhoneDialpad.vue'
import {
  NDropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NBadge } from '@/components/ui/badge'
import CallInterface from '@/components/CallInterface.vue'
import BotCallInterface from '@/components/BotCallInterface.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSipStore } from '@/stores/sip'
import { getActiveUserByExtension, getAllActiveUsers } from '@/services/callService'
import ActiveUsersTable from '@/components/ActiveUsersTable.vue'
import { determineWebClient } from "@/lib/utils";
import AiCallService from '@/services/AiCallService'
import axiosInstance from '@/services/axiosInstance'
import axios from 'axios'
import { toast } from 'vue-sonner'

const router = useRouter()
const authStore = useAuthStore()
const sipStore = useSipStore()

// State for the call interface
const isOpen = ref(false)
const isBotCallOpen = ref(false)
const callState = ref<'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended'>('incoming')
const callerName = ref('')
const callerAvatar = ref('/path/to/avatar.jpg')
const isConnected = ref(false)
const isAICall = ref(false)
const peerConnection = ref<RTCPeerConnection | null>(null)
const micStream = ref<MediaStream | null>(null)
const recorder = ref<MediaRecorder | null>(null)
const chunks = ref<Blob[]>([])
const botCallInterfaceRef = ref<InstanceType<typeof BotCallInterface> | null>(null)

// Watch for incoming calls
watch(() => sipStore.callStatus, (newStatus) => {
  switch (newStatus) {
    case 'Incoming Call':
      isOpen.value = true
      callState.value = 'incoming'
      break
    case 'Establishing':
      isOpen.value = true
      callState.value = 'connecting'
      break
    case 'Established':
      callState.value = 'active'
      break
    case 'Ended':
      callState.value = 'ended'
      break
  }
})

// Watch for connection status
watch(() => sipStore.isConnected, (newStatus) => {
  isConnected.value = newStatus
})

onMounted(async () => {
  // Load user data from storage first
  await authStore.loadFromStorage()

  // Ensure we have valid auth state
  // if (!authStore.isAuthenticated) {
  //   router.push('/login')
  //   return
  // }

  // Initialize SIP if we have user data
  if (authStore.user?.extensionNumber) {
    const extension = determineWebClient(authStore.user.extensionNumber.toString())
    const password = "1234" // This should be stored securely
    await sipStore.initializeSip(extension, password)
  }
})

const onStartCall = async (input: string) => {
  isOpen.value = true


  callerName.value = await getActiveUserByExtension(input)
}

// const showCallInterface = () => {
//   isOpen.value = true
//   callState.value = 'incoming'
// }

// Event handlers
const handleAnswer = () => {

  // Add your call answer logic here
  // For example, start WebRTC connection
}

const handleReject = () => {

  // Add your call rejection logic here
  // For example, send rejection signal to the other party
}

const handleEnd = () => {
  if (isAICall.value) {
    endAICall()
  }
}

const handleLogout = async () => {
  // Logout from SIP
  await sipStore.logout()
  // Logout from auth
  authStore.logout()
  router.push('/login')
}

const startAICall = async () => {
  try {
    isAICall.value = true
    isBotCallOpen.value = true

    // Get microphone access
    micStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Create peer connection
    peerConnection.value = new RTCPeerConnection()

    // Add microphone track
    micStream.value.getTracks().forEach(track => {
      peerConnection.value?.addTrack(track)
    })

    // Handle incoming audio
    peerConnection.value.ontrack = (event) => {
      const botStream = event.streams[0]
      if (botCallInterfaceRef.value?.remoteAudioRef) {
        botCallInterfaceRef.value.remoteAudioRef.srcObject = botStream
      }

      // Set up recording
      const audioCtx = new AudioContext()
      const micSource = audioCtx.createMediaStreamSource(micStream.value!)
      const botSource = audioCtx.createMediaStreamSource(botStream)
      const destination = audioCtx.createMediaStreamDestination()

      micSource.connect(destination)
      botSource.connect(destination)

      recorder.value = new MediaRecorder(destination.stream)
      recorder.value.ondataavailable = (e) => chunks.value.push(e.data)
      recorder.value.onstop = async () => {
        // Use correct MIME type and extension for webm (native MediaRecorder output)
        const blob = new Blob(chunks.value, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // Use toast.promise for upload and submit
        interface UploadResponse {
          file_path: string;
          name: string;
        }

        // Update the toast.promise implementation:
        const uploadPromise = (async () => {
          try {
            // Use correct MIME type and extension for webm
            const blob = new Blob(chunks.value, { type: 'audio/webm' })
            const file = new File([blob], 'conversation.webm', { type: 'audio/webm' })
            const formData = new FormData()
            formData.append('file', file)

            const uploadResponse = await axiosInstance.post<UploadResponse>('/documents/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
              }
            })

            if (uploadResponse.data.file_path) {
              await AiCallService.submitVoice(uploadResponse.data.file_path)
              return { name: 'Voice file', path: uploadResponse.data.file_path }
            }
            throw new Error('No file path in response')
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
              throw new Error('File validation failed')
            }
            throw error
          }
        })()

        // Type the promise data correctly
        const promiseData = {
          loading: 'Uploading...',
          success: (data: { name: string; path: string }) =>
            `${data.name} has been uploaded and sent successfully`,
          error: (error: Error) => `Error: ${error.message}`
        }

        // Use the toast.promise with correct typing
        toast.promise(uploadPromise, promiseData)
        a.click()
        URL.revokeObjectURL(url)
        chunks.value = []
      }
      recorder.value.start()

      // Update call state to active since we've received the AI stream
      if (botCallInterfaceRef.value) {
        botCallInterfaceRef.value.callState = 'active'
        botCallInterfaceRef.value.startTimer()
      }
    }

    const fns = {
      callAgent: async ({ extension }: { extension: string }) => {
        try {
          await sipStore.makeCall(extension)
          handleBotCallEnd()
          isBotCallOpen.value = false // Close the AI bot interface
          onStartCall(extension)
          return { success: true }
        } catch (error) {
          console.error('Error making call:', error)
          return { success: false, error }
        }
      },
      getActiveAgent: async ({ }) => {
        try {
          const activeUsers = await getAllActiveUsers()
          const extensions = activeUsers
            .filter(user => user.extension_number !== authStore.user?.extensionNumber)
            .map(user => user.extension_number)
          console.log('Active users:', extensions)
          return { success: true, extensions }
        } catch (error) {
          console.error('Error getting active users:', error)
          return { success: false, error }
        }
      }
    }

    // Create data channel for OpenAI bot
    const dataChannel = peerConnection.value.createDataChannel('oai-events')

    function configureData() {
      console.log('Configuring data channel')
      const event = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          tools: [
            {
              type: 'function',
              name: 'callAgent',
              description: 'Tool to make a call to a specific agent using the extension number provided by the user. Use the getActiveAgent tool to query the list of active agents first, then ask the user which number they want to choose. Do not call without user confirmation',

              parameters: {
                type: 'object',
                properties: {
                  extension: {
                    type: 'string',
                    description: 'Số máy nội bộ (extension) của tổng đài viên cần kết nối.'
                  }
                },
                required: ['extension']
              }
            },
            {
              type: 'function',
              name: 'getActiveAgent',
              description: 'Lấy danh sách các số máy nội bộ (extension) của tổng đài viên đang hoạt động tại thời điểm hiện tại. Dùng khi cần xác định những số máy đang sẵn sàng nhận cuộc gọi.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ]
        }
      }
      dataChannel.send(JSON.stringify(event))
    }

    dataChannel.addEventListener('open', (ev) => {
      console.log('Opening data channel', ev)
      configureData()
    })

    dataChannel.addEventListener('message', async (ev) => {
      const msg = JSON.parse(ev.data) as { type: string; name: keyof typeof fns; arguments: string; call_id: string }
      // Handle function calls
      if (msg.type === 'response.function_call_arguments.done') {
        const fn = fns[msg.name]
        if (fn !== undefined) {
          console.log(`Calling local function ${msg.name} with ${msg.arguments}`)
          const args = JSON.parse(msg.arguments)
          const result = await fn(args)
          console.log('result', result)
          // Let OpenAI know that the function has been called and share its output
          const event = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: msg.call_id,
              output: JSON.stringify(result)
            }
          }
          dataChannel.send(JSON.stringify(event))
          // Have assistant respond after getting the results
          dataChannel.send(JSON.stringify({ type: "response.create" }))
        }
      }
    })

    // Create and send offer
    const offer = await peerConnection.value.createOffer()
    await peerConnection.value.setLocalDescription(offer)

    // Send offer to OpenAI Realtime API
    const sessionResponse = await AiCallService.getSession()
    const enToken = sessionResponse.client_secret.value

    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        'Authorization': `Bearer ${enToken}`,
        'Content-Type': 'application/sdp',
      },
    })

    const answer = {
      type: 'answer' as RTCSdpType,
      sdp: await sdpResponse.text(),
    }
    await peerConnection.value.setRemoteDescription(answer)

  } catch (error) {
    console.error('Error starting AI call:', error)
    if (botCallInterfaceRef.value) {
      botCallInterfaceRef.value.callState = 'ended'
    }
    isAICall.value = false
  }
}

const endAICall = async () => {
  if (recorder.value) {
    recorder.value.stop()
  }
  if (micStream.value) {
    micStream.value.getTracks().forEach(track => track.stop())
  }
  if (peerConnection.value) {
    peerConnection.value.close()
  }
  isAICall.value = false
  if (botCallInterfaceRef.value) {
    botCallInterfaceRef.value.stopTimer()
  }
}

const handleBotCallEnd = () => {
  endAICall()
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header class="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <nav class="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <a href="#" class="flex items-center gap-2 text-lg font-semibold md:text-base">
          <img src="@/assets/nixxis_logo.webp" alt="Nixxis Logo" class="w-20 md:w-30" />
          <span class="text-muted-foreground w-50 md:w-60">
            <span class="text-xs md:text-base">| Agent Portal</span>
          </span>
        </a>
      </nav>
      <div class="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form class="ml-auto flex-1 sm:flex-initial"></form>
        <n-badge v-if="true" :variant="isConnected ? 'default' : 'destructive'" :class="{ 'bg-green-500': isConnected }"
          class="hidden md:inline-flex">
          <span class="text-xs font-semibold flex items-center gap-1">

            {{ isConnected ? 'Connected' : 'Disconnected' }}
            {{ authStore.user?.extensionNumber }}
            <!-- <Wifi v-if="isConnected" class="h-3 w-3" />
            <WifiOff v-else class="h-3 w-3" /> -->
          </span>
        </n-badge>
        <n-badge v-if="true" :variant="isConnected ? 'default' : 'destructive'" :class="{ 'bg-green-500': isConnected }"
          class="md:hidden">
          <span class="text-xs font-semibold flex items-center gap-1">
            {{ authStore.user?.extensionNumber }}
          </span>
          <Wifi v-if="isConnected" class="h-4 w-4" />
          <WifiOff v-else class="h-4 w-4" />
        </n-badge>
        <n-dropdown-menu>
          <DropdownMenuTrigger as-child>
            <n-button variant="secondary" size="icon" class="rounded-full">
              <CircleUser class="h-5 w-5" />
            </n-button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div class="flex flex-col">
                <span>My Account</span>
                <span v-if="authStore.user" class="text-sm text-gray-500">
                  {{ authStore.user.username }} ({{ authStore.user.extensionNumber }})
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </n-dropdown-menu>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="grid gap-4 md:gap-8 lg:grid-cols-2">
        <n-card>
          <CardHeader>
            <CardTitle>Dialer</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-4">
              <n-button variant="outline" class="flex items-center justify-center gap-2" @click="startAICall"
                :disabled="isAICall">
                <Bot class="h-5 w-5" />
                <span>Call AI Bot</span>
              </n-button>

              <PhoneDialpad :onCall="onStartCall" />
            </div>
          </CardContent>
        </n-card>

        <n-card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-center">
              <ActiveUsersTable :on-call="onStartCall" />
            </div>
          </CardContent>
        </n-card>
      </div>
      <div>
        <CallInterface v-model="isOpen" :default-state="callState" :caller-name="callerName"
          :caller-avatar="callerAvatar" :auto-end-call="false" :auto-end-timeout="30000" @answer="handleAnswer"
          @reject="handleReject" @end="handleEnd" />
        <BotCallInterface ref="botCallInterfaceRef" v-model="isBotCallOpen" @end="handleBotCallEnd" />
      </div>
    </main>
  </div>
</template>
