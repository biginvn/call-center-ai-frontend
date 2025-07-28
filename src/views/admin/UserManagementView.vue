<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import axios from '@/services/axiosInstance'
import type { AxiosError } from 'axios'
import NDialog from '@/components/ui/dialog/NDialog.vue'
import DialogTrigger from '@/components/ui/dialog/DialogTrigger.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import NLabel from '@/components/ui/label/NLabel.vue'
import NInput from '@/components/ui/input/NInput.vue'
import NButton from '@/components/ui/button/NButton.vue'
import NSelect from '@/components/ui/select/NSelect.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectGroup from '@/components/ui/select/SelectGroup.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'


interface User {
  username: string;
  fullname: string;
  extension_number: string;
  role: string;
}

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')

// State for create user dialog
const createUserDialogOpen = ref(false)
const newClientName = ref('')
const newClientUsername = ref('')
const newClientPassword = ref('agent')
const newClientRole = ref('agent')
const availableRoles = [
  { value: 'agent', label: 'Agent' },
  { value: 'admin', label: 'Admin' }
]
const newClientEmail = ref('')
const newClientDescription = ref('') // Not used in API, but kept for UI
const creating = ref(false)
const createError = ref('')

// State for delete user dialog
const deleteUserDialogOpen = ref(false)
const userToDelete = ref<User | null>(null)
const deleting = ref(false)
const deleteError = ref('')

async function handleDeleteUser() {
  if (!userToDelete.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await axios.delete(`/user/delete/${encodeURIComponent(userToDelete.value.username)}`)
    deleteUserDialogOpen.value = false
    userToDelete.value = null
    await fetchUsers()
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>
    if (err.response?.data?.message) {
      deleteError.value = err.response.data.message
    } else {
      deleteError.value = 'Failed to delete user.'
    }
  } finally {
    deleting.value = false
  }
}

function isValidEmail(email: string): boolean {
  // Simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function handleCreateClient() {
  if (creating.value) return // Prevent double submit
  createError.value = ''
  if (!newClientUsername.value || !newClientPassword.value || !newClientName.value || !newClientRole.value) {
    createError.value = 'Please fill in all required fields.'
    return
  }
  if (newClientEmail.value && !isValidEmail(newClientEmail.value)) {
    createError.value = 'Please enter a valid email address.'
    return
  }
  creating.value = true
  try {
    await axios.post('/user/create', {
      username: newClientUsername.value,
      password: newClientPassword.value,
      fullname: newClientName.value,
      email: newClientEmail.value || 'mock@email.com',
      role: newClientRole.value
    })
    // Clear fields, close dialog, and refresh user list
    newClientName.value = ''
    newClientUsername.value = ''
    newClientPassword.value = ''
    newClientRole.value = 'agent'
    newClientEmail.value = ''
    newClientDescription.value = ''
    createUserDialogOpen.value = false
    await fetchUsers()
  } catch (e: unknown) {
    // Type narrowing for axios error
    const err = e as AxiosError<{ message?: string }>
    if (err.response?.data?.message) {
      createError.value = err.response.data.message
    } else {
      createError.value = 'Failed to create user.'
    }
  } finally {
    creating.value = false
  }
}

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
            <CardTitle>User Accounts <span v-if="authStore.user?.client_name">- {{ authStore.user.client_name }}</span>
            </CardTitle>
            <CardDescription>Manage all user accounts in the system.</CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <NDialog v-model:open="createUserDialogOpen">
              <DialogTrigger as-child>
                <NButton variant="default" @click="createUserDialogOpen = true">Create User</NButton>
              </DialogTrigger>
              <DialogContent class="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                  <DialogDescription>
                    Enter user details below. Click create when done.
                  </DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="name" class="text-right">Full Name</NLabel>
                    <NInput id="name" v-model="newClientName" placeholder="Full name" class="col-span-3" />
                  </div>
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="email" class="text-right">Email</NLabel>
                    <NInput id="email" v-model="newClientEmail" placeholder="Email" class="col-span-3" />
                  </div>
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="account-username" class="text-right">Username</NLabel>
                    <NInput id="account-username" v-model="newClientUsername" placeholder="Account username"
                      class="col-span-3" />
                  </div>
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="account-password" class="text-right">Password</NLabel>
                    <NInput id="account-password" v-model="newClientPassword" placeholder="Account password"
                      type="password" class="col-span-3" />
                  </div>
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="role" class="text-right">Role</NLabel>
                    <div class="col-span-3 w-full">
                      <NSelect v-model="newClientRole" class="w-full">
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem v-for="role in availableRoles" :key="role.value" :value="role.value">
                              {{ role.label }}
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </NSelect>
                    </div>
                  </div>
                  <div v-if="createError" class="grid items-center text-red-500 text-sm">{{
                    createError }}</div>
                </div>
                <DialogFooter>
                  <DialogClose as-child>
                    <NButton :loading="creating" :disabled="creating" @click="handleCreateClient">Create</NButton>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </NDialog>
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
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in users" :key="user.username" class="cursor-pointer hover:bg-gray-100">
                  <TableCell>{{ user.username }}</TableCell>
                  <TableCell>{{ user.fullname }}</TableCell>
                  <TableCell>{{ user.extension_number }}</TableCell>
                  <TableCell>{{ user.role }}</TableCell>
                  <TableCell style="width: 150px;">
                    <NButton variant="destructive" size="sm" @click="userToDelete = user; deleteUserDialogOpen = true">
                      Delete</NButton>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
            <div v-if="users.length === 0" class="text-center py-4">No users found.</div>
            <!-- Delete User Dialog -->
            <NDialog v-model:open="deleteUserDialogOpen">
              <DialogContent class="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Delete User</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete user <b>{{ userToDelete?.username }}</b>? This action cannot be
                    undone.
                  </DialogDescription>
                </DialogHeader>
                <div v-if="deleteError" class="text-red-500 text-sm py-2">{{ deleteError }}</div>
                <div class="flex justify-end gap-2 mt-4">
                  <NButton variant="outline" @click="deleteUserDialogOpen = false" :disabled="deleting">Cancel</NButton>
                  <NButton variant="destructive" :loading="deleting" @click="handleDeleteUser">Delete</NButton>
                </div>
              </DialogContent>
            </NDialog>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
