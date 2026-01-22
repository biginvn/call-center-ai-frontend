<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import axios from '@/services/axiosInstance'
import { NDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { NInput } from '@/components/ui/input'
import { NLabel } from '@/components/ui/label'
import NButton from '@/components/ui/button/NButton.vue'

interface Client {
  id: string
  name: string
  description: string
  voicebot_usage_limit?: number
  voicebot_usage_total?: number
}

const clients = ref<Client[]>([])
const loading = ref(false)
const error = ref('')

const newClientName = ref('')
const newClientDescription = ref('')
const newClientUsername = ref('')
const newClientPassword = ref('')
const creating = ref(false)
const createError = ref('')

const editModalOpen = ref(false)
const deleteModalOpen = ref(false)
const limitDialogOpen = ref(false)
const selectedClient = ref<Client | null>(null)
const selectedClientForLimit = ref<Client | null>(null)
const editName = ref('')
const editDescription = ref('')
const newLimit = ref<number>(0)
const editError = ref('')
const editLoading = ref(false)
const deleteLoading = ref(false)
const limitLoading = ref(false)
const limitError = ref('')

async function handleCreateClient() {
  if (!newClientName.value) {
    createError.value = 'Name is required.'
    return
  }
  if (!newClientUsername.value) {
    createError.value = 'Account username is required.'
    return
  }
  if (!newClientPassword.value) {
    createError.value = 'Account password is required.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await axios.post('/clients/create', {
      name: newClientName.value,
      description: newClientDescription.value,
      account_username: newClientUsername.value,
      account_password: newClientPassword.value,
    })
    // Refresh client list
    await fetchClients()
    newClientName.value = ''
    newClientDescription.value = ''
    newClientUsername.value = ''
    newClientPassword.value = ''
  } catch {
    createError.value = 'Failed to create client.'
  } finally {
    creating.value = false
  }
}

async function fetchClients() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get<Client[]>('/clients/all')
    clients.value = res.data
  } catch {
    error.value = 'Failed to load clients.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchClients)

function openEditModal(client: Client) {
  selectedClient.value = client
  editName.value = client.name
  editDescription.value = client.description
  editError.value = ''
  editModalOpen.value = true
}

function openDeleteModal(client: Client) {
  selectedClient.value = client
  deleteModalOpen.value = true
}

async function handleUpdateClient() {
  if (!editName.value) {
    editError.value = 'Name is required.'
    return
  }
  if (!selectedClient.value) return
  editLoading.value = true
  editError.value = ''
  try {
    await axios.put(`/clients/${selectedClient.value.id}`, {
      name: editName.value,
      description: editDescription.value,
    })
    editModalOpen.value = false
  } catch {
    editError.value = 'Failed to update client.'
  } finally {
    editLoading.value = false
    await fetchClients()
  }
}

async function handleDeleteClient() {
  if (!selectedClient.value) return
  deleteLoading.value = true
  try {
    await axios.delete(`/clients/${selectedClient.value.id}`)
    deleteModalOpen.value = false
    editModalOpen.value = false
  } catch {
    // Optionally show error in a toast or modal
  } finally {
    deleteLoading.value = false
    await fetchClients()
  }
}

function openLimitModal(client: Client) {
  selectedClientForLimit.value = client
  newLimit.value = client.voicebot_usage_limit || 0
  limitError.value = ''
  limitDialogOpen.value = true
}

async function handleUpdateClientLimit() {
  if (!selectedClientForLimit.value) return
  if (newLimit.value < 0) {
    limitError.value = 'Limit must be greater than or equal to 0.'
    return
  }
  limitLoading.value = true
  limitError.value = ''
  try {
    await axios.put(`/clients/${selectedClientForLimit.value.id}/limit`, {
      voicebot_usage_limit: newLimit.value,
    })
    limitDialogOpen.value = false
    await fetchClients()
  } catch {
    limitError.value = 'Failed to update client limit.'
  } finally {
    limitLoading.value = false
  }
}

function formatUsage(used: number | undefined, limit: number | undefined): string {
  if (used === undefined || limit === undefined) return 'N/A'
  return `${used}s / ${limit}s`
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <n-card>
        <CardHeader class="flex flex-row items-center justify-between">
          <div class="grid gap-2">
            <CardTitle>Client Accounts</CardTitle>
            <CardDescription>Manage all client accounts in the system.</CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <NDialog>
              <DialogTrigger as-child>
                <NButton variant="default">Create Client</NButton>
              </DialogTrigger>
              <DialogContent class="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Client</DialogTitle>
                  <DialogDescription>
                    Enter client details below. Click create when done.
                  </DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="name" class="text-right">Name</NLabel>
                    <NInput id="name" v-model="newClientName" placeholder="Client name" class="col-span-3" />
                  </div>
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="description" class="text-right">Description</NLabel>
                    <NInput id="description" v-model="newClientDescription" placeholder="Description"
                      class="col-span-3" />
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
                  <div v-if="createError" class="col-span-4 text-red-500 text-sm">{{ createError }}</div>
                </div>
                <DialogFooter>
                  <DialogClose as-child>
                    <NButton :loading="creating" @click="handleCreateClient">Create</NButton>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Voicebot Usage</TableHead>
                  <TableHead class="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="client in clients" :key="client.id" class="hover:bg-gray-100">
                  <TableCell>{{ client.name }}</TableCell>
                  <TableCell>{{ client.description }}</TableCell>
                  <TableCell>{{ formatUsage(client.voicebot_usage_total, client.voicebot_usage_limit) }}</TableCell>
                  <TableCell class="flex gap-2">
                    <NButton size="sm" variant="outline" @click="openEditModal(client)">Edit</NButton>
                    <NButton size="sm" variant="outline" @click="openLimitModal(client)">Set Limit</NButton>
                    <NButton v-if="client.name !== 'System Client'" size="sm" variant="destructive"
                      @click="openDeleteModal(client)">Delete</NButton>
                  </TableCell>
                </TableRow>
              </TableBody>
              <!-- Edit/Delete Modal -->
              <NDialog v-model:open="editModalOpen">
                <DialogContent class="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Client</DialogTitle>
                    <DialogDescription>
                      Update client details or delete this client.
                    </DialogDescription>
                  </DialogHeader>
                  <div class="grid gap-4 py-4">
                    <div class="grid grid-cols-4 items-center gap-4">
                      <NLabel for="edit-name" class="text-right">Name</NLabel>
                      <NInput id="edit-name" v-model="editName" placeholder="Client name" class="col-span-3" />
                    </div>
                    <div class="grid grid-cols-4 items-center gap-4">
                      <NLabel for="edit-description" class="text-right">Description</NLabel>
                      <NInput id="edit-description" v-model="editDescription" placeholder="Description"
                        class="col-span-3" />
                    </div>
                    <div v-if="editError" class="grid items-center text-red-500 text-sm">{{ editError }}</div>
                  </div>
                  <DialogFooter class="flex flex-row gap-2 items-center justify-between">
                    <NButton :loading="editLoading" @click="handleUpdateClient" variant="default">Save</NButton>
                  </DialogFooter>
                </DialogContent>
              </NDialog>
            </n-table>
            <div v-if="clients.length === 0" class="text-center py-4">No clients found.</div>
            <!-- Delete Confirmation Modal -->
            <NDialog v-model:open="deleteModalOpen">
              <DialogContent class="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Confirm Delete</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete <span class="font-bold">{{ selectedClient?.name }}</span>?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter class="flex flex-row gap-2 items-center justify-end">
                  <NButton variant="outline" @click="deleteModalOpen = false">Cancel</NButton>
                  <NButton :loading="deleteLoading" variant="destructive" @click="handleDeleteClient">Delete</NButton>
                </DialogFooter>
              </DialogContent>
            </NDialog>
            <!-- Set Limit Modal -->
            <NDialog v-model:open="limitDialogOpen">
              <DialogContent class="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Set Voicebot Usage Limit</DialogTitle>
                  <DialogDescription>
                    Set the voicebot usage limit for <span class="font-bold">{{ selectedClientForLimit?.name }}</span>.
                  </DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                  <div class="grid grid-cols-4 items-center gap-4">
                    <NLabel for="limit" class="text-right">Limit (seconds)</NLabel>
                    <NInput id="limit" v-model.number="newLimit" type="number" min="0" placeholder="Enter limit in seconds"
                      class="col-span-3" />
                  </div>
                  <div v-if="limitError" class="col-span-4 text-red-500 text-sm">{{ limitError }}</div>
                </div>
                <DialogFooter class="flex flex-row gap-2 items-center justify-end">
                  <NButton variant="outline" @click="limitDialogOpen = false">Cancel</NButton>
                  <NButton :loading="limitLoading" @click="handleUpdateClientLimit" variant="default">Save</NButton>
                </DialogFooter>
              </DialogContent>
            </NDialog>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
