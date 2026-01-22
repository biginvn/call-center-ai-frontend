<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NDropdownMenu as DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NButton } from '@/components/ui/button'
import { Globe } from 'lucide-vue-next'

const { locale } = useI18n()

const switchLanguage = (lang: string) => {
  locale.value = lang
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <n-button variant="ghost" size="icon">
        <Globe class="h-5 w-5" />
        <span class="sr-only">Toggle language</span>
      </n-button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="switchLanguage('en')">
        English
      </DropdownMenuItem>
      <DropdownMenuItem @click="switchLanguage('vi')">
        Tiếng Việt
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
