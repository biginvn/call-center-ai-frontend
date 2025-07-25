<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
// ...existing code...
import axios from '@/services/axiosInstance'
import { NDialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { NInput } from '@/components/ui/input'
import { NLabel } from '@/components/ui/label'
import NButton from '@/components/ui/button/NButton.vue'

interface Client {
  id: string
  name: string
  description: string
}

const clients = ref<Client[]>([])
const loading = ref(false)
const error = ref('')

const newClientName = ref('')
const newClientDescription = ref('')
const creating = ref(false)
const createError = ref('')

const editModalOpen = ref(false)
const selectedClient = ref<Client | null>(null)
const editName = ref('')
const editDescription = ref('')
const editError = ref('')
const editLoading = ref(false)
const deleteLoading = ref(false)

async function handleCreateClient() {
  if (!newClientName.value) {
    createError.value = 'Name is required.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await axios.post('/clients/create', {
      name: newClientName.value,
      description: newClientDescription.value,
    })
    // Refresh client list
    await fetchClients()
    newClientName.value = ''
    newClientDescription.value = ''
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
  editError.value = ''
  try {
    await axios.delete(`/clients/${selectedClient.value.id}`)
    editModalOpen.value = false
  } catch {
    editError.value = 'Failed to delete client.'
  } finally {
    deleteLoading.value = false
    await fetchClients()
  }
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
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="client in clients" :key="client.id" class="cursor-pointer hover:bg-gray-100"
                  @click="openEditModal(client)">
                  <TableCell>{{ client.id }}</TableCell>
                  <TableCell>{{ client.name }}</TableCell>
                  <TableCell>{{ client.description }}</TableCell>
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
                    <div v-if="editError" class="col-span-4 text-red-500 text-sm">{{ editError }}</div>
                  </div>
                  <DialogFooter class="flex flex-row gap-2 items-center justify-between">
                    <NButton :loading="deleteLoading" @click="handleDeleteClient" variant="destructive">Delete</NButton>
                    <NButton :loading="editLoading" @click="handleUpdateClient" variant="default">Save</NButton>
                  </DialogFooter>
                </DialogContent>
              </NDialog>
            </n-table>
            <div v-if="clients.length === 0" class="text-center py-4">No clients found.</div>
          </div>
        </CardContent>
      </n-card>
    </main>
  </div>
</template>
