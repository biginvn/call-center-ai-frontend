<script lang="ts">
export const description = 'An application shell with a header and main content area. The header has a navbar, a search input and and a user nav dropdown. The user nav is toggled by a button with an avatar image. The main content area is divided into two rows. The first row has a grid of cards with statistics. The second row has a grid of cards with a table of recent transactions and a list of recent sales.'
export const iframeHeight = '825px'
export const containerClass = 'w-full h-full'
</script>

<script setup lang="ts">
import { NBadge } from '@/components/ui/badge'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { onMounted, ref } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NDialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Conversation } from '@/types/conversation'

const conversationStore = useConversationStore()
const selectedConversation = ref<Conversation | null>(null)
const isDialogOpen = ref(false)

onMounted(async () => {
  await conversationStore.fetchRecentConversations()
})

const getMoodText = (mood: string) => {
  switch (mood) {
    case 'positive':
      return 'Tích cực'
    case 'negative':
      return 'Tiêu cực'
    case 'unknown':
      return 'Không xác định'
    case 'neutral':
      return 'Trung tính'
    default:
      return mood
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'start':
      return 'Bắt đầu'
    case 'accept':
      return 'Trả lời'
    case 'decline':
      return 'Từ chối'
    case 'closed':
      return 'Đã đóng'
    default:
      return status
  }
}

const handleRowClick = async (conversation: Conversation) => {
  selectedConversation.value = conversation
  isDialogOpen.value = true
  await conversationStore.fetchConversationById(conversation.id)
  if (conversationStore.currentConversation) {
    selectedConversation.value = conversationStore.currentConversation
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <!-- <div class="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <n-card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              $45,231.89
            </div>
            <p class="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </n-card>
        <n-card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Subscriptions
            </CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              +2350
            </div>
            <p class="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </n-card>
        <n-card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Sales
            </CardTitle>
            <CreditCard class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              +12,234
            </div>
            <p class="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </n-card>
        <n-card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">
              Active Now
            </CardTitle>
            <Activity class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              +573
            </div>
            <p class="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </CardContent>
        </n-card>
      </div> -->
      <div class="grid">
        <n-card class="">
          <CardHeader class="flex flex-row items-center">
            <div class="grid gap-2">
              <CardTitle>Bản ghi cuộc gọi
              </CardTitle>
              <CardDescription>

              </CardDescription>
            </div>
            <!-- <n-button as-child size="sm" class="ml-auto gap-1">
              <a href="#">
                View All
                <ArrowUpRight class="h-4 w-4" />
              </a>
            </n-button> -->
          </CardHeader>
          <CardContent>
            <!-- Mobile View -->
            <div class="md:hidden space-y-4">
              <div v-if="conversationStore.loading" class="text-center py-4">
                Đang tải...
              </div>
              <div v-else-if="conversationStore.error" class="text-center text-red-500 py-4">
                {{ conversationStore.error }}
              </div>
              <div v-else-if="conversationStore.conversations.length === 0" class="text-center py-4">
                Không có bản ghi cuộc gọi
              </div>
              <div v-else v-for="conversation in conversationStore.conversations" :key="conversation.id"
                class="bg-card rounded-lg border p-4 space-y-2 cursor-pointer hover:bg-accent"
                @click="handleRowClick(conversation)">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <div class="text-sm text-muted-foreground">{{ formatDate(conversation.created_at) }}</div>
                    <div class="font-medium">{{ conversation.from_user.fullname }} → {{ conversation.to_user.fullname }}
                    </div>
                  </div>
                  <n-badge class="text-xs"
                    :variant="conversation.mood === 'positive' ? 'default' : conversation.mood === 'negative' ? 'destructive' : 'outline'">
                    {{ getMoodText(conversation.mood) }}
                  </n-badge>
                </div>
              </div>
            </div>

            <!-- Desktop View -->
            <n-table class="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead class="col-span-3 md:col-span-2">Ngày</TableHead>
                  <TableHead class="col-span-3 md:col-span-2">Từ</TableHead>
                  <TableHead class="col-span-3 md:col-span-2">Đến</TableHead>
                  <TableHead class="hidden md:table-cell md:col-span-5">Tóm tắt</TableHead>
                  <TableHead class="col-span-3 md:col-span-1 text-right">Tâm trạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="conversationStore.loading">
                  <TableCell colspan="12" class="text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="conversationStore.error">
                  <TableCell colspan="12" class="text-center text-red-500">
                    {{ conversationStore.error }}
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="conversationStore.conversations.length === 0">
                  <TableCell colspan="12" class="text-center">
                    Không có bản ghi cuộc gọi
                  </TableCell>
                </TableRow>
                <TableRow v-for="conversation in conversationStore.conversations" :key="conversation.id"
                  class="cursor-pointer hover:bg-accent" @click="handleRowClick(conversation)">
                  <TableCell class="col-span-3 md:col-span-2">
                    {{ formatDate(conversation.created_at) }}
                  </TableCell>
                  <TableCell class="col-span-3 md:col-span-2">
                    {{ conversation.from_user.fullname }}
                  </TableCell>
                  <TableCell class="col-span-3 md:col-span-2">
                    {{ conversation.to_user.fullname }}
                  </TableCell>
                  <TableCell class="hidden md:table-cell md:col-span-5 whitespace-pre-wrap">
                    {{ conversation.summarize ? (conversation.summarize.length > 300 ?
                      conversation.summarize.substring(0, 300) + '...' : conversation.summarize) : '-' }}
                  </TableCell>
                  <TableCell class="col-span-3 md:col-span-1 text-right">
                    <n-badge class="text-xs"
                      :variant="conversation.mood === 'positive' ? 'default' : conversation.mood === 'negative' ? 'destructive' : 'outline'">
                      {{ getMoodText(conversation.mood) }}
                    </n-badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
          </CardContent>
        </n-card>
        <!-- <n-card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-8">
            <div class="flex items-center gap-4">
              <n-avatar class="hidden h-9 w-9 sm:flex">
                <AvatarImage src="/avatars/01.png" alt="Avatar" />
                <AvatarFallback>OM</AvatarFallback>
              </n-avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  Olivia Martin
                </p>
                <p class="text-sm text-muted-foreground">
                  olivia.martin@email.com
                </p>
              </div>
              <div class="ml-auto font-medium">
                +$1,999.00
              </div>
            </div>
            <div class="flex items-center gap-4">
              <n-avatar class="hidden h-9 w-9 sm:flex">
                <AvatarImage src="/avatars/02.png" alt="Avatar" />
                <AvatarFallback>JL</AvatarFallback>
              </n-avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  Jackson Lee
                </p>
                <p class="text-sm text-muted-foreground">
                  jackson.lee@email.com
                </p>
              </div>
              <div class="ml-auto font-medium">
                +$39.00
              </div>
            </div>
            <div class="flex items-center gap-4">
              <n-avatar class="hidden h-9 w-9 sm:flex">
                <AvatarImage src="/avatars/03.png" alt="Avatar" />
                <AvatarFallback>IN</AvatarFallback>
              </n-avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  Isabella Nguyen
                </p>
                <p class="text-sm text-muted-foreground">
                  isabella.nguyen@email.com
                </p>
              </div>
              <div class="ml-auto font-medium">
                +$299.00
              </div>
            </div>
            <div class="flex items-center gap-4">
              <n-avatar class="hidden h-9 w-9 sm:flex">
                <AvatarImage src="/avatars/04.png" alt="Avatar" />
                <AvatarFallback>WK</AvatarFallback>
              </n-avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  William Kim
                </p>
                <p class="text-sm text-muted-foreground">
                  will@email.com
                </p>
              </div>
              <div class="ml-auto font-medium">
                +$99.00
              </div>
            </div>
            <div class="flex items-center gap-4">
              <n-avatar class="hidden h-9 w-9 sm:flex">
                <AvatarImage src="/avatars/05.png" alt="Avatar" />
                <AvatarFallback>SD</AvatarFallback>
              </n-avatar>
              <div class="grid gap-1">
                <p class="text-sm font-medium leading-none">
                  Sofia Davis
                </p>
                <p class="text-sm text-muted-foreground">
                  sofia.davis@email.com
                </p>
              </div>
              <div class="ml-auto font-medium">
                +$39.00
              </div>
            </div>
          </CardContent>
        </n-card> -->
      </div>
    </main>

    <!-- Detail Modal -->
    <n-dialog v-model:open="isDialogOpen"
      class="!p-0 !m-0 !max-w-none md:!max-w-none !w-screen md:!w-screen !h-screen md:!h-screen">
      <DialogContent class="!p-0 !m-0 !max-w-none !w-screen md:!w-screen !h-screen md:!h-screen flex flex-col">
        <div class="min-h-screen bg-background p-4">
          <!-- Main Grid Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Call Summary -->
            <n-card>
              <CardHeader>
                <CardTitle class="text-lg">Tóm tắt cuộc gọi</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <p class="text-muted-foreground text-sm mb-2">Từ</p>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {{ selectedConversation?.from_user.fullname.charAt(0) }}
                    </div>
                    <span>{{ selectedConversation?.from_user.fullname }}</span>
                  </div>
                </div>

                <div>
                  <p class="text-muted-foreground text-sm mb-2">Đến</p>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {{ selectedConversation?.to_user.fullname.charAt(0) }}
                    </div>
                    <span>{{ selectedConversation?.to_user.fullname }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-muted-foreground text-sm">
                  <i class="i-lucide-clock w-4 h-4"></i>
                  <span>{{ formatDate(selectedConversation?.created_at || '') }}</span>
                </div>

                <div>
                  <p class="text-muted-foreground text-sm mb-2">Thời lượng cuộc gọi</p>
                  <div class="flex items-center gap-2">
                    <i class="i-lucide-clock w-4 h-4 text-muted-foreground"></i>
                    <span class="font-mono">00:24:18</span>
                  </div>
                </div>

                <div>
                  <p class="text-muted-foreground text-sm mb-2">Tâm trạng khách hàng</p>
                  <div class="flex items-center gap-2">
                    <i class="i-lucide-tag w-4 h-4 text-muted-foreground"></i>
                    <n-badge class="text-xs"
                      :variant="selectedConversation?.mood === 'positive' ? 'default' : selectedConversation?.mood === 'negative' ? 'destructive' : 'outline'">
                      {{ getMoodText(selectedConversation?.mood || '') }}
                    </n-badge>
                  </div>
                </div>

                <div class="bg-muted p-3 rounded text-sm text-muted-foreground leading-relaxed">
                  {{ selectedConversation?.summarize || 'Không có tóm tắt' }}
                </div>
              </CardContent>
            </n-card>

            <!-- Sentiment Analysis & Transcript -->
            <n-card>
              <CardHeader>
                <CardTitle class="text-lg">Sentiment analysis</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="relative w-16 h-16 mx-auto mb-2">
                      <svg class="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="rgb(34, 197, 94)" stroke-width="4" fill="none"
                          stroke-dasharray="176" stroke-dashoffset="44" />
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-green-500 font-bold text-lg">8</span>
                      </div>
                    </div>
                    <p class="text-muted-foreground text-xs">Overall feel</p>
                    <p class="text-sm font-medium">Good</p>
                  </div>

                  <div class="text-center">
                    <div class="relative w-16 h-16 mx-auto mb-2">
                      <svg class="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="rgb(34, 197, 94)" stroke-width="4" fill="none"
                          stroke-dasharray="176" stroke-dashoffset="20" />
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-green-500 font-bold text-lg">9</span>
                      </div>
                    </div>
                    <p class="text-muted-foreground text-xs">Agent feel</p>
                    <p class="text-sm font-medium">Good</p>
                  </div>

                  <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                      <span class="text-muted-foreground text-2xl">-</span>
                    </div>
                    <p class="text-muted-foreground text-xs">Customer feel</p>
                    <p class="text-sm font-medium">Unknown</p>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-medium mb-4">Transcript</h3>
                  <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    <div v-if="conversationStore.loading"
                      class="flex items-center justify-center h-[200px] text-muted-foreground">
                      Đang tải cuộc hội thoại...
                    </div>
                    <div v-else-if="!selectedConversation?.messages || selectedConversation.messages.length === 0"
                      class="flex items-center justify-center h-[200px] text-muted-foreground">
                      Không có chi tiết cuộc hội thoại
                    </div>
                    <div v-else v-for="message in selectedConversation.messages" :key="message.id" :class="[
                      'flex space-x-2',
                      message.sender_id.id === selectedConversation.from_user.id ? 'justify-end' : 'justify-start'
                    ]">
                      <div v-if="message.sender_id.id !== selectedConversation.from_user.id"
                        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {{ message.sender_id.fullname.charAt(0) }}
                      </div>
                      <div :class="[
                        'flex flex-col',
                        message.sender_id.id === selectedConversation.from_user.id ? 'items-end' : 'items-start'
                      ]">
                        <span class="text-sm font-medium">{{ message.sender_id.fullname }}</span>
                        <div :class="[
                          'p-3 rounded-lg max-w-[70%]',
                          message.sender_id.id === selectedConversation.from_user.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        ]">
                          <p class="text-sm">{{ message.content }}</p>
                        </div>
                        <div class="flex items-center space-x-2 mt-1">
                          <n-badge class="text-xs"
                            :variant="message.mood === 'positive' ? 'default' : message.mood === 'negative' ? 'destructive' : 'outline'">
                            {{ getMoodText(message.mood) }}
                          </n-badge>
                        </div>
                      </div>
                      <div v-if="message.sender_id.id === selectedConversation.from_user.id"
                        class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {{ message.sender_id.fullname.charAt(0) }}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </n-card>

            <!-- Topics & Next Best Action -->
            <div class="space-y-6">
              <n-card>
                <CardHeader>
                  <CardTitle class="text-lg">Topics</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-muted-foreground">Topic 1</span>
                    <span class="font-medium">40%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full">
                    <div class="h-full bg-primary rounded-full" style="width: 40%"></div>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-muted-foreground">Topic 2</span>
                    <span class="font-medium">15%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full">
                    <div class="h-full bg-primary rounded-full" style="width: 15%"></div>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-muted-foreground">Topic 3</span>
                    <span class="font-medium">40%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full">
                    <div class="h-full bg-primary rounded-full" style="width: 40%"></div>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-muted-foreground">Topic 4</span>
                    <span class="font-medium">5%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-full">
                    <div class="h-full bg-primary rounded-full" style="width: 5%"></div>
                  </div>
                </CardContent>
              </n-card>

              <n-card>
                <CardHeader>
                  <CardTitle class="text-lg">Next Best Action</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="text-muted-foreground text-sm leading-relaxed">
                    <p class="mb-3">
                      <strong>Contacter le client pour confirmer qu'il parle français.</strong> "Dites français. Pour le
                      français. Dites français."
                    </p>
                    <p class="mb-3">
                      <strong>Transférer l'appel à un agent francophone.</strong> "Pour le français. Dites français."
                    </p>
                    <p>
                      <strong>S'excuser auprès du client pour le temps d'attente et le remercier de sa
                        patience.</strong>{" "}
                      "Bonjour, bienvenue. Au support Nixis."
                    </p>
                  </div>
                </CardContent>
              </n-card>
            </div>
          </div>
        </div>
      </DialogContent>
    </n-dialog>
  </div>
</template>
