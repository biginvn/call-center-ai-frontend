<script lang="ts">
export const description = 'An application shell with a header and main content area. The header has a navbar, a search input and and a user nav dropdown. The user nav is toggled by a button with an avatar image. The main content area is divided into two rows. The first row has a grid of cards with statistics. The second row has a grid of cards with a table of recent transactions and a list of recent sales.'
export const iframeHeight = '825px'
export const containerClass = 'w-full h-full'
</script>

<script setup lang="ts">
import { NAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NBadge } from '@/components/ui/badge'
import { NButton } from '@/components/ui/button'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Activity, ArrowUpRight, CreditCard, DollarSign, Users } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import { formatDate } from '@/lib/utils'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'

const router = useRouter()
const conversationStore = useConversationStore()

onMounted(async () => {
  await conversationStore.fetchRecentConversations()
})

const handleViewAll = () => {
  router.push('/admin/conversations')
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
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
      </div>
      <div class="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <n-card class="xl:col-span-2">
          <CardHeader class="flex flex-row items-center">
            <div class="grid gap-2">
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Recent transactions from your store.
              </CardDescription>
            </div>
            <n-button as-child size="sm" class="ml-auto gap-1">
              <a href="#">
                View All
                <ArrowUpRight class="h-4 w-4" />
              </a>
            </n-button>
          </CardHeader>
          <CardContent>
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Recent Conversations</h3>
              <n-button variant="outline" @click="handleViewAll">
                View All
              </n-button>
            </div>
            <n-table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead class="hidden xl:table-column">
                    Type
                  </TableHead>
                  <TableHead class="hidden xl:table-column">
                    Status
                  </TableHead>
                  <TableHead class="hidden xl:table-column">
                    Date
                  </TableHead>
                  <TableHead class="text-right">
                    Mood
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="conversationStore.loading">
                  <TableCell colspan="5" class="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="conversationStore.error">
                  <TableCell colspan="5" class="text-center text-red-500">
                    {{ conversationStore.error }}
                  </TableCell>
                </TableRow>
                <TableRow v-else-if="conversationStore.conversations.length === 0">
                  <TableCell colspan="5" class="text-center">
                    No conversations found
                  </TableCell>
                </TableRow>
                <TableRow v-for="conversation in conversationStore.conversations" :key="conversation._id || ''">
                  <TableCell>
                    <div class="font-medium">
                      {{ conversation.from_user.name }}
                    </div>
                    <div class="hidden text-sm text-muted-foreground md:inline">
                      {{ conversation.from_user.email }}
                    </div>
                  </TableCell>
                  <TableCell class="hidden xl:table-column">
                    {{ conversation.type }}
                  </TableCell>
                  <TableCell class="hidden xl:table-column">
                    <n-badge class="text-xs" :variant="conversation.status === 'closed' ? 'default' : 'outline'">
                      {{ conversation.status }}
                    </n-badge>
                  </TableCell>
                  <TableCell class="hidden md:table-cell lg:hidden xl:table-column">
                    {{ formatDate(conversation.created_at) }}
                  </TableCell>
                  <TableCell class="text-right">
                    <n-badge class="text-xs"
                      :variant="conversation.mood === 'positive' ? 'default' : conversation.mood === 'negative' ? 'destructive' : 'outline'">
                      {{ conversation.mood }}
                    </n-badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
          </CardContent>
        </n-card>
        <n-card>
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
        </n-card>
      </div>
    </main>
  </div>
</template>
