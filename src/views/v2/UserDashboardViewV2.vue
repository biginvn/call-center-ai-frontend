<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { listCallsV2 } from '@/services/callsServiceV2'
import { listAppointmentsV2 } from '@/services/appointmentsServiceV2'
import type { CallResponseV2 } from '@/services/callsServiceV2'
import type { CallbackRequest } from '@/services/appointmentsServiceV2'
import { toast } from 'vue-sonner'
import { Phone, Calendar, Clock, Loader2, History } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'vue-router'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()
const calls = ref<CallResponseV2[]>([])
const appointments = ref<CallbackRequest[]>([])
const loading = ref(false)

const loadData = async () => {
  try {
    loading.value = true
    const fetchedCalls = await listCallsV2()
    calls.value = fetchedCalls.sort((a, b) => {
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    })
    appointments.value = await listAppointmentsV2()
  } catch (err) {
    console.error('Error loading data:', err)
    toast.error('Error loading data', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

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

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header
      class="sticky top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10 flex items-center justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-bold">{{ t('common.dashboard') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('common.welcome', { name: authStore.user?.username }) }}
        </p>
      </div>
      <div class="flex gap-2">
        <LanguageSwitcher />
        <n-button variant="outline" @click="router.push('/v2/ai-training')">
          {{ t('navigation.configureAI') }}
        </n-button>
        <n-button variant="outline" @click="loadData" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin mr-2" />
          <span>{{ t('common.refresh') }}</span>
        </n-button>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Call History -->
        <n-card>
          <CardHeader>
            <div class="flex items-center gap-2">
              <History class="h-5 w-5" />
              <CardTitle>{{ t('calls.title') }}</CardTitle>
            </div>
            <CardDescription>
              {{ t('calls.recentSubtitle') }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="text-center py-4">
              <Loader2 class="h-6 w-6 animate-spin mx-auto" />
            </div>
            <div v-else-if="calls.length === 0" class="text-center py-4 text-gray-500">
              {{ t('calls.noCalls') }}
            </div>
            <div v-else class="space-y-3">
              <div v-for="call in calls.slice(0, 5)" :key="call.id"
                class="flex items-start justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                @click="router.push(`/v2/calls/${call.id}`)">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Phone class="h-4 w-4 text-gray-500" />
                    <span class="font-medium">{{ call.customer_phone || 'Unknown' }}</span>
                  </div>
                  <div class="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ formatDate(call.start_time) }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    Duration: {{ formatDuration(call.start_time, call.end_time, call.duration_seconds) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="calls.length > 5" class="mt-4">
              <n-button variant="outline" class="w-full" @click="router.push('/v2/calls')">
                {{ t('navigation.viewAllCalls') }}
              </n-button>
            </div>
          </CardContent>
        </n-card>

        <!-- Appointments -->
        <n-card>
          <CardHeader>
            <div class="flex items-center gap-2">
              <Calendar class="h-5 w-5" />
              <CardTitle>{{ t('appointments.title') }}</CardTitle>
            </div>
            <CardDescription>
              {{ t('appointments.subtitle') }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="text-center py-4">
              <Loader2 class="h-6 w-6 animate-spin mx-auto" />
            </div>
            <div v-else-if="appointments.length === 0" class="text-center py-4 text-gray-500">
              {{ t('appointments.noAppointments') }}
            </div>
            <div v-else class="space-y-3">
              <div v-for="appointment in appointments.slice(0, 5)" :key="appointment._id"
                class="flex items-start justify-between p-3 border rounded-lg">
                <div class="flex-1">
                  <div class="font-medium">{{ appointment.customer_name || 'Unknown' }}</div>
                  <div class="text-sm text-gray-500 mt-1">{{ appointment.customer_phone || 'N/A' }}</div>
                  <div class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ formatDate(appointment.created_at || '') }}
                  </div>
                </div>
                <n-badge :variant="appointment.status === 'completed' ? 'default' : 'outline'">
                  {{ appointment.status || 'pending' }}
                </n-badge>
              </div>
            </div>
            <div v-if="appointments.length > 5" class="mt-4">
              <n-button variant="outline" class="w-full" @click="router.push('/v2/appointments')">
                {{ t('navigation.viewAllAppointments') }}
              </n-button>
            </div>
          </CardContent>
        </n-card>
      </div>
    </main>
  </div>
</template>
