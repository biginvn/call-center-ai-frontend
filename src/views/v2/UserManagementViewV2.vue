<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { NButton } from '@/components/ui/button'
import { NBadge } from '@/components/ui/badge'
import { NInput } from '@/components/ui/input'
import NSelect from '@/components/ui/select/NSelect.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectGroup from '@/components/ui/select/SelectGroup.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import NDialog from '@/components/ui/dialog/NDialog.vue'
import DialogTrigger from '@/components/ui/dialog/DialogTrigger.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import NLabel from '@/components/ui/label/NLabel.vue'
import { listUsersV2, createUserV2, updateUserV2, resetUserPasswordV2 } from '@/services/authServiceV2'
import type { UserV2 } from '@/types/UserV2'
import { toast } from 'vue-sonner'
import { Users, Plus, Loader2, Key, Edit, ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const users = ref<UserV2[]>([])
const loading = ref(false)

// Create user dialog
const createDialogOpen = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const newRole = ref<'admin' | 'user'>('user')
const newSecondsLimit = ref(600)
const creating = ref(false)

// Edit user dialog
const editDialogOpen = ref(false)
const editingUser = ref<UserV2 | null>(null)
const editSecondsLimit = ref(600)
const editDisabled = ref(false)
const editing = ref(false)

// Reset password dialog
const resetPasswordDialogOpen = ref(false)
const resettingUser = ref<UserV2 | null>(null)
const newPasswordValue = ref('')
const resetting = ref(false)

const loadUsers = async () => {
  try {
    loading.value = true
    users.value = await listUsersV2()
  } catch (err) {
    console.error('Error loading users:', err)
    toast.error('Error loading users', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

const handleCreateUser = async () => {
  try {
    creating.value = true
    await createUserV2({
      username: newUsername.value,
      password: newPassword.value,
      role: newRole.value,
      seconds_limit: newSecondsLimit.value,
    })
    toast.success('User created successfully', {
      duration: 3000,
    })
    createDialogOpen.value = false
    newUsername.value = ''
    newPassword.value = ''
    newRole.value = 'user'
    newSecondsLimit.value = 600
    await loadUsers()
  } catch (err) {
    console.error('Error creating user:', err)
    toast.error('Error creating user', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    creating.value = false
  }
}

const openEditDialog = (user: UserV2) => {
  editingUser.value = user
  editSecondsLimit.value = user.seconds_limit
  editDisabled.value = user.disabled
  editDialogOpen.value = true
}

const handleUpdateUser = async () => {
  if (!editingUser.value) return
  try {
    editing.value = true
    await updateUserV2(editingUser.value._id, {
      seconds_limit: editSecondsLimit.value,
      disabled: editDisabled.value,
    })
    toast.success('User updated successfully', {
      duration: 3000,
    })
    editDialogOpen.value = false
    editingUser.value = null
    await loadUsers()
  } catch (err) {
    console.error('Error updating user:', err)
    toast.error('Error updating user', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    editing.value = false
  }
}

const openResetPasswordDialog = (user: UserV2) => {
  resettingUser.value = user
  newPasswordValue.value = ''
  resetPasswordDialogOpen.value = true
}

const handleResetPassword = async () => {
  if (!resettingUser.value) return
  try {
    resetting.value = true
    await resetUserPasswordV2(resettingUser.value._id, newPasswordValue.value)
    toast.success('Password reset successfully', {
      duration: 3000,
    })
    resetPasswordDialogOpen.value = false
    resettingUser.value = null
    newPasswordValue.value = ''
  } catch (err) {
    console.error('Error resetting password:', err)
    toast.error('Error resetting password', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    resetting.value = false
  }
}

const formatUsage = (used: number, limit: number) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  return `${used}s / ${limit}s (${percentage.toFixed(1)}%)`
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header
      class="sticky top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <n-button variant="ghost" size="icon" @click="router.push('/v2/admin')" class="flex-shrink-0">
          <ArrowLeft class="h-5 w-5" />
        </n-button>
        <div class="grid gap-1">
          <h1 class="text-xl font-bold flex items-center gap-2">
            <Users class="h-6 w-6" />
            User Management
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Manage users, update usage limits, and reset passwords
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <NDialog v-model:open="createDialogOpen">
          <DialogTrigger asChild>
            <n-button>
              <Plus class="h-4 w-4 mr-2" />
              Create User
            </n-button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user with specific role and usage limits
              </DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-4">
              <div>
                <NLabel>Username</NLabel>
                <NInput v-model="newUsername" placeholder="Enter username" />
              </div>
              <div>
                <NLabel>Password</NLabel>
                <NInput v-model="newPassword" type="password" placeholder="Enter password" />
              </div>
              <div>
                <NLabel>Role</NLabel>
                <NSelect v-model="newRole">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </NSelect>
              </div>
              <div>
                <NLabel>Seconds Limit</NLabel>
                <NInput v-model.number="newSecondsLimit" type="number" placeholder="600" />
              </div>
              <div class="flex justify-end gap-2">
                <n-button variant="outline" @click="createDialogOpen = false">Cancel</n-button>
                <n-button @click="handleCreateUser" :disabled="creating || !newUsername || !newPassword">
                  <Loader2 v-if="creating" class="h-4 w-4 animate-spin mr-2" />
                  Create
                </n-button>
              </div>
            </div>
          </DialogContent>
        </NDialog>
        <n-button variant="outline" @click="loadUsers" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin mr-2" />
          Refresh
        </n-button>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <n-card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
          <CardDescription>
            Manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="text-center py-8">
            <Loader2 class="h-8 w-8 animate-spin mx-auto" />
          </div>
          <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
            No users found
          </div>
          <div v-else>
            <!-- Mobile View -->
            <div class="md:hidden space-y-4">
              <n-card v-for="user in users" :key="user._id" class="p-4">
                <CardContent class="p-0">
                  <div class="flex flex-col gap-3">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="font-medium text-lg">{{ user.username }}</div>
                        <div class="text-sm text-gray-500 mt-1">
                          Role: {{ user.role }} | Usage: {{ formatUsage(user.seconds_used, user.seconds_limit) }}
                        </div>
                      </div>
                      <n-badge :variant="user.disabled ? 'destructive' : 'default'">
                        {{ user.disabled ? 'Disabled' : 'Active' }}
                      </n-badge>
                    </div>
                    <div class="flex gap-2">
                      <n-button size="sm" variant="outline" @click="openEditDialog(user)">
                        <Edit class="h-4 w-4 mr-1" />
                        Edit
                      </n-button>
                      <n-button size="sm" variant="outline" @click="openResetPasswordDialog(user)">
                        <Key class="h-4 w-4 mr-1" />
                        Reset Password
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
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in users" :key="user._id">
                  <TableCell class="font-medium">{{ user.username }}</TableCell>
                  <TableCell>
                    <n-badge :variant="user.role === 'admin' ? 'default' : 'outline'">
                      {{ user.role }}
                    </n-badge>
                  </TableCell>
                  <TableCell>{{ formatUsage(user.seconds_used, user.seconds_limit) }}</TableCell>
                  <TableCell>
                    <n-badge :variant="user.disabled ? 'destructive' : 'default'">
                      {{ user.disabled ? 'Disabled' : 'Active' }}
                    </n-badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <n-button size="sm" variant="outline" @click="openEditDialog(user)">
                        <Edit class="h-4 w-4 mr-1" />
                        Edit
                      </n-button>
                      <n-button size="sm" variant="outline" @click="openResetPasswordDialog(user)">
                        <Key class="h-4 w-4 mr-1" />
                        Reset Password
                      </n-button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </n-table>
          </div>
        </CardContent>
      </n-card>

      <!-- Edit User Dialog -->
      <NDialog v-model:open="editDialogOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user settings and usage limits
            </DialogDescription>
          </DialogHeader>
          <div v-if="editingUser" class="flex flex-col gap-4">
            <div>
              <NLabel>Username</NLabel>
              <NInput :value="editingUser.username" disabled />
            </div>
            <div>
              <NLabel>Role</NLabel>
              <NInput :value="editingUser.role" disabled />
            </div>
            <div>
              <NLabel>Seconds Limit</NLabel>
              <NInput v-model.number="editSecondsLimit" type="number" />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="editDisabled" id="disabled" />
              <NLabel for="disabled">Disabled</NLabel>
            </div>
            <div class="flex justify-end gap-2">
              <n-button variant="outline" @click="editDialogOpen = false">Cancel</n-button>
              <n-button @click="handleUpdateUser" :disabled="editing">
                <Loader2 v-if="editing" class="h-4 w-4 animate-spin mr-2" />
                Save
              </n-button>
            </div>
          </div>
        </DialogContent>
      </NDialog>

      <!-- Reset Password Dialog -->
      <NDialog v-model:open="resetPasswordDialogOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {{ resettingUser?.username }}
            </DialogDescription>
          </DialogHeader>
          <div class="flex flex-col gap-4">
            <div>
              <NLabel>New Password</NLabel>
              <NInput v-model="newPasswordValue" type="password" placeholder="Enter new password" />
            </div>
            <div class="flex justify-end gap-2">
              <n-button variant="outline" @click="resetPasswordDialogOpen = false">Cancel</n-button>
              <n-button @click="handleResetPassword" :disabled="resetting || !newPasswordValue">
                <Loader2 v-if="resetting" class="h-4 w-4 animate-spin mr-2" />
                Reset
              </n-button>
            </div>
          </div>
        </DialogContent>
      </NDialog>
    </main>
  </div>
</template>
