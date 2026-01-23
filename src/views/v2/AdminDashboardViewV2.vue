<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { NCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { listUsersV2 } from '@/services/authServiceV2'
import { listAppointmentsV2 } from '@/services/appointmentsServiceV2'
import { listCallsV2 } from '@/services/callsServiceV2'
import type { UserV2 } from '@/types/UserV2'
import { toast } from 'vue-sonner'
import { Users, Calendar, Phone, Settings, Loader2, History } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()
const users = ref<UserV2[]>([])
const appointmentsCount = ref(0)
const callsCount = ref(0)
const loading = ref(false)

const loadData = async () => {
  try {
    loading.value = true
    const [usersData, appointments, calls] = await Promise.all([
      listUsersV2(),
      listAppointmentsV2(),
      listCallsV2(),
    ])
    users.value = usersData
    appointmentsCount.value = appointments.length
    callsCount.value = calls.length
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

const formatUsage = (used: number, limit: number) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  return `${used}s / ${limit}s (${percentage.toFixed(1)}%)`
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
        <h1 class="text-xl font-bold">{{ t('admin.dashboard') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <LanguageSwitcher />
        <n-button variant="outline" @click="router.push('/v2/users')">
          <Users class="h-4 w-4 mr-2" />
          {{ t('admin.manageUsers') }}
        </n-button>
        <n-button variant="outline" @click="loadData" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin mr-2" />
          <span>{{ t('common.refresh') }}</span>
        </n-button>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <n-card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Users class="h-5 w-5" />
              {{ t('admin.stats.totalUsers') }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ users.length }}</div>
            <div class="text-sm text-gray-500 mt-1">
              {{t('admin.stats.usersDetail', {
                admins: users.filter(u => u.role === 'admin').length, users:
                  users.filter(u => u.role === 'user').length }) }}
            </div>
          </CardContent>
        </n-card>

        <n-card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Calendar class="h-5 w-5" />
              {{ t('appointments.title') }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ appointmentsCount }}</div>
            <div class="text-sm text-gray-500 mt-1">{{ t('admin.stats.totalAppointments') }}</div>
          </CardContent>
        </n-card>

        <n-card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Phone class="h-5 w-5" />
              {{ t('calls.title') }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ callsCount }}</div>
            <div class="text-sm text-gray-500 mt-1">{{ t('admin.stats.totalCalls') }}</div>
          </CardContent>
        </n-card>
      </div>

      <!-- Users List -->
      <n-card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>{{ t('admin.usersOverview') }}</CardTitle>
            <n-button variant="outline" @click="router.push('/v2/users')">
              {{ t('admin.manageUsers') }}
            </n-button>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="text-center py-8">
            <Loader2 class="h-8 w-8 animate-spin mx-auto" />
          </div>
          <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
            {{ t('admin.noUsers') }}
          </div>
          <div v-else class="space-y-3">
            <div v-for="user in users.slice(0, 5)" :key="user._id"
              class="flex items-center justify-between p-3 border rounded-lg">
              <div class="flex-1">
                <div class="font-medium">{{ user.username }}</div>
                <div class="text-sm text-gray-500">
                  {{ t('admin.roleUsage', {
                    role: user.role, usage: formatUsage(user.seconds_used, user.seconds_limit)
                  }) }}
                </div>
              </div>
              <n-badge :variant="user.disabled ? 'destructive' : 'default'">
                {{ user.disabled ? t('admin.status.disabled') : t('admin.status.active') }}
              </n-badge>
            </div>
          </div>
        </CardContent>
      </n-card>

      <!-- Quick Actions -->
      <n-card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Settings class="h-5 w-5" />
            {{ t('admin.quickActions') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <n-button variant="outline" class="justify-start" @click="router.push('/v2/users')">
              <Users class="h-4 w-4 mr-2" />
              {{ t('admin.userManagement') }}
            </n-button>
            <n-button variant="outline" class="justify-start" @click="router.push('/v2/appointments')">
              <Calendar class="h-4 w-4 mr-2" />
              {{ t('navigation.viewAllAppointments') }}
            </n-button>
            <n-button variant="outline" class="justify-start" @click="router.push('/v2/calls')">
              <History class="h-4 w-4 mr-2" />
              {{ t('navigation.viewAllCalls') }}
            </n-button>
            <n-button variant="outline" class="justify-start" @click="router.push('/v2/ai-training')">
              <Settings class="h-4 w-4 mr-2" />
              {{ t('navigation.configureAI') }}
            </n-button>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
