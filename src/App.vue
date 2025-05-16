<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
onMounted(() => {
  authStore.loadFromStorage()
  console.log('Here:', authStore.access_token, authStore.refresh_token, 'Hello', authStore.isAdmin, authStore.isAgent)
})
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
