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
import type { Conversation } from '@/types/conversation'
import { NButton } from '@/components/ui/button'

const conversationStore = useConversationStore()
const currentPage = ref(1)
const pageSize = ref(10)

const getMoodText = (mood: string) => {
  switch (mood) {
    case 'positive':
      return 'Positive'
    case 'negative':
      return 'Negative'
    case 'unknown':
      return 'Unknown'
    case 'neutral':
      return 'Neutral'
    default:
      return mood
  }
}

onMounted(async () => {
  await conversationStore.fetchRecentConversations(currentPage.value, pageSize.value)
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await conversationStore.fetchRecentConversations(currentPage.value, pageSize.value)
}

const handlePageSizeChange = async (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  await conversationStore.fetchRecentConversations(currentPage.value, pageSize.value)
}


const handleRowClick = async (conversation: Conversation) => {
  const width = 1500
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
      <div class="grid">
        <n-card class="">
          <CardHeader class="flex flex-row items-center justify-between">
            <div class="grid gap-2">
              <CardTitle>Call Records</CardTitle>
              <CardDescription>
                Page {{ currentPage }} / {{ conversationStore.pagination.total_pages }}
              </CardDescription>
            </div>
            <div class="flex items-center gap-2">
              <select v-model="pageSize" @change="handlePageSizeChange(Number(pageSize))"
                class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors">
                <option :value="10">10 / page</option>
                <option :value="20">20 / page</option>
                <option :value="50">50 / page</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <!-- Mobile View -->
            <div class="md:hidden space-y-4">
              <div v-if="conversationStore.loading" class="text-center py-4">
                Loading...
              </div>

              <div v-else-if="conversationStore.error || conversationStore.conversations.length === 0"
                class="text-center py-4">
                No call records
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
                  <n-badge class="text-xs" :class="{ 'bg-green-500': conversation.sentiment === 'positive' }"
                    :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                    {{ getMoodText(conversation.sentiment) }}
                  </n-badge>
                </div>
              </div>
            </div>

            <!-- Desktop View -->
            <n-table class="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead class="col-span-3 md:col-span-2">Date</TableHead>
                  <TableHead class="col-span-3 md:col-span-2">From</TableHead>
                  <TableHead class="col-span-3 md:col-span-2">To</TableHead>
                  <TableHead class="hidden md:table-cell md:col-span-5">Summary</TableHead>
                  <TableHead class="col-span-3 md:col-span-1 text-right">Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="conversationStore.loading">
                  <TableCell colspan="12" class="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
                <template v-else>
                  <TableRow v-if="conversationStore.error || conversationStore.conversations.length === 0">
                    <TableCell colspan="12" class="text-center">
                      No call records
                    </TableCell>
                  </TableRow>
                  <TableRow v-else v-for="conversation in conversationStore.conversations" :key="conversation.id"
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
                      <n-badge class="text-xs" :class="{ 'bg-green-500': conversation.sentiment === 'positive' }"
                        :variant="conversation.sentiment === 'positive' ? 'default' : conversation.sentiment === 'negative' ? 'destructive' : 'outline'">
                        {{ getMoodText(conversation.sentiment) }}
                      </n-badge>
                    </TableCell>
                  </TableRow>
                </template>
              </TableBody>
            </n-table>

            <!-- Pagination Controls -->
            <div class="flex items-center justify-between mt-4">
              <div class="text-sm text-muted-foreground">
                Showing {{ conversationStore.conversations.length }} / {{ conversationStore.pagination.total_items }}
                records
              </div>
              <div class="flex items-center gap-2">
                <n-button variant="outline" :disabled="currentPage === 1" @click="handlePageChange(currentPage - 1)">
                  Previous
                </n-button>
                <n-button variant="outline" :disabled="currentPage === conversationStore.pagination.total_pages"
                  @click="handlePageChange(currentPage + 1)">
                  Next
                </n-button>
              </div>
            </div>
          </CardContent>
        </n-card>
      </div>
    </main>

  </div>
</template>
