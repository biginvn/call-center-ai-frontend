<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { NButton } from '@/components/ui/button'
import { NBadge } from '@/components/ui/badge'
import { listAppointmentsV2, updateAppointmentStatusV2 } from '@/services/appointmentsServiceV2'
import type { CallbackRequest } from '@/services/appointmentsServiceV2'
import { toast } from 'vue-sonner'
import { Calendar, Phone, User, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const appointments = ref<CallbackRequest[]>([])
const loading = ref(false)
const error = ref('')

const goBack = () => {
  if (authStore.user?.role === 'admin') {
    router.push('/v2/admin')
  } else {
    router.push('/v2/dashboard')
  }
}

const loadAppointments = async () => {
  try {
    loading.value = true
    error.value = ''
    appointments.value = await listAppointmentsV2()
  } catch (err) {
    error.value = 'Failed to load appointments'
    console.error('Error loading appointments:', err)
    toast.error('Error loading appointments', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

const updateStatus = async (appointmentId: string, newStatus: string) => {
  try {
    await updateAppointmentStatusV2(appointmentId, newStatus)
    toast.success('Status updated successfully', {
      duration: 3000,
    })
    await loadAppointments()
  } catch (err) {
    console.error('Error updating status:', err)
    toast.error('Error updating status', {
      description: 'Please try again later',
      duration: 3000,
    })
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

const getStatusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'default'
    case 'pending':
      return 'outline'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

onMounted(() => {
  loadAppointments()
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
            <Calendar class="h-6 w-6" />
            Appointments Dashboard
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            View and manage appointments created by the voicebot
          </p>
        </div>
      </div>
      <n-button variant="outline" @click="loadAppointments" :disabled="loading">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin mr-2" />
        <span>Refresh</span>
      </n-button>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <n-card>
        <CardHeader>
          <CardTitle>Appointments List</CardTitle>
          <CardDescription>
            All callback requests created by the voicebot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="text-center py-8">
            <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-500">Loading appointments...</p>
          </div>
          <div v-else-if="error" class="text-center py-8 text-red-500">
            {{ error }}
          </div>
          <div v-else-if="appointments.length === 0" class="text-center py-8 text-gray-500">
            No appointments found
          </div>
          <div v-else class="space-y-4">
            <!-- Mobile View -->
            <div class="md:hidden space-y-4">
              <n-card v-for="appointment in appointments" :key="appointment._id" class="p-4">
                <CardContent class="p-0">
                  <div class="flex flex-col gap-3">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="font-medium text-lg flex items-center gap-2">
                          <User class="h-4 w-4" />
                          {{ appointment.customer_name || 'Unknown' }}
                        </div>
                        <div class="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Phone class="h-3 w-3" />
                          {{ appointment.customer_phone || 'N/A' }}
                        </div>
                      </div>
                      <n-badge :variant="getStatusBadgeVariant(appointment.status)">
                        {{ appointment.status || 'pending' }}
                      </n-badge>
                    </div>
                    <div v-if="appointment.notes" class="text-sm text-gray-600 dark:text-gray-400">
                      {{ appointment.notes }}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                      <Clock class="h-3 w-3" />
                      {{ formatDate(appointment.created_at) }}
                    </div>
                    <div v-if="appointment.status === 'pending'" class="flex gap-2 mt-2">
                      <n-button size="sm" variant="outline" @click="updateStatus(appointment._id!, 'completed')">
                        <CheckCircle class="h-4 w-4 mr-1" />
                        Mark Completed
                      </n-button>
                      <n-button size="sm" variant="outline" @click="updateStatus(appointment._id!, 'cancelled')">
                        <XCircle class="h-4 w-4 mr-1" />
                        Cancel
                      </n-button>
                    </div>
                  </div>
                </CardContent>
              </n-card>
            </div>

            <!-- Desktop View -->
            <n-table class="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="appointment in appointments" :key="appointment._id">
                  <TableCell class="font-medium">
                    {{ appointment.customer_name || 'Unknown' }}
                  </TableCell>
                  <TableCell>{{ appointment.customer_phone || 'N/A' }}</TableCell>
                  <TableCell class="max-w-xs truncate">
                    {{ appointment.notes || '-' }}
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-1 text-sm text-gray-500">
                      <Clock class="h-3 w-3" />
                      {{ formatDate(appointment.created_at) }}
                    </div>
                  </TableCell>
                  <TableCell>
                    <n-badge :variant="getStatusBadgeVariant(appointment.status)">
                      {{ appointment.status || 'pending' }}
                    </n-badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div v-if="appointment.status === 'pending'" class="flex justify-end gap-2">
                      <n-button size="sm" variant="outline" @click="updateStatus(appointment._id!, 'completed')">
                        <CheckCircle class="h-4 w-4 mr-1" />
                        Complete
                      </n-button>
                      <n-button size="sm" variant="outline" @click="updateStatus(appointment._id!, 'cancelled')">
                        <XCircle class="h-4 w-4 mr-1" />
                        Cancel
                      </n-button>
                    </div>
                    <span v-else class="text-sm text-gray-500">-</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
