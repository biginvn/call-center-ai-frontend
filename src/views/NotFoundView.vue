<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton } from '@/components/ui/button'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
    <!-- <img src="@/assets/nixxis_logo.webp" alt="Nixxis Logo" class="w-48 mb-8" /> -->
    <h1 class="text-4xl font-bold">404</h1>
    <h2 class="text-2xl font-semibold">Không tìm thấy trang</h2>
    <p class="text-muted-foreground">
      Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
    </p>
    <n-button @click="goHome">
      Quay về trang chủ
    </n-button>
  </div>
</template>
