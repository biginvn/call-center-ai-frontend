<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import axios from '@/services/axiosInstance'


interface User {
  username: string;
  fullname: string;
  extension_number: string;
  role: string;
}

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get<User[]>('/user/all')
    users.value = res.data
  } catch {
    error.value = 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <n-card>
        <CardHeader class="flex flex-row items-center justify-between">
          <div class="grid gap-2">
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>Manage all user accounts in the system.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="text-center py-4">Loading...</div>
          <div v-else-if="error" class="text-center py-4 text-red-500">{{ error }}</div>
          <div v-else>
            <n-table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Extension</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in users" :key="user.username" class="cursor-pointer hover:bg-gray-100">
                  <TableCell>{{ user.username }}</TableCell>
                  <TableCell>{{ user.fullname }}</TableCell>
                  <TableCell>{{ user.extension_number }}</TableCell>
                  <TableCell>{{ user.role }}</TableCell>
                </TableRow>
              </TableBody>
            </n-table>
            <div v-if="users.length === 0" class="text-center py-4">No users found.</div>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
