<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { Bot, Volume2, Loader2, Square, Sparkles, Globe } from 'lucide-vue-next'
import { TextareaComponent } from '@/components/ui/textarea'
import { NInput } from '@/components/ui/input'
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
const isGeneratingInstructions = ref(false)
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

const generateInstructions = async () => {
  try {
    isGeneratingInstructions.value = true

    let prompt = ''

    // Check if instructions already contain crawled content (likely contains page separators)
    if (form.values.instructions && form.values.instructions.includes('---')) {
      prompt = `Based on the following website content, generate comprehensive and professional response instructions for a call center AI assistant in the language of website content. The AI should be able to answer customer questions about the products, services, or information found on this website.

Website Content:
${form.values.instructions}

Please create detailed instructions that include:
1. Professional greeting mentioning the company/service
2. Key information the AI should know from the website
3. How to handle common customer inquiries based on the content
4. Escalation procedures for complex issues
5. Professional closing guidelines

The instructions should be specific to the business/service described in the website content and help the AI provide accurate, helpful responses to customers. Make the instructions comprehensive but concise (500-1000 words).`
    } else {
      // Default prompt for generating generic instructions
      prompt = form.values.instructions || `You are a professional call center AI assistant. Generate comprehensive and professional response instructions for a call center AI that should handle customer service interactions effectively according to language of the prompt.

The instructions should include:
1. Professional greeting and introduction
2. Active listening and empathy guidelines
3. Problem-solving approach
4. Escalation procedures
5. Closing conversation guidelines
6. Tone and language requirements

Please provide detailed, actionable instructions that will help the AI provide excellent customer service. The instructions should be around 500-800 words and be specific to call center scenarios.

Make the instructions professional, empathetic, and solution-oriented.`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const generatedInstructions = response.choices[0]?.message?.content
    if (generatedInstructions) {
      form.setFieldValue('instructions', generatedInstructions)
      toast.success('Instructions generated successfully', {
        description: 'AI-generated instructions have been added to the form',
        duration: 3000,
      })
    } else {
      throw new Error('No content generated')
    }
  } catch (error) {
    console.error('Error generating instructions:', error)
    toast.error('Error generating instructions', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    isGeneratingInstructions.value = false
  }
}

// Web crawling functionality
const crawlUrl = ref('')
const isCrawling = ref(false)

const crawlWebsite = async () => {
  if (!crawlUrl.value.trim()) {
    toast.error('Please enter a valid URL', {
      description: 'URL is required to crawl website content',
      duration: 3000,
    })
    return
  }

  try {
    isCrawling.value = true

    // Call the crawl server
    const response = await fetch('http://localhost:3010/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: crawlUrl.value,
        collection: 'temp_crawl',
        max_depth: 1,
        chunk_size: 1000,
        insert_to_db: false // We don't need to store in DB, just get the content
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Crawling failed')
    }

    // Combine all markdown content from crawled pages and remove links to save tokens
    const combinedContent = result.markdown_content
      .map((item: { url: string; markdown: string }) => {
        // Remove markdown links [text](url) and keep only the text
        return item.markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      })
      .join('\n\n---\n\n')

    // Insert the crawled content directly into the instructions field
    form.setFieldValue('instructions', combinedContent)

    toast.success('Website content crawled successfully', {
      description: `Crawled ${result.urls_crawled.length} pages and inserted content into instructions. Use "Generate AI Instructions" to convert this content.`,
      duration: 5000,
    })
    crawlUrl.value = '' // Clear the URL input

  } catch (error) {
    console.error('Error crawling website:', error)
    toast.error('Error crawling website', {
      description: error instanceof Error ? error.message : 'Please try again later',
      duration: 3000,
    })
  } finally {
    isCrawling.value = false
  }
}

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
        <h1 class="text-xl font-bold">
          AI Instructions
          <span v-if="authStore.user?.client_name">- {{ authStore.user.client_name }}</span>
        </h1>
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
      <!-- Web Crawling Section -->
      <n-card>
        <CardHeader>
          <div class="grid gap-2">
            <CardTitle class="flex items-center gap-2">
              <Globe class="h-5 w-5" />
              Generate Instructions from Website
            </CardTitle>
            <CardDescription>
              Crawl a website and insert its content into the instructions field. Use "Generate AI Instructions" button
              afterwards to convert the content.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <NInput v-model="crawlUrl" type="url" placeholder="Enter website URL (e.g., https://example.com)"
                class="w-full" :disabled="isCrawling" />
            </div>
            <n-button type="button" class="flex items-center justify-center gap-2 whitespace-nowrap"
              @click="crawlWebsite" :disabled="isCrawling || !crawlUrl.trim()">
              <Loader2 v-if="isCrawling" class="h-4 w-4 animate-spin" />
              <Globe v-else class="h-4 w-4" />
              <span>{{ isCrawling ? 'Crawling...' : 'Crawl Website' }}</span>
            </n-button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            This will crawl the website content and insert it into the instructions field. Use the "Generate AI
            Instructions" button to convert this content into proper AI instructions.
          </p>
        </CardContent>
      </n-card>

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
                  <div class="flex items-center justify-between">
                    <FormLabel>Response Instructions <span class="text-red-500">*</span></FormLabel>
                    <n-button type="button" variant="outline" size="sm" class="flex items-center gap-2"
                      @click="generateInstructions" :disabled="isGeneratingInstructions">
                      <Loader2 v-if="isGeneratingInstructions" class="h-4 w-4 animate-spin" />
                      <Sparkles v-else class="h-4 w-4" />
                      <span>{{ isGeneratingInstructions ? 'Generating...' : 'Generate AI Instructions' }}</span>
                    </n-button>
                  </div>
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
