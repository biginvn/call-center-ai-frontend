<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import {
  NDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Bot, Volume2, Loader2, Square, Sparkles, Globe } from 'lucide-vue-next'
import { TextareaComponent } from '@/components/ui/textarea'
import { NInput } from '@/components/ui/input'
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { TTS_VOICES } from '@/config/ttsConfig'
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
import { NLabel } from '@/components/ui/label'
import AiCallService from '@/services/AiCallService'
import axios from '@/services/axiosInstance'

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

    // Generate new audio using backend API
    const response = await axios.post('/api/openai/tts', {
      text: ttsText,
      voice: voice,
      model: 'tts-1',
      response_format: 'mp3',
      speed: 1.0,
      instructions: instructions
    }, {
      responseType: 'blob'
    })

    const audioBlob = response.data
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
    const currentInstructions = form.values.instructions?.trim()

    // Store current instructions as crawled content for reference
    if (currentInstructions) {
      crawledContent.value = currentInstructions
    }

    if (!currentInstructions) {
      // Generate from scratch if no content exists
      prompt = `Create comprehensive and professional response instructions for a friendly call center AI voicebot. The AI should be conversational, helpful, and empathetic while maintaining professionalism.

Please generate detailed instructions that include:

1. **Greeting & Introduction**
   - Warm, friendly greeting that puts customers at ease
   - Clear identification of the AI assistant and company
   - Setting positive expectations for the conversation

2. **Communication Style**
   - Use conversational, natural language (avoid robotic responses)
   - Show empathy and understanding for customer concerns
   - Use positive language and solution-focused approach
   - Ask clarifying questions when needed

3. **Customer Service Guidelines**
   - Active listening techniques for voice interactions
   - How to handle different customer emotions (frustrated, confused, happy)
   - Ways to build rapport and trust during voice calls
   - Techniques for keeping customers engaged

4. **Problem-Solving Approach**
   - Step-by-step process for understanding customer needs
   - How to provide clear, actionable solutions
   - When and how to offer alternatives
   - Follow-up procedures to ensure satisfaction

5. **Escalation Procedures**
   - Clear criteria for when to transfer to human agents
   - How to prepare customers for transfers
   - Smooth handoff procedures with context preservation

6. **Call Closing**
   - Professional but warm closing statements
   - Confirmation of resolution or next steps
   - Invitation for future contact

Make the instructions around 1200-1500 words, specific to voice interactions, and focused on creating positive customer experiences.`
    } else {
      // Polish and improve existing instructions
      prompt = `Please polish, improve, and optimize the following voicebot instructions. Focus on making them more friendly, conversational, and effective for voice interactions while fixing any errors or unclear parts.

Current Instructions:
${currentInstructions}

Please:
1. **Fix any errors** in grammar, spelling, or clarity
2. **Improve the tone** to be more friendly and conversational
3. **Enhance structure** for better organization and flow
4. **Add missing elements** that would improve customer experience
5. **Optimize for voice** interactions (not text chat)
6. **Ensure completeness** with all necessary customer service elements

Focus on:
- Making the language more natural and conversational
- Adding empathy and warmth while maintaining professionalism
- Improving clarity and reducing ambiguity
- Enhancing customer experience guidelines
- Adding specific voice interaction techniques
- Strengthening problem-resolution approaches

Return improved instructions that are approximately 1200-1500 words and optimized for creating positive voicebot customer experiences.`
    }

    const response = await axios.post('/api/openai/chat/completions', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert in customer service and voicebot optimization. Create clear, actionable, and friendly instructions that will help AI assistants provide excellent customer experiences through voice interactions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent, professional output
    })

    const generatedInstructions = response.data?.content
    if (generatedInstructions) {
      // Store the generated content in improvedContent and show preview
      improvedContent.value = generatedInstructions
      showPreviewStep.value = true

      // More specific success message based on the action
      let successMessage = 'Instructions generated successfully'
      let description = 'Review the improved instructions and apply when ready'

      if (!currentInstructions) {
        description = 'New voicebot instructions have been created. Review and apply when ready'
      } else if (currentInstructions.includes('---')) {
        description = 'Website content has been transformed. Review the improved instructions'
      } else {
        successMessage = 'Instructions polished successfully'
        description = 'Your instructions have been improved. Review and apply when ready'
      }

      toast.success(successMessage, {
        description,
        duration: 3000,
      })
    } else {
      throw new Error('No content generated')
    }
  } catch (error) {
    console.error('Error generating instructions:', error)
    toast.error('Error processing instructions', {
      description: 'Please check your content and try again',
      duration: 3000,
    })
  } finally {
    isGeneratingInstructions.value = false
  }
}

// Web crawling functionality
const crawlUrl = ref('')
const crawlDepth = ref(1)
const isCrawling = ref(false)
const isModalOpen = ref(false)
const isProcessingCrawl = ref(false)
const crawledContent = ref('')
const improvedContent = ref('')
const showPreviewStep = ref(false)

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
    const { data: result } = await axios.post('/crawl/', {
      url: crawlUrl.value,
      collection: 'temp_crawl',
      max_depth: crawlDepth.value,
      chunk_size: 1000,
      insert_to_db: false // We don't need to store in DB, just get the content
    })

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

    // Store the crawled content
    crawledContent.value = combinedContent

    toast.success('Website content crawled successfully', {
      description: `Crawled ${result.urls_crawled.length} pages. Processing with AI...`,
      duration: 3000,
    })

    // Process with AI to improve the content
    await processWithAI()

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

const processWithAI = async () => {
  try {
    isProcessingCrawl.value = true

    const prompt = `Transform the following website content into professional, friendly voicebot instructions. Polish the content to make it conversational and suitable for voice interactions.

Original Content:
${crawledContent.value}

Please:
1. **Polish & Improve** the existing content for voice interactions
2. **Fix any errors** in grammar, clarity, or structure
3. **Make it friendly** and conversational for voicebot use
4. **Organize information** logically for customer service scenarios
5. **Add missing elements** like greetings, empathy guidelines, and closing procedures

Create comprehensive voicebot instructions that include:
- Warm, professional greeting mentioning the company/service
- Key information from the website presented conversationally
- Guidelines for handling customer inquiries based on the content
- Empathetic response techniques for voice interactions
- Clear escalation procedures
- Friendly closing guidelines

Transform the content into 1200-1500 words of actionable, voice-optimized instructions that will help the AI provide excellent customer service while maintaining the original business information.`

    const response = await axios.post('/api/openai/chat/completions', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert in customer service and voicebot optimization. Create clear, actionable, and friendly instructions that will help AI assistants provide excellent customer experiences through voice interactions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent, professional output
    })

    const generatedInstructions = response.data?.content
    if (generatedInstructions) {
      improvedContent.value = generatedInstructions
      showPreviewStep.value = true
      isModalOpen.value = false

      toast.success('Content processed successfully', {
        description: 'Review the improved instructions and apply when ready',
        duration: 3000,
      })
    } else {
      throw new Error('No content generated')
    }
  } catch (error) {
    console.error('Error processing content with AI:', error)
    toast.error('Error processing content', {
      description: 'Please try again later',
      duration: 3000,
    })
  } finally {
    isProcessingCrawl.value = false
  }
}

const applyImprovedContent = () => {
  form.setFieldValue('instructions', improvedContent.value)
  showPreviewStep.value = false
  crawledContent.value = ''
  improvedContent.value = ''
  crawlUrl.value = ''
  crawlDepth.value = 1

  toast.success('Instructions applied successfully', {
    description: 'The improved content has been added to your instructions',
    duration: 3000,
  })
}

const discardImprovedContent = () => {
  showPreviewStep.value = false
  crawledContent.value = ''
  improvedContent.value = ''
  crawlUrl.value = ''
  crawlDepth.value = 1

  toast.info('Content discarded', {
    description: 'The improved content has been discarded',
    duration: 2000,
  })
}

// Import all voice samples
const voiceSamples = {
  'alloy': new Audio('/assets/audio/sample_voice/openai-fm-alloy-professional.wav'),
  'echo': new Audio('/assets/audio/sample_voice/openai-fm-echo-professional.wav'),
  'onyx': new Audio('/assets/audio/sample_voice/openai-fm-onyx-professional.wav'),
  'nova': new Audio('/assets/audio/sample_voice/openai-fm-nova-professional.wav'),
  'shimmer': new Audio('/assets/audio/sample_voice/openai-fm-shimmer-professional.wav'),
  'sage': new Audio('/assets/audio/sample_voice/openai-fm-sage-professional.wav'),
  'coral': new Audio('/assets/audio/sample_voice/openai-fm-coral-professional.wav'),
  'verse': new Audio('/assets/audio/sample_voice/openai-fm-verse-professional.wav'),
  'ballad': new Audio('/assets/audio/sample_voice/openai-fm-ballad-professional.wav'),
  'ash': new Audio('/assets/audio/sample_voice/openai-fm-ash-professional.wav'),
  'cedar': new Audio('/assets/audio/sample_voice/openai-fm-cedar-professional.wav'),
  'marin': new Audio('/assets/audio/sample_voice/openai-fm-marin-professional.wav'),
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

const RECOMMENDED_VOICES = ['sage', 'coral', 'ash', 'cedar', 'marin']

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
  // Clean up crawling state
  crawledContent.value = ''
  improvedContent.value = ''
  showPreviewStep.value = false
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
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <FormLabel>Response Instructions <span class="text-red-500">*</span></FormLabel>
                    <div class="flex gap-2">
                      <NDialog v-model:open="isModalOpen">
                        <DialogTrigger asChild>
                          <n-button type="button" variant="outline" size="sm" class="flex items-center gap-2"
                            :disabled="showPreviewStep">
                            <Globe class="h-4 w-4" />
                            <span>Crawl Website</span>
                          </n-button>
                        </DialogTrigger>
                        <DialogContent class="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Generate Instructions from Website</DialogTitle>
                            <DialogDescription>
                              Enter a website URL to crawl its content and get AI-improved instructions that you can
                              review before applying.
                            </DialogDescription>
                          </DialogHeader>
                          <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-2">
                              <NLabel for="crawl-url">Website URL</NLabel>
                              <NInput v-model="crawlUrl" type="url" id="crawl-url"
                                placeholder="Enter website URL (e.g., https://example.com)" class="w-full"
                                :disabled="isCrawling || isProcessingCrawl" />
                            </div>
                            <div class="flex flex-col gap-2">
                              <NLabel for="crawl-depth">Crawl Depth</NLabel>
                              <NInput v-model.number="crawlDepth" type="number" id="crawl-depth" placeholder="1" min="1"
                                max="5" class="w-full" :disabled="isCrawling || isProcessingCrawl" />
                              <p class="text-xs text-gray-500">
                                How many levels deep to crawl (1 = homepage only, 2 = homepage + linked pages, etc.)
                              </p>
                            </div>
                            <div class="flex justify-end gap-2">
                              <n-button type="button" variant="outline" @click="() => {
                                isModalOpen = false;
                                crawlUrl = '';
                                crawlDepth = 1;
                              }" :disabled="isCrawling || isProcessingCrawl">
                                Cancel
                              </n-button>
                              <n-button type="button" @click="crawlWebsite"
                                :disabled="isCrawling || isProcessingCrawl || !crawlUrl.trim()">
                                <Loader2 v-if="isCrawling || isProcessingCrawl" class="h-4 w-4 animate-spin mr-2" />
                                <Globe v-else class="h-4 w-4 mr-2" />
                                <span>{{
                                  isCrawling ? 'Crawling...' :
                                    isProcessingCrawl ? 'Processing...' :
                                      'Crawl & Process'
                                }}</span>
                              </n-button>
                            </div>
                            <p class="text-xs text-gray-500">
                              This will crawl the website content at the specified depth, process it with AI, and show
                              you a preview to review before applying. Higher depths will crawl more pages but take
                              longer.
                            </p>
                          </div>
                        </DialogContent>
                      </NDialog>

                      <!-- Preview Improved Content Dialog -->
                      <NDialog v-model:open="showPreviewStep">
                        <DialogContent class="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Review AI-Improved Instructions</DialogTitle>
                            <DialogDescription>
                              Review and edit the AI-improved content before applying it to your instructions.
                            </DialogDescription>
                          </DialogHeader>
                          <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div class="flex-1 overflow-auto">
                              <NLabel for="improved-content">Improved Instructions</NLabel>
                              <TextareaComponent v-model="improvedContent" id="improved-content"
                                placeholder="AI-improved instructions will appear here..."
                                class="w-full h-[400px] resize-none mt-2" />
                              <div class="text-xs text-gray-500 mt-1">
                                {{ improvedContent.length }} characters
                              </div>
                            </div>
                            <div class="flex justify-end gap-2 pt-4 border-t">
                              <n-button type="button" variant="outline" @click="discardImprovedContent">
                                Discard
                              </n-button>
                              <n-button type="button" @click="applyImprovedContent" :disabled="!improvedContent.trim()">
                                Apply to Instructions
                              </n-button>
                            </div>
                          </div>
                        </DialogContent>
                      </NDialog>
                      <n-button type="button" variant="outline" size="sm" class="flex items-center gap-2"
                        @click="generateInstructions" :disabled="isGeneratingInstructions"
                        title="Generate new instructions from scratch, polish existing content, or improve website-crawled content">
                        <Loader2 v-if="isGeneratingInstructions" class="h-4 w-4 animate-spin" />
                        <Sparkles v-else class="h-4 w-4" />
                        <span>{{ isGeneratingInstructions ? 'Processing...' : 'Polish & Improve' }}</span>
                      </n-button>
                    </div>
                  </div>
                  <!-- Preview notification -->
                  <!-- <div v-if="showPreviewStep"
                    class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-700 dark:text-blue-300">
                    <div class="flex items-center gap-2">
                      <Sparkles class="h-4 w-4" />
                      <span>AI-improved content is ready for review. Click to open preview dialog.</span>
                      <n-button type="button" variant="outline" size="sm" @click="showPreviewStep = true">
                        Review Content
                      </n-button>
                    </div>
                  </div> -->
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
