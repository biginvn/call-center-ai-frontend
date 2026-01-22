<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useVersionStore } from '@/stores/version'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { Bot, Loader2, Settings, ArrowLeft, Volume2, Square, History } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { TextareaComponent } from '@/components/ui/textarea'
import { NInput } from '@/components/ui/input'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TTS_VOICES_V2, getVoicesByGender } from '@/config/ttsConfigV2'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createPromptV2, listPromptsV2 } from '@/services/promptsServiceV2'
import type { SystemPromptV2 } from '@/services/promptsServiceV2'
import {
  NSheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDistanceToNow } from 'date-fns'
import { Clock, Check } from 'lucide-vue-next'

const authStore = useAuthStore()
const versionStore = useVersionStore()

const router = useRouter()
const { t } = useI18n()

const goBack = () => {
  if (authStore.user?.role === 'admin') {
    router.push('/v2/admin')
  } else {
    router.push('/v2/dashboard')
  }
}

const TEXT_LIMITS = {
  instructions: {
    min: 10,
    max: 20000,
    label: 'Response Instructions'
  },
  voice_instruction: {
    min: 0,
    max: 500,
    label: 'Voice Instruction'
  },
  initial_message: {
    min: 0,
    max: 1000,
    label: 'Initial Message'
  }
} as const

const formSchema = toTypedSchema(z.object({
  content: z.string()
    .min(TEXT_LIMITS.instructions.min, `${TEXT_LIMITS.instructions.label} must have at least ${TEXT_LIMITS.instructions.min} characters`)
    .max(TEXT_LIMITS.instructions.max, `${TEXT_LIMITS.instructions.label} cannot exceed ${TEXT_LIMITS.instructions.max} characters`),
  voice_id: z.string().min(1, 'Please select a voice'),
  voice_instruction: z.string()
    .max(TEXT_LIMITS.voice_instruction.max, `${TEXT_LIMITS.voice_instruction.label} cannot exceed ${TEXT_LIMITS.voice_instruction.max} characters`)
    .optional(),
  initial_message: z.string()
    .max(TEXT_LIMITS.initial_message.max, `${TEXT_LIMITS.initial_message.label} cannot exceed ${TEXT_LIMITS.initial_message.max} characters`)
    .optional(),
  silence_timeout: z.number().min(0.1).max(5.0),
  response_delay: z.number().min(0.0).max(2.0),
  min_volume: z.number().min(0.0).max(1.0),
  wad_threshold: z.number().min(0.0).max(1.0),
  idle_timeout: z.number().min(1).max(300),
  max_idle_attempts: z.number().int().min(1).max(10),
}))

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    content: '',
    voice_id: 'Kore',
    voice_instruction: 'Giọng điệu thân thiện, tự nhiên',
    initial_message: '',
    silence_timeout: 0.8,
    response_delay: 0.2,
    min_volume: 0.6,
    wad_threshold: 0.7,
    idle_timeout: 10,
    max_idle_attempts: 2,
  }
})

const isSaving = ref(false)
const isFetching = ref(false)
const genderFilter = ref<'all' | 'male' | 'female'>('all')

// Voice preview
const isPlayingSample = ref(false)
const currentPlayingSample = ref<HTMLAudioElement | null>(null)
const voiceSamples = ref<Record<string, HTMLAudioElement>>({})

// Initialize voice samples immediately
TTS_VOICES_V2.forEach(voice => {
  const audio = new Audio(`/gemini_voice/${voice.value}.wav`)
  voiceSamples.value[voice.value] = audio
})

const stopSampleVoice = () => {
  if (currentPlayingSample.value) {
    currentPlayingSample.value.pause()
    currentPlayingSample.value.currentTime = 0
    isPlayingSample.value = false
    currentPlayingSample.value = null
  }
}

const playVoiceSample = (voice: string) => {
  // Stop any currently playing sample
  if (currentPlayingSample.value) {
    currentPlayingSample.value.pause()
    currentPlayingSample.value.currentTime = 0
  }

  const sample = voiceSamples.value[voice]
  if (sample) {
    isPlayingSample.value = true
    currentPlayingSample.value = sample

    sample.onended = () => {
      isPlayingSample.value = false
      currentPlayingSample.value = null
    }

    sample.play().catch(error => {
      console.error('Error playing voice sample:', error)
      isPlayingSample.value = false
      currentPlayingSample.value = null
    })
  }
}

const filteredVoices = computed(() => {
  return getVoicesByGender(genderFilter.value)
})

const promptsHistory = ref<SystemPromptV2[]>([])
const isHistoryOpen = ref(false)

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

const loadHistoryPrompt = (prompt: SystemPromptV2) => {
  form.setValues({
    content: prompt.content || '',
    voice_id: prompt.voice_id || 'Kore',
    voice_instruction: prompt.voice_instruction || 'Giọng điệu thân thiện, tự nhiên',
    initial_message: prompt.initial_message || '',
    silence_timeout: prompt.silence_timeout ?? 0.8,
    response_delay: prompt.response_delay ?? 0.2,
    min_volume: prompt.min_volume ?? 0.6,
    wad_threshold: prompt.wad_threshold ?? 0.7,
    idle_timeout: prompt.idle_timeout ?? 10,
    max_idle_attempts: prompt.max_idle_attempts ?? 2,
  })

  toast.success('Loaded configuration from history', {
    description: `Version from ${formatDate(prompt.created_at)}`,
    duration: 3000,
  })

  isHistoryOpen.value = false
}

const hydrateConfig = async () => {
  try {
    isFetching.value = true
    // Use /prompts/ endpoint for users (not /prompts/active which is for bots)
    const prompts = await listPromptsV2()
    // Find the active prompt
    const prompt = prompts.find(p => p.active === true) || prompts[0] || null

    if (prompt) {
      form.setValues({
        content: prompt.content || '',
        voice_id: prompt.voice_id || 'Kore',
        voice_instruction: prompt.voice_instruction || 'Giọng điệu thân thiện, tự nhiên',
        initial_message: prompt.initial_message || '',
        silence_timeout: prompt.silence_timeout ?? 0.8,
        response_delay: prompt.response_delay ?? 0.2,
        min_volume: prompt.min_volume ?? 0.6,
        wad_threshold: prompt.wad_threshold ?? 0.7,
        idle_timeout: prompt.idle_timeout ?? 10,
        max_idle_attempts: prompt.max_idle_attempts ?? 2,
      })
    } else {
      // No prompts found, use default values
      form.setValues({
        content: '',
        voice_id: 'Kore',
        voice_instruction: 'Giọng điệu thân thiện, tự nhiên',
        initial_message: '',
        silence_timeout: 0.8,
        response_delay: 0.2,
        min_volume: 0.6,
        wad_threshold: 0.7,
        idle_timeout: 10,
        max_idle_attempts: 2,
      })
    }

    // Sort prompts by date descending for history
    promptsHistory.value = [...prompts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    toast.error('Error loading configuration', {
      description: 'Unable to load existing configuration',
      duration: 3000,
    })
  } finally {
    isFetching.value = false
  }
}

const onSubmit = form.handleSubmit(async (values) => {
  try {
    isSaving.value = true

    const promptData: SystemPromptV2 = {
      content: values.content,
      version: 1,
      active: true,
      voice_id: values.voice_id,
      voice_instruction: values.voice_instruction,
      initial_message: values.initial_message,
      silence_timeout: values.silence_timeout,
      response_delay: values.response_delay,
      min_volume: values.min_volume,
      wad_threshold: values.wad_threshold,
      idle_timeout: values.idle_timeout,
      max_idle_attempts: values.max_idle_attempts,
    }

    await createPromptV2(promptData)

    toast.success('Configuration saved successfully', {
      description: 'Your changes have been applied',
      duration: 3000,
    })
  } catch (error) {
    console.error('Error saving configuration:', error)
    toast.error('Error saving configuration', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    isSaving.value = false
  }
})

onMounted(() => {
  hydrateConfig()
})

// Clean up audio resources when component is unmounted
onUnmounted(() => {
  stopSampleVoice()
  // Clean up audio elements
  Object.values(voiceSamples.value).forEach(audio => {
    audio.pause()
    audio.src = ''
  })
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header
      class="sticky top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <n-button variant="ghost" size="icon" @click="goBack" class="flex-shrink-0">
          <ArrowLeft class="h-5 w-5" />
        </n-button>
        <div class="grid gap-1">
          <h1 class="text-xl font-bold">{{ t('ai_training.title') }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ isFetching ? t('common.loading') : t('ai_training.description') }}
          </p>
        </div>
      </div>
      <n-button type="submit" class="flex items-center justify-center gap-2" @click="onSubmit" :disabled="isSaving">
        <Loader2 v-if="isSaving" class="h-5 w-5 animate-spin" />
        <Bot v-else class="h-5 w-5" />
        <span>{{ isSaving ? t('ai_training.saving') : t('ai_training.save') }}</span>
      </n-button>
      <n-button variant="outline" class="flex items-center gap-2 ml-2" @click="isHistoryOpen = true">
        <History class="h-4 w-4" />
        <span class="hidden sm:inline">History</span>
      </n-button>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <form @submit.prevent="onSubmit" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Left Column: Instructions -->
        <n-card class="max-h-[calc(100vh-200px)] overflow-auto">
          <CardHeader>
            <div class="grid gap-2">
              <CardTitle>{{ t('ai_training.instructions.title') }}</CardTitle>
              <CardDescription>
                {{ t('ai_training.instructions.description') }}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <FormField v-slot="{ componentField }" name="content" class="flex-1">
              <FormItem class="flex flex-col">
                <FormLabel>{{ t('ai_training.instructions.label') }} <span class="text-red-500">*</span></FormLabel>
                <FormControl>
                  <div class="relative h-full">
                    <TextareaComponent v-bind="componentField" :placeholder="t('ai_training.instructions.placeholder')"
                      class="max-h-[400px] min-h-[200px] resize-none pr-12" />
                    <div
                      class="absolute bottom--2 right-2 text-xs text-gray-500 bg-white dark:bg-gray-900 px-1 rounded">
                      {{ (form.values.content || '').length }}/{{ TEXT_LIMITS.instructions.max }}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="initial_message">
              <FormItem class="flex flex-col mt-8">
                <FormLabel>{{ t('ai_training.initial_message.label') }}</FormLabel>
                <div class="relative">
                  <TextareaComponent v-bind="componentField" :placeholder="t('ai_training.initial_message.placeholder')"
                    class="max-h-[400px] min-h-[200px] resize-none pr-12" />
                  <div class="absolute bottom--2 right-2 text-xs text-gray-500 bg-white dark:bg-gray-900 px-1 rounded">
                    {{ (form.values.initial_message || '').length }}/{{ TEXT_LIMITS.initial_message.max }}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            </FormField>
          </CardContent>
        </n-card>

        <!-- Right Column: Voice & Advanced Settings -->
        <div class="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-auto">
          <!-- Voice Configuration -->
          <n-card>
            <CardHeader>
              <div class="grid gap-2">
                <CardTitle>{{ t('ai_training.voice.title') }}</CardTitle>
                <CardDescription>
                  {{ t('ai_training.voice.description') }}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <!-- Gender Filter -->
                <div class="flex gap-2">
                  <n-button type="button" variant="outline" size="sm"
                    :class="genderFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/20' : ''"
                    @click="genderFilter = 'all'">
                    {{ t('ai_training.voice.gender.all') }}
                  </n-button>
                  <n-button type="button" variant="outline" size="sm"
                    :class="genderFilter === 'male' ? 'bg-blue-50 dark:bg-blue-900/20' : ''"
                    @click="genderFilter = 'male'">
                    {{ t('ai_training.voice.gender.male') }}
                  </n-button>
                  <n-button type="button" variant="outline" size="sm"
                    :class="genderFilter === 'female' ? 'bg-blue-50 dark:bg-blue-900/20' : ''"
                    @click="genderFilter = 'female'">
                    {{ t('ai_training.voice.gender.female') }}
                  </n-button>
                </div>


                <!-- Voice Selection -->
                <FormField name="voice_id">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.voice.select') }} <span class="text-red-500">*</span></FormLabel>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      <div v-for="voice in filteredVoices" :key="voice.value" @click="() => {
                        form.setFieldValue('voice_id', voice.value);
                        playVoiceSample(voice.value);
                      }" :class="[
                        'flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        form.values.voice_id === voice.value
                          ? 'border-blue-500 ring-2 ring-blue-500'
                          : 'border-gray-200 dark:border-gray-700',
                      ]">
                        <div class="flex items-center gap-1">
                          <span class="text-sm text-center">{{ voice.label }}</span>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          {{ voice.gender === 'male' ? 'Nam' : 'Nữ' }}
                        </div>
                        <div :class="[
                          'w-3 h-3 rounded-full mt-2',
                          form.values.voice_id === voice.value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
                        ]"></div>
                        <div class="flex items-center gap-2 mt-2">
                          <div v-if="isPlayingSample && currentPlayingSample === voiceSamples[voice.value]"
                            class="text-xs text-blue-500">
                            Playing...
                          </div>
                          <n-button v-if="isPlayingSample && currentPlayingSample === voiceSamples[voice.value]"
                            type="button" variant="ghost" size="sm" class="h-6 px-2" @click.stop="stopSampleVoice">
                            <Square class="h-4 w-4" />
                          </n-button>
                          <n-button v-else type="button" variant="ghost" size="sm" class="h-6 px-2"
                            @click.stop="playVoiceSample(voice.value)">
                            <Volume2 class="h-4 w-4" />
                          </n-button>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <!-- Voice Instruction -->
                <FormField v-slot="{ componentField }" name="voice_instruction">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.voice.instruction.label') }}</FormLabel>
                    <FormControl>
                      <TextareaComponent v-bind="componentField"
                        :placeholder="t('ai_training.voice.instruction.placeholder')" class="h-20 resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </CardContent>
          </n-card>

          <!-- VAD Settings -->
          <n-card>
            <CardHeader>
              <div class="grid gap-2">
                <CardTitle class="flex items-center gap-2">
                  <Settings class="h-5 w-5" />
                  {{ t('ai_training.vad.title') }}
                </CardTitle>
                <CardDescription>
                  {{ t('ai_training.vad.description') }}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <FormField v-slot="{ componentField }" name="silence_timeout">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.vad.silenceTimeout') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" step="0.1" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.vad.silenceTimeoutDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="response_delay">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.vad.responseDelay') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" step="0.1" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.vad.responseDelayDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="min_volume">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.vad.minVolume') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" step="0.1" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.vad.minVolumeDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="wad_threshold">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.vad.wadThreshold') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" step="0.1" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.vad.wadThresholdDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </CardContent>
          </n-card>

          <!-- Idle Settings -->
          <n-card>
            <CardHeader>
              <div class="grid gap-2">
                <CardTitle class="flex items-center gap-2">
                  <Settings class="h-5 w-5" />
                  {{ t('ai_training.idle.title') }}
                </CardTitle>
                <CardDescription>
                  {{ t('ai_training.idle.description') }}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <FormField v-slot="{ componentField }" name="idle_timeout">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.idle.idleTimeout') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.idle.idleTimeoutDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="max_idle_attempts">
                  <FormItem>
                    <FormLabel>{{ t('ai_training.idle.maxIdleAttempts') }}</FormLabel>
                    <FormControl>
                      <NInput type="number" v-bind="componentField" />
                    </FormControl>
                    <p class="text-xs text-gray-500">{{ t('ai_training.idle.maxIdleAttemptsDesc') }}</p>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </CardContent>
          </n-card>
        </div>
      </form>
    </main>

    <n-sheet v-model:open="isHistoryOpen">
      <SheetContent class="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Prompt History</SheetTitle>
          <SheetDescription>
            View and restore previous prompt configurations.
          </SheetDescription>
        </SheetHeader>
        <div class="mt-4 flex flex-col gap-3">
          <div v-if="promptsHistory.length === 0" class="text-center py-8 text-muted-foreground">
            No history available
          </div>
          <div v-for="(item, index) in promptsHistory" :key="index"
            class="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
            @click="loadHistoryPrompt(item)">
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-2 text-sm font-medium">
                <Clock class="h-4 w-4 text-muted-foreground" />
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <div v-if="item.active" class="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check class="h-3 w-3" />
                Active
              </div>
            </div>

            <div class="text-sm text-muted-foreground line-clamp-2">
              {{ item.content }}
            </div>

            <div class="text-xs text-muted-foreground mt-1 flex gap-2">
              <span class="bg-secondary px-1.5 py-0.5 rounded">Voice: {{ item.voice_id }}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </n-sheet>
  </div>
</template>
