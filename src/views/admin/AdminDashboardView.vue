<script lang="ts">
export const description = 'An application shell with a header and main content area. The header has a navbar, a search input and and a user nav dropdown. The user nav is toggled by a button with an avatar image. The main content area is divided into two rows. The first row has a grid of cards with statistics. The second row has a grid of cards with a table of recent transactions and a list of recent sales.'
export const iframeHeight = '825px'
export const containerClass = 'w-full h-full'
</script>

<script setup lang="ts">
import { NBadge } from '@/components/ui/badge'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { onMounted } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import type { Conversation } from '@/types/conversation'

const conversationStore = useConversationStore()
onMounted(async () => {
  await conversationStore.fetchRecentConversations()
})

const getSentimentText = (sentiment: string) => {
  switch (sentiment) {
    case 'positive':
      return 'Tích cực'
    case 'negative':
      return 'Tiêu cực'
    case 'unknown':
      return 'Không xác định'
    case 'neutral':
      return 'Trung tính'
    default:
      return sentiment
  }
}

const handleRowClick = async (conversation: Conversation) => {
  const width = 1200
  const height = 800
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2
  window.open(
    `/admin/conversations/${conversation.id}`,
    'conversation-detail',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  )
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

              <div v-else-if="conversationStore.error || conversationStore.conversations.length === 0"
                class="text-center py-4">
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
                    :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                    {{ getSentimentText(conversation.sentiment) }}
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
                <TableRow v-else-if="conversationStore.error || conversationStore.conversations.length === 0">
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
                      :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                      {{ getSentimentText(conversation.sentiment) }}
                    </n-badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
          </CardContent>
        </n-card>
      </div>
    </main>

  </div>
</template>
