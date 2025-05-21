<script setup lang="ts">
import { NButton } from '@/components/ui/button'
import { CircleUser, Menu } from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isMobileMenuOpen = ref(false)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  isMobileMenuOpen.value = false
}

const navigateTo = (path: string) => {
  router.push(path)
  isMobileMenuOpen.value = false
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const isActive = (path: string) => {
  return route.path === path
}
</script>

<template>
  <header class="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
    <nav class="flex items-center gap-6 text-lg font-medium md:text-sm lg:gap-6">
      <a href="#" class="flex items-center gap-2 text-lg font-semibold md:text-base">
        <img src="@/assets/nixxis_logo.webp" alt="Nixxis Logo" class="w-30" />
        <span class="text-muted-foreground w-60">
          <span class="inline">| Admin Portal</span>
        </span>
      </a>
      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center gap-4">
        <a href="#" class="text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
          :class="{ 'text-primary': isActive('/admin') }" @click.prevent="navigateTo('/admin')">
          Trang chủ
        </a>
        <a href="#" class="text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
          :class="{ 'text-primary': isActive('/admin/ai-models') }" @click.prevent="navigateTo('/admin/ai-models')">
          Mô hình AI
        </a>
      </div>
    </nav>
    <div class="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
      <form class="ml-auto flex-1 sm:flex-initial">
      </form>
      <!-- Mobile Menu Button -->
      <n-button variant="ghost" size="icon" class="md:hidden" @click="toggleMobileMenu">
        <Menu class="h-5 w-5" />
      </n-button>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
      @click="toggleMobileMenu">
      <div
        class="fixed inset-y-0 right-0 w-full max-w-sm bg-background p-6 shadow-lg transform transition-transform duration-300 ease-in-out"
        :class="isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'" @click.stop>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold">Menu</h2>
          <n-button variant="ghost" size="icon" @click="toggleMobileMenu">
            <span class="sr-only">Close menu</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </n-button>
        </div>
        <div class="flex flex-col gap-4">
          <a href="#" class="text-sm font-medium transition-colors hover:text-primary"
            :class="{ 'text-primary': isActive('/admin/conversations') }"
            @click.prevent="navigateTo('/admin/conversations')">
            Danh sách cuộc gọi
          </a>
          <a href="#" class="text-sm font-medium transition-colors hover:text-primary"
            :class="{ 'text-primary': isActive('/admin/ai-models') }" @click.prevent="navigateTo('/admin/ai-models')">
            Mô hình AI
          </a>
          <div class="border-t my-2"></div>
          <div class="flex items-center gap-2 px-2 py-1">
            <CircleUser class="h-5 w-5" />
            <span class="text-sm font-medium">Tài khoản của tôi</span>
          </div>
          <button class="text-sm font-medium text-red-500 hover:text-red-600 transition-colors px-2 py-1 text-left"
            @click="handleLogout">
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.backdrop-blur-sm {
  transition: backdrop-filter 0.3s ease-in-out;
}
</style>
