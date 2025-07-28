<script setup lang="ts">
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { Bot, Volume2, Loader2, Square } from 'lucide-vue-next'
import { TextareaComponent } from '@/components/ui/textarea'
import { ref, computed, onUnmounted, onMounted } from 'vue'
import OpenAI from 'openai'
import { TTS_VOICES, type TTSVoice } from '@/config/ttsConfig'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import AiCallService from '@/services/AiCallService'

const TEXT_LIMITS = {
  instructions: {
    min: 10,
    max: 10000,
    label: 'Response Instructions'
  },
  ttsText: {
    min: 1,
    max: 200,
    label: 'Test Content'
  }
} as const

const formSchema = toTypedSchema(z.object({
  instructions: z.string()
    .min(TEXT_LIMITS.instructions.min, `${TEXT_LIMITS.instructions.label} must have at least ${TEXT_LIMITS.instructions.min} characters`)
    .max(TEXT_LIMITS.instructions.max, `${TEXT_LIMITS.instructions.label} cannot exceed ${TEXT_LIMITS.instructions.max} characters`),
  voice: z.string().min(1, 'Please select a voice'),
  ttsText: z.string()
    .min(TEXT_LIMITS.ttsText.min, `${TEXT_LIMITS.ttsText.label} must have at least ${TEXT_LIMITS.ttsText.min} characters`)
    .max(TEXT_LIMITS.ttsText.max, `${TEXT_LIMITS.ttsText.label} cannot exceed ${TEXT_LIMITS.ttsText.max} characters`)
    .optional()
    .or(z.literal('')),
}))

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    instructions: '',
    voice: '',
    ttsText: ''
  }
})

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

const isPlaying = ref(false)
const isSaving = ref(false)
const isGeneratingTTS = ref(false)
const isFetching = ref(false)
const cachedAudio = ref<{
  url: string
  config: {
    voice: string
    instructions: string
    ttsText: string
  }
} | null>(null)
const currentAudio = ref<HTMLAudioElement | null>(null)

const isConfigChanged = computed(() => {
  if (!cachedAudio.value) return true
  const { voice, instructions, ttsText } = cachedAudio.value.config
  return voice !== form.values.voice ||
    instructions !== form.values.instructions ||
    ttsText !== form.values.ttsText
})

const stopAudio = () => {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
    isPlaying.value = false
    currentAudio.value = null
  }
}

const testTTS = async (e: Event) => {
  e.preventDefault()
  const { voice, instructions, ttsText } = form.values

  // Validate required fields for TTS testing
  if (!ttsText?.trim()) {
    toast.error('Please fill in all required information', {
      description: 'Test content is required to try the voice',
      duration: 3000,
    })
    return
  }

  if (!voice || !instructions) {
    toast.error('Please fill in all required information', {
      description: 'Voice and response instructions are required',
      duration: 3000,
    })
    return
  }

  try {
    isPlaying.value = true
    isGeneratingTTS.value = true

    // Check if we can reuse cached audio
    if (!isConfigChanged.value && cachedAudio.value) {
      const audio = new Audio(cachedAudio.value.url)
      currentAudio.value = audio
      audio.onended = () => {
        isPlaying.value = false
        currentAudio.value = null
      }
      await audio.play()
      return
    }

    // Generate new audio
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as TTSVoice,
      input: ttsText,
      response_format: 'mp3',
      speed: 1.0,
      instructions: instructions

    })

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    // Cache the new audio
    if (cachedAudio.value?.url) {
      URL.revokeObjectURL(cachedAudio.value.url)
    }
    cachedAudio.value = {
      url: audioUrl,
      config: {
        voice,
        instructions,
        ttsText
      }
    }

    const audio = new Audio(audioUrl)
    currentAudio.value = audio
    audio.onended = () => {
      isPlaying.value = false
      currentAudio.value = null

    }

    await audio.play()
  } catch (error) {
    console.error('Error testing TTS:', error)
    isPlaying.value = false
    currentAudio.value = null
    toast.error('Error generating voice', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    isGeneratingTTS.value = false
  }
}

const onSubmit = form.handleSubmit(async (values) => {
  try {
    isSaving.value = true
    // Configure session with AI instruction and voice only
    await AiCallService.configSession({
      instructions: values.instructions,
      voice: values.voice
    })

    // Show success message
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

// Import all voice samples
const voiceSamples = {
  'alloy': new Audio('@/assets/audio/sample_voice/openai-fm-alloy-professional.wav'),
  'echo': new Audio('@/assets/audio/sample_voice/openai-fm-echo-professional.wav'),
  'onyx': new Audio('@/assets/audio/sample_voice/openai-fm-onyx-professional.wav'),
  'nova': new Audio('@/assets/audio/sample_voice/openai-fm-nova-professional.wav'),
  'shimmer': new Audio('@/assets/audio/sample_voice/openai-fm-shimmer-professional.wav'),
  'sage': new Audio('@/assets/audio/sample_voice/openai-fm-sage-professional.wav'),
  'coral': new Audio('@/assets/audio/sample_voice/openai-fm-coral-professional.wav'),
  'verse': new Audio('@/assets/audio/sample_voice/openai-fm-verse-professional.wav'),
  'ballad': new Audio('@/assets/audio/sample_voice/openai-fm-ballad-professional.wav'),
  'ash': new Audio('@/assets/audio/sample_voice/openai-fm-ash-professional.wav'),
}

const isPlayingSample = ref(false)
const currentPlayingSample = ref<HTMLAudioElement | null>(null)

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

  const sample = voiceSamples[voice as keyof typeof voiceSamples]
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

const RECOMMENDED_VOICES = ['sage', 'coral']

const sortedVoices = computed(() => {
  return [...TTS_VOICES].sort((a, b) => {
    const aIsRecommended = RECOMMENDED_VOICES.includes(a.value)
    const bIsRecommended = RECOMMENDED_VOICES.includes(b.value)
    if (aIsRecommended && !bIsRecommended) return -1
    if (!aIsRecommended && bIsRecommended) return 1
    return 0
  })
})

// Hydrate form with existing configuration
const hydrateConfig = async () => {
  try {
    isFetching.value = true
    const config = await AiCallService.getConfig()

    // If config is null, set defaults
    if (!config) {
      form.setValues({
        ...form.values,
        instructions: '',
        voice: ''
      })
    } else {
      // Update form values with existing configuration
      form.setValues({
        ...form.values,
        instructions: config.instructions ?? '',
        voice: config.voice ?? ''
      })
    }
  } catch (error) {
    console.error('Error fetching AI configuration:', error)
    toast.error('Error loading configuration', {
      description: 'Unable to load existing configuration',
      duration: 3000,
    })
  } finally {
    isFetching.value = false
  }
}

onMounted(() => {
  hydrateConfig()
})

// Clean up audio resources when component is unmounted
onUnmounted(() => {
  if (cachedAudio.value?.url) {
    URL.revokeObjectURL(cachedAudio.value.url)
  }
  // Stop any playing sample
  if (currentPlayingSample.value) {
    currentPlayingSample.value.pause()
    currentPlayingSample.value = null
  }
  // Stop any playing audio
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value = null
  }
})

</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <header
      class="sticky top-[64px] left-0 right-0 bg-white dark:bg-gray-900 shadow-md p-4 md:px-8 z-10 flex items-center justify-between">
      <div class="grid gap-1">
        <h1 class="text-xl font-bold">AI Instructions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ isFetching ? 'Loading configuration...' : 'Manage and configure your AI model' }}
        </p>
      </div>
      <n-button type="submit" class="flex items-center justify-center gap-2" @click="onSubmit" :disabled="isSaving">
        <Loader2 v-if="isSaving" class="h-5 w-5 animate-spin" />
        <Bot v-else class="h-5 w-5" />
        <span>{{ isSaving ? 'Saving...' : 'Save Configuration' }}</span>
      </n-button>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 mt-4">
      <form @submit="onSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- First Column: Training Content -->
        <n-card class="max-h-[calc(100vh-200px)] overflow-auto">
          <CardHeader>
            <div class="grid gap-2">
              <CardTitle>Response Instructions</CardTitle>
              <CardDescription>
                Enter content to instruct the AI model
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-4 h-full">
              <FormField v-slot="{ componentField }" name="instructions" class="flex-1">
                <FormItem class="h-full flex flex-col">
                  <FormLabel>Response Instructions <span class="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div class="relative h-full">
                      <TextareaComponent v-bind="componentField" placeholder="Enter response instructions for AI..."
                        class="h-full min-h-[calc(100vh-400px)] max-h-[calc(100vh-400px)] resize-none pr-12" />
                      <div
                        class="absolute bottom-2 right-2 text-xs text-gray-500 bg-white dark:bg-gray-900 px-1 rounded">
                        {{ (form.values.instructions || '').length }}/{{ TEXT_LIMITS.instructions.max }}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

            </div>
          </CardContent>
        </n-card>

        <!-- Second Column: Voice Configuration and Testing -->
        <div class="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-auto">
          <n-card>
            <CardHeader>
              <div class="grid gap-2">
                <CardTitle>Voice Configuration</CardTitle>
                <CardDescription>
                  Customize AI voice
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <!-- Voice Selection -->
                <FormField name="voice">
                  <FormItem>
                    <FormLabel>Select Voice <span class="text-red-500">*</span></FormLabel>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      <div v-for="voice in sortedVoices" :key="voice.value" @click="() => {
                        form.setFieldValue('voice', voice.value);
                        playVoiceSample(voice.value);
                      }" :class="[
                        'flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        form.values.voice === voice.value
                          ? 'border-blue-500 ring-2 ring-blue-500'
                          : 'border-gray-200 dark:border-gray-700',
                        RECOMMENDED_VOICES.includes(voice.value) && 'bg-blue-50 dark:bg-blue-900/20',
                      ]">
                        <div class="flex items-center gap-1">
                          <span class="text-sm text-center">{{ voice.label }}</span>
                          <span v-if="RECOMMENDED_VOICES.includes(voice.value)" class="text-xs text-blue-500">★</span>
                        </div>
                        <div :class="[
                          'w-3 h-3 rounded-full mt-2',
                          form.values.voice === voice.value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
                        ]"></div>
                        <div class="flex items-center gap-2 mt-2">
                          <div
                            v-if="isPlayingSample && currentPlayingSample === voiceSamples[voice.value as keyof typeof voiceSamples]"
                            class="text-xs text-blue-500">
                            Playing...
                          </div>
                          <n-button
                            v-if="isPlayingSample && currentPlayingSample === voiceSamples[voice.value as keyof typeof voiceSamples]"
                            type="button" variant="ghost" size="sm" class="h-6 px-2" @click.stop="stopSampleVoice">
                            <Square class="h-4 w-4" />
                          </n-button>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </CardContent>
          </n-card>

          <n-card>
            <CardHeader>
              <div class="grid gap-2">
                <CardTitle>Test Voice</CardTitle>
                <CardDescription>
                  Try the voice with sample content
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <!-- Test Content -->
                <FormField v-slot="{ componentField }" name="ttsText">
                  <FormItem>
                    <FormLabel>Test Content</FormLabel>
                    <FormControl>
                      <div class="relative">
                        <TextareaComponent v-bind="componentField" placeholder="Enter content to test the voice..."
                          class="h-[100px] resize-none pr-12" />
                        <div class="absolute bottom-2 right-2 text-xs text-gray-500 bg-white dark:bg-gray-900 px-1">
                          {{ (form.values.ttsText || '').length }}/{{ TEXT_LIMITS.ttsText.max }}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <div class="flex justify-end gap-2">
                  <n-button v-if="isPlaying" type="button" variant="outline"
                    class="flex items-center justify-center gap-2" @click="stopAudio">
                    <Volume2 class="h-5 w-5" />
                    <span>Stop</span>
                  </n-button>
                  <n-button type="button" variant="outline" class="flex items-center justify-center gap-2"
                    @click="testTTS" :disabled="isPlaying || isGeneratingTTS">
                    <Loader2 v-if="isGeneratingTTS" class="h-5 w-5 animate-spin" />
                    <Volume2 v-else class="h-5 w-5" :class="{ 'animate-pulse': isPlaying }" />
                    <span>{{ isGeneratingTTS ? 'Generating...' : isPlaying ? 'Playing...' : 'Test Voice'
                      }}</span>
                  </n-button>
                </div>
              </div>
            </CardContent>
          </n-card>
        </div>
      </form>
    </main>
  </div>
</template>
