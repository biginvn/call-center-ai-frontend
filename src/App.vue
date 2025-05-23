<script setup lang="ts">
import { RouterView } from 'vue-router'
import { NToaster } from '@/components/ui/sonner'
// import { onMounted, ref } from 'vue';
// import { useAuthStore } from '@/stores/auth'

// const authStore = useAuthStore()
// const isReady = ref(false)

// onMounted(async () => {
//   await authStore.loadFromStorage()
//   isReady.value = true
// })
</script>

<template>
  <RouterView />
  <NToaster richColors position="top-right" />
  <!-- <RouterView v-if="isReady" /> -->
</template>

<style scoped></style>
