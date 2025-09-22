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
import { CircleUser, Phone } from 'lucide-vue-next'
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
import AiCallService from '@/services/AiCallService'
import axiosInstance from '@/services/axiosInstance'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { ConfigurationData } from '@/services/AiCallService'
import { NTabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TooltipProvider from '@/components/ui/tooltip/TooltipProvider.vue'
import TooltipTrigger from '@/components/ui/tooltip/TooltipTrigger.vue'
import TooltipContent from '@/components/ui/tooltip/TooltipContent.vue'
import TooltipComponent from '@/components/ui/tooltip/TooltipComponent.vue'
import { loadConfig, type RuntimeConfig } from '@/config'

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
const config = ref<ConfigurationData | null>(null)
const runtimeConfig = ref<RuntimeConfig | null>(null)

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

  // Load runtime config
  try {
    runtimeConfig.value = await loadConfig()
  } catch (e) {
    console.error('Failed to load runtime config', e)
  }

  // Hydrate config from AiCallService
  try {
    config.value = await AiCallService.getConfig()
  } catch (e) {
    console.error('Failed to load config', e)
  }

  // Ensure we have valid auth state
  // if (!authStore.isAuthenticated) {
  //   router.push('/login')
  //   return
  // }

  // Initialize SIP if we have user data
  if (authStore.user?.extensionNumber) {
    const extension = authStore.user.extension || localStorage.getItem('extension') || ''
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
        // Validate extension format (should be internal extension, not phone number)
        if (extension.length > 4 || !/^\d+$/.test(extension)) {
          return {
            success: false,
            error: 'Invalid extension format. Only use internal extension numbers.'
          }
        }

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

          // Return clear message when no agents available
          if (extensions.length === 0) {
            return {
              success: true,
              extensions: [],
              message: 'Hiện tại không có nhân viên nào đang online.'
            }
          }

          return { success: true, extensions }
        } catch (error) {
          console.error('Error getting active users:', error)
          return { success: false, error }
        }
      },
      submitBooking: async ({ name, phone, note }: { name: string; phone: string; note: string }) => {
        try {
          const formData = new FormData()
          formData.append('entry.772353118', name)
          formData.append('entry.641869429', phone)
          formData.append('entry.738069106', note)

          await fetch('https://docs.google.com/forms/u/0/d/e/1FAIpQLScM-MAZXm0o2BbphmvfbDAS55G7ytUU_VbYvdu4Yqfh0bMcIg/formResponse', {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Required for Google Forms
          })

          return {
            success: true,
            message: 'Thông tin đã được gửi thành công. Nhân viên sẽ liên lạc với anh/chị sớm nhất.'
          }
        } catch (error) {
          console.error('Error submitting booking:', error)
          return {
            success: false,
            error: 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại sau.'
          }
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
          type: "realtime",
          modalities: ['text', 'audio'],
          tools: [
            {
              type: 'function',
              name: 'callAgent',
              description: 'CHỈ sử dụng để kết nối khách hàng với tổng đài viên khi khách YÊU CẦU nói chuyện trực tiếp. KHÔNG BAO GIỜ sử dụng số điện thoại khách hàng làm extension. CHỈ sử dụng extension từ danh sách getActiveAgent. PHẢI có sự xác nhận rõ ràng từ khách trước khi gọi.',

              parameters: {
                type: 'object',
                properties: {
                  extension: {
                    type: 'string',
                    description: 'Extension number của tổng đài viên. KHÔNG PHẢI số điện thoại khách hàng.'
                  }
                },
                required: ['extension']
              }
            },
            {
              type: 'function',
              name: 'getActiveAgent',
              description: 'Kiểm tra danh sách tổng đài viên đang online. Sử dụng trước khi đề nghị chuyển cuộc gọi.',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              type: 'function',
              name: 'submitBooking',
              description: 'Gửi thông tin đặt lịch, đặt tour hoặc ghi chú của khách hàng đến nhân viên. Sử dụng khi khách hàng muốn để lại thông tin để nhân viên liên lạc lại.',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Họ và tên của khách hàng'
                  },
                  phone: {
                    type: 'string',
                    description: 'Số điện thoại của khách hàng'
                  },
                  note: {
                    type: 'string',
                    description: 'Ghi chú về tour quan tâm, thời gian đi, yêu cầu đặc biệt, hoặc tóm tắt cuộc hội thoại'
                  }
                },
                required: ['name', 'phone', 'note']
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

    let sessionCreated = false; // Track if session.created has been received
    dataChannel.addEventListener('message', async (ev) => {
      const msg = JSON.parse(ev.data) as { type: string; name: keyof typeof fns; arguments: string; call_id: string }
      // Trigger response.create only after session is created and not before
      if (!sessionCreated && (msg.type === 'session.created' || msg.type === 'assistant.speaking')) {
        sessionCreated = true;
        dataChannel.send(JSON.stringify({ type: 'response.create' }));
      }
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

    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03`, {
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
        <TooltipProvider>
          <TooltipComponent>
            <TooltipTrigger as-child>
              <div class="flex items-center gap-2">
                <n-badge v-if="true" :variant="isConnected ? 'default' : 'destructive'"
                  :class="{ 'bg-green-500': isConnected }" class="hidden md:inline-flex">
                  <span class="text-xs font-semibold flex items-center gap-1">
                    {{ isConnected ? 'Connected' : 'Disconnected' }}
                    {{ authStore.user?.extensionNumber }}
                  </span>
                </n-badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                This shows the connection status between agents. It does <b>not</b> indicate connection to the
                voicebot.<br /><br />
                <b>Having connection issues?</b><br />
                Please open <a :href="`https://${runtimeConfig?.SIP_SERVER}:8089/`" target="_blank"
                  rel="noopener noreferrer" class="underline text-blue-600">https://{{ runtimeConfig?.SIP_SERVER
                  }}:8089/</a> in your browser and click <b>Advanced</b>
                &rarr; <b>Proceed</b> to allow the <code>ERR_CERT_AUTHORITY_INVALID</code> warning.
              </p>
            </TooltipContent>
          </TooltipComponent>
        </TooltipProvider>
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
                <span v-if="authStore.user && authStore.user.client_name" class="text-xs text-gray-400">
                  {{ authStore.user.client_name }}
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
          <CardContent>
            <n-tabs default-value="ai-bot" class="w-full">
              <TabsList class="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ai-bot">AI Bot</TabsTrigger>
                <TabsTrigger value="dialpad">Dial Pad</TabsTrigger>
              </TabsList>
              <TabsContent value="ai-bot">
                <div class="flex flex-col items-center gap-4">
                  <div
                    class="w-24 h-24 rounded-full flex items-center justify-center shadow-lg mb-4 overflow-hidden bg-primary">
                    <img src="/src/assets/Diallog.png" alt="AI Avatar" class="w-full h-full object-cover" />
                  </div>
                  <h2 class="text-2xl font-bold text-slate-900 mb-2">Start a New Call</h2>
                  <p class="text-slate-600 mb-8">Connect with your DialoggAI Voicebot for instant help and support</p>
                  <n-button
                    class=" text-white px-8 py-4 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center gap-2"
                    @click="startAICall" :disabled="isAICall">
                    <Phone class="w-6 h-6 mr-2" />
                    Call AI Bot
                  </n-button>
                </div>
              </TabsContent>
              <TabsContent value="dialpad">
                <div class="flex flex-col items-center gap-4">
                  <PhoneDialpad :onCall="onStartCall" />
                </div>
              </TabsContent>
            </n-tabs>
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
