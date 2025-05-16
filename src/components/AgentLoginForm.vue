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
import ExtInput from './ExtInput.vue'
import AgentLogo from '@/components/logo/AgentLogo.vue'


const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <n-card>
      <CardHeader class="text-center">
        <AgentLogo />
      </CardHeader>
      <CardContent>
        <form>
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
              <div class="grid gap-2">
                <div class="flex items-center">
                  <n-label for="ext">Ext</n-label>
                </div>
                <div class="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <ExtInput />
                  </div>
                  <n-button type="submit" class="w-full">
                    Đăng nhập
                  </n-button>
                </div>

              </div>

            </div>
          </div>
        </form>
      </CardContent>
    </n-card>
  </div>
</template>
