<template>
  <div class="space-y-4">
    <template v-if="calls.length === 0">
      <div class="text-center py-8 text-muted-foreground">Không có lịch sử cuộc gọi.</div>
    </template>
    <n-card v-else v-for="call in calls" :key="call.id" :class="compact ? 'p-3' : ''">
      <CardContent>
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-lg">{{ call.contactName || 'Unknown' }}</div>
            <div class="text-sm text-muted-foreground flex items-center">
              <component :is="getStatusIcon(call.status)" />
              <span class="ml-1">{{ call.extNumber }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-muted-foreground">
              {{ formatDistanceToNow(new Date(call.timestamp), { addSuffix: true, locale: vi }) }}
            </div>
            <div class="flex items-center justify-end mt-1">
              <div v-if="call.status === 'completed'" class="flex items-center text-sm text-muted-foreground mr-2">
                <Clock class="h-3 w-3 mr-1" />
                {{ formatDuration(call.duration) }}
              </div>
              <n-badge :class="getStatusColor(call.status)">
                {{ call.status.charAt(0).toUpperCase() + call.status.slice(1) }}
              </n-badge>
            </div>
          </div>
        </div>
        <!-- <div v-if="!compact" class="flex justify-end space-x-2 mt-4">
          <n-button variant="secondary" size="sm" @click="handleCallBack(call)">
            <Phone class="h-4 w-4 mr-1" />
            Call Back
          </n-button>
        </div> -->
      </CardContent>
    </n-card>
  </div>
</template>

<script setup lang="ts">
// import { ref } from 'vue'
import { NBadge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { NCard, CardContent } from '@/components/ui/card'
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog'
// import { Button } from '@/components/ui/button'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-vue-next'
import type { Call } from '@/types/Call'

defineProps<{
  calls: Call[]
  onStartCall: (extensionNumber: string) => void
  compact?: boolean
}>()

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'incoming':
      return PhoneIncoming
    case 'outgoing':
      return PhoneOutgoing
    case 'missed':
      return PhoneMissed
    case 'rejected':
      return PhoneMissed
    default:
      return Phone
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'missed':
      return 'bg-red-100 text-red-800'
    case 'rejected':
      return 'bg-orange-100 text-orange-800'
    case 'incoming':
      return 'bg-blue-100 text-blue-800'
    case 'outgoing':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// const handleCallBack = (call: Call) => {
//   const contact = props.contacts.find((c) => c.id === call.contactId)
//   if (contact) {
//     props.onStartCall(contact)
//   } else {
//     const tempContact: Contact = {
//       id: `temp-${Date.now()}`,
//       name: call.contactName || 'Unknown',
//       extNumber: call.extNumber,
//       email: '',
//       favorite: false,
//     }
//     props.onStartCall(tempContact)
//   }
// }
</script>

<style scoped></style>
