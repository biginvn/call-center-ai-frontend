<script setup lang="ts">
import { RouterView } from 'vue-router'
import { NToaster } from '@/components/ui/sonner'
</script>

<template>
  <RouterView />
  <NToaster closeButton richColors position="bottom-right" />
  <!-- <RouterView v-if="isReady" /> -->
</template>

<style scoped></style>
