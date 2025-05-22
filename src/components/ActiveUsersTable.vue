<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NTable,
  TableBody,
  // TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAllActiveUsers } from '@/services/callService'
import { useSipStore } from '@/stores/sip'
import { useAuthStore } from '@/stores/auth'
import { NSkeleton } from '@/components/ui/skeleton'

interface ActiveUser {
  _id: string
  username: string
  fullname: string
  email: string
  role: string
  extension_number: string
  last_login: string | null
}

interface Props {
  onCall?: (extension: string) => void
}

const props = defineProps<Props>()
const sipStore = useSipStore()
const authStore = useAuthStore()
const users = ref<ActiveUser[]>([])
const isLoading = ref(false)

const filteredUsers = computed(() => {
  const filtered = users.value.filter(user => {
    return user.extension_number !== authStore.user?.extensionNumber?.toString()
  })
  return filtered
})

const handleCall = (extension: string) => {
  sipStore.makeCall(extension)
  props.onCall?.(extension)
}

const refreshUsers = async () => {
  isLoading.value = true
  try {
    users.value = await getAllActiveUsers()
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await refreshUsers()
})
</script>

<template>
  <div class="w-full overflow-x-auto">
    <div>
      <NTable>
        <!-- <TableCaption>Danh sách người dùng đang hoạt động</TableCaption> -->
        <TableHeader>
          <TableRow>
            <TableHead class="w-[200px]">Họ và tên</TableHead>
            <TableHead>Số Extension</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="i in 4" :key="i">
              <TableCell>
                <NSkeleton class="h-2 w-[200px]" />
              </TableCell>
              <TableCell>
                <NSkeleton class="h-2 w-[100px]" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="user in filteredUsers" :key="user._id" class="cursor-pointer hover:bg-muted/50"
              @click="handleCall(user.extension_number)">
              <TableCell class="font-medium">
                {{ user.fullname }}
              </TableCell>
              <TableCell>{{ user.extension_number }}</TableCell>
            </TableRow>
          </template>
        </TableBody>
      </NTable>
    </div>
  </div>
</template>
