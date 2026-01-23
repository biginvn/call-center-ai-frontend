<script lang="ts">
export const description = 'A login page with a muted background color.'
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LoginForm from '@/components/LoginForm.vue';
import NCard from '@/components/ui/card/NCard.vue';
import CardContent from '@/components/ui/card/CardContent.vue';
import CardHeader from '@/components/ui/card/CardHeader.vue';
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'
import NButton from '@/components/ui/button/NButton.vue'
import { useVersionStore } from '@/stores/version'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const versionStore = useVersionStore()
const isAdmin = ref(false)
const toggleLoginMode = () => {
  isAdmin.value = !isAdmin.value
}

const toggleVersion = () => {
  versionStore.toggleVersion()
}

onMounted(() => {
  versionStore.loadFromStorage()
})
</script>

<template>
  <div class="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <div :class="cn('flex flex-col gap-6', props.class)">
        <n-card>
          <CardHeader class="text-center">
            <div class="flex w-full max-w-sm flex-col gap-2">
              <a href="#" class="flex items-center gap-2 self-center font-medium">
                <img src="@/assets/nixxis_logo.webp" alt="Nixxis Logo" class="h-6" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-2 mb-4">
              <!-- Shinhan v2 button hidden -->
              <n-button v-if="!versionStore.isV2" class="w-full" variant="outline" @click="toggleLoginMode">
                <template v-if="isAdmin">Switch to Client Login</template>
                <template v-else>Switch to Admin Login</template>
              </n-button>
            </div>
            <LoginForm :is-admin="isAdmin" />
          </CardContent>
        </n-card>
      </div>
    </div>
  </div>
</template>
