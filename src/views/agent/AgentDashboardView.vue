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
import { CircleUser } from 'lucide-vue-next'
import CallHistory from '@/components/CallHistory.vue'
import { initialCalls } from '@/components/utils/data'
import PhoneDialpad from '@/components/PhoneDialpad.vue'
import {
  NDropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import CallInterface from '@/components/CallInterface.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSipStore } from '@/stores/sip'
import { getActiveUserByExtension } from '@/services/callService'
import ActiveUsersTable from '@/components/ActiveUsersTable.vue'

const calls = ref(initialCalls)
const router = useRouter()
const authStore = useAuthStore()
const sipStore = useSipStore()

// State for the call interface
const isOpen = ref(false)
const callState = ref<'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended'>('incoming')
const callerName = ref('')
const callerAvatar = ref('/path/to/avatar.jpg')

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

onMounted(async () => {
  // Load user data from storage first
  await authStore.loadFromStorage()

  // Ensure we have valid auth state
  // if (!authStore.isAuthenticated) {
  //   router.push('/login')
  //   return
  // }
  const determineWebClient = (extension: string) => {
    if (extension.startsWith('111')) {
      return 'web1'
    } else if (extension.startsWith('112')) {
      return 'web2'
    } else if (extension.startsWith('101'))
      return 'test2' // default fallback
    else if (extension.startsWith('100'))
      return 'test1'
    else
      return 'web1'
  }

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
  console.log("1234: ", callerName.value)
}

// const showCallInterface = () => {
//   isOpen.value = true
//   callState.value = 'incoming'
// }

// Event handlers
const handleAnswer = () => {
  console.log('Call answered')
  // Add your call answer logic here
  // For example, start WebRTC connection
}

const handleReject = () => {
  console.log('Call rejected')
  // Add your call rejection logic here
  // For example, send rejection signal to the other party
}

const handleEnd = () => {
}

const handleLogout = async () => {
  // Logout from SIP
  await sipStore.logout()
  // Logout from auth
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header class="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <nav class="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <a href="#" class="flex items-center gap-2 text-lg font-semibold md:text-base">
          <img src="@/assets/nixxis_logo.webp" alt="Nixxis Logo" class="w-30" />
          <span class="text-muted-foreground w-60">
            <span class="inline">| Agent Portal</span>
          </span>
        </a>
      </nav>
      <div class="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form class="ml-auto flex-1 sm:flex-initial"></form>
        <n-dropdown-menu>
          <DropdownMenuTrigger as-child>
            <n-button variant="secondary" size="icon" class="rounded-full">
              <CircleUser class="h-5 w-5" />
            </n-button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div class="flex flex-col">
                <span>Tài khoản của tôi</span>
                <span v-if="authStore.user" class="text-sm text-gray-500">
                  {{ authStore.user.username }} ({{ authStore.user.extensionNumber }})
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout">Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </n-dropdown-menu>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="grid gap-4 md:gap-8 lg:grid-cols-3">
        <n-card>
          <CardContent class="grid gap-8">
            <NTabs default-value="dialpad" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="dialpad">Quay số</TabsTrigger>
                <TabsTrigger value="contacts">Danh bạ</TabsTrigger>
              </TabsList>
              <TabsContent value="dialpad">
                <div>
                  <PhoneDialpad :onCall="onStartCall" />
                </div>

              </TabsContent>
              <TabsContent value="contacts">
                <div class="flex items-center justify-center">
                  <ActiveUsersTable :on-call="onStartCall" />
                </div>
              </TabsContent>
            </NTabs>
          </CardContent>
        </n-card>
        <n-card class="lg:col-span-2">
          <CardHeader class="flex flex-row items-center">
            <div class="grid gap-2">
              <CardTitle>Lịch sử cuộc gọi</CardTitle>
            </div>
          </CardHeader>
          <CardContent class="max-h-[calc(100vh-12rem)] overflow-y-auto">
            <CallHistory :calls="calls" :on-start-call="onStartCall" />
          </CardContent>
        </n-card>
      </div>
      <div>
        <CallInterface v-model="isOpen" :default-state="callState" :caller-name="callerName"
          :caller-avatar="callerAvatar" :auto-end-call="false" :auto-end-timeout="30000" @answer="handleAnswer"
          @reject="handleReject" @end="handleEnd" />
      </div>
    </main>
  </div>
</template>
