<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { NBadge } from '@/components/ui/badge'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NButton } from '@/components/ui/button'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { listCallsV2 } from '@/services/callsServiceV2'
import type { CallResponseV2 } from '@/services/callsServiceV2'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'vue-router'
import { Phone, Clock, Loader2, ArrowLeft } from 'lucide-vue-next'
import {
  NPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { computed } from 'vue'

import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()
const calls = ref<CallResponseV2[]>([])
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

const sortedCalls = computed(() => {
  return [...calls.value].sort((a, b) => {
    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  })
})

const paginatedCalls = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return sortedCalls.value.slice(start, end)
})


const formatDate = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

const formatDuration = (start: string, end?: string | null, durationSeconds?: number) => {
  if (durationSeconds !== undefined && durationSeconds > 0) {
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = Math.floor(durationSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  if (!end) return 'Ongoing'
  try {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const seconds = Math.floor((endTime - startTime) / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  } catch {
    return '-'
  }
}

const getMoodText = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive':
      return t('calls.mood.positive')
    case 'negative':
      return t('calls.mood.negative')
    case 'unknown':
      return t('calls.mood.unknown')
    case 'neutral':
      return t('calls.mood.neutral')
    default:
      return sentiment || t('calls.mood.unknown')
  }
}

const loadCalls = async () => {
  try {
    loading.value = true
    error.value = ''
    calls.value = await listCallsV2()
  } catch (err) {
    error.value = 'Failed to load calls'
    console.error('Error loading calls:', err)
    toast.error('Error loading calls', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

const handleRowClick = (call: CallResponseV2) => {
  router.push(`/v2/calls/${call.id}`)
}

const goBack = () => {
  if (authStore.user?.role === 'admin') {
    router.push('/v2/admin')
  } else {
    router.push('/v2/dashboard')
  }
}

onMounted(() => {
  loadCalls()
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header
      class="sticky top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <n-button variant="ghost" size="icon" @click="goBack" class="flex-shrink-0">
          <ArrowLeft class="h-5 w-5" />
        </n-button>
        <div class="grid gap-1">
          <h1 class="text-xl font-bold flex items-center gap-2">
            <Phone class="h-6 w-6" />
            {{ t('calls.title') }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('calls.subtitle') }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <LanguageSwitcher />
        <n-button variant="outline" @click="loadCalls" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin mr-2" />
          <span>{{ t('common.refresh') }}</span>
        </n-button>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <n-card>
        <CardHeader>
          <CardTitle>{{ t('calls.title') }}</CardTitle>
          <CardDescription>
            {{ t('calls.subtitle') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Mobile View -->
          <div class="md:hidden space-y-4">
            <div v-if="loading" class="text-center py-8">
              <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
              <p class="text-sm text-gray-500">{{ t('calls.loading') }}</p>
            </div>
            <div v-else-if="error" class="text-center py-8 text-red-500">
              {{ error }}
            </div>
            <div v-else-if="calls.length === 0" class="text-center py-8 text-gray-500">
              {{ t('calls.noCalls') }}
            </div>
            <div v-else>
              <div v-for="call in paginatedCalls" :key="call.id"
                class="bg-card rounded-lg border p-4 space-y-2 cursor-pointer hover:bg-accent"
                @click="handleRowClick(call)">
                <div class="flex justify-between items-start">
                  <div class="space-y-1">
                    <div class="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock class="h-3 w-3" />
                      {{ formatDate(call.start_time) }}
                    </div>
                    <div class="font-medium flex items-center gap-2">
                      <Phone class="h-4 w-4" />
                      {{ call.customer_phone || 'Unknown' }}
                    </div>
                    <div class="text-xs text-gray-500">
                      Duration: {{ formatDuration(call.start_time, call.end_time, call.duration_seconds) }}
                    </div>
                    <div v-if="call.sentiment" class="mt-1">
                      <n-badge class="text-xs" :class="{ 'bg-green-500': call.sentiment === 'positive' }"
                        :variant="call.sentiment === 'positive' ? 'default' : call.sentiment === 'negative' ? 'destructive' : 'outline'">
                        {{ getMoodText(call.sentiment) }}
                      </n-badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile Pagination -->
            <div class="mt-4 flex justify-center" v-if="calls.length > 0">
              <NPagination v-if="calls.length > itemsPerPage" v-model:page="currentPage" :total="calls.length"
                :items-per-page="itemsPerPage" :sibling-count="1" show-edges>
                <PaginationContent v-slot="{ items }">
                  <PaginationPrevious />
                  <template v-for="(item, index) in items">
                    <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value">
                      {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else :key="item.type" :index="index" />
                  </template>
                  <PaginationNext />
                </PaginationContent>
              </NPagination>
            </div>
          </div>

          <!-- Desktop View -->
          <n-table class="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('calls.table.date') }}</TableHead>
                <TableHead>{{ t('calls.table.customerPhone') }}</TableHead>
                <TableHead>{{ t('calls.table.startTime') }}</TableHead>
                <TableHead>{{ t('calls.table.endTime') }}</TableHead>
                <TableHead>{{ t('calls.table.duration') }}</TableHead>
                <TableHead>{{ t('calls.table.sentiment') }}</TableHead>
                <TableHead class="text-right">{{ t('calls.table.actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="loading">
                <TableRow>
                  <TableCell colspan="7" class="text-center">
                    <Loader2 class="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="error || calls.length === 0">
                <TableRow>
                  <TableCell colspan="7" class="text-center">
                    {{ error || 'No calls found' }}
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow v-for="call in paginatedCalls" :key="call.id" class="cursor-pointer hover:bg-accent"
                  @click="handleRowClick(call)">
                  <TableCell>
                    <div class="flex items-center gap-1 text-sm">
                      <Clock class="h-3 w-3" />
                      {{ formatDate(call.start_time) }}
                    </div>
                  </TableCell>
                  <TableCell class="font-medium">
                    <div class="flex items-center gap-2">
                      <Phone class="h-4 w-4" />
                      {{ call.customer_phone || 'Unknown' }}
                    </div>
                  </TableCell>
                  <TableCell>
                    {{ new Date(call.start_time).toLocaleString() }}
                  </TableCell>
                  <TableCell>
                    {{ call.end_time ? new Date(call.end_time).toLocaleString() : 'Ongoing' }}
                  </TableCell>
                  <TableCell>
                    {{ formatDuration(call.start_time, call.end_time, call.duration_seconds) }}
                  </TableCell>
                  <TableCell>
                    <n-badge v-if="call.sentiment" class="text-xs"
                      :class="{ 'bg-green-500': call.sentiment === 'positive' }"
                      :variant="call.sentiment === 'positive' ? 'default' : call.sentiment === 'negative' ? 'destructive' : 'outline'">
                      {{ getMoodText(call.sentiment) }}
                    </n-badge>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <n-button size="sm" variant="outline" @click.stop="handleRowClick(call)">
                      {{ t('common.viewDetails') }}
                    </n-button>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </n-table>

          <!-- Desktop Pagination -->
          <div class="mt-4 flex justify-end" v-if="calls.length > itemsPerPage">
            <NPagination v-model:page="currentPage" :total="calls.length" :items-per-page="itemsPerPage"
              :sibling-count="1" show-edges>
              <PaginationContent v-slot="{ items }">
                <PaginationPrevious />
                <template v-for="(item, index) in items">
                  <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value">
                    {{ item.value }}
                  </PaginationItem>
                  <PaginationEllipsis v-else :key="item.type" :index="index" />
                </template>
                <PaginationNext />
              </PaginationContent>
            </NPagination>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
