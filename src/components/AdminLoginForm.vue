<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { NButton } from '@/components/ui/button'
import {
  NCard,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { NInput } from '@/components/ui/input'
import { NLabel } from '@/components/ui/label'
import AdminLogo from '@/components/logo/AdminLogo.vue'
import { ref } from 'vue'


const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const isLoading = ref(false)
const isError = ref(false)

const handleSubmit = async (e: Event) => {
  e.preventDefault()
  isLoading.value = true
  isError.value = false
  await new Promise((resolve) => setTimeout(resolve, 2000))
  isLoading.value = false
}

</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <n-card>
      <CardHeader class="text-center">
        <AdminLogo />
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit">
          <div class="grid gap-6">

            <div class="grid gap-6">
              <div class="grid gap-2">
                <n-label for="username">Tên đăng nhập</n-label>
                <n-input id="username" type="username" placeholder="" required />
              </div>
              <div class="grid gap-2">
                <div class="flex items-center">
                  <n-label for="password">Mật khẩu</n-label>
                </div>
                <n-input id="password" type="password" required />
              </div>

              <n-button type="submit" class="w-full" :disabled="isLoading">
                <span v-if="isLoading">Đang đăng nhập...</span>
                <span v-else>Đăng nhập</span>
              </n-button>




            </div>
            <!-- <div class="text-center text-sm">
              Don't have an account?
              <a href="#" class="underline underline-offset-4">
                Sign up
              </a>
            </div> -->
          </div>
        </form>
      </CardContent>
    </n-card>
    <!-- <div
      class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
      By clicking continue, you agree to our <a href="#">Terms of Service</a>
      and <a href="#">Privacy Policy</a>.
    </div> -->
  </div>
</template>
