<script lang="ts" setup>
import type { LabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { NLabel } from '@/components/ui/label'
import { useFormField } from './useFormField'

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>()

const { error, formItemId } = useFormField()
</script>

<template>
  <n-label data-slot="form-label" :data-error="!!error" :class="cn(
    'data-[error=true]:text-destructive-foreground',
    props.class,
  )" :for="formItemId">
    <slot />
  </n-label>
</template>
