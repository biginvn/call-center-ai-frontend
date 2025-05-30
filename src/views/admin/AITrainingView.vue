<script setup lang="ts">
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import { NCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NButton } from '@/components/ui/button'
import { Bot, Volume2 } from 'lucide-vue-next'
import { TextareaComponent } from '@/components/ui/textarea'
import { ref } from 'vue'
import { conversationService } from '@/services/conversationService'
import {
  NSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import OpenAI from 'openai'
import { TTS_VOICES, TTS_VIBES, getVibeInstructions, type TTSVoice, type TTSVibe } from '@/config/ttsConfig'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

const aiPrompt = ref('')
const isTraining = ref(false)
const ttsText = ref('')
const selectedVoice = ref<TTSVoice | null>(null)
const selectedVibe = ref<TTSVibe | null>(null)
const isPlaying = ref(false)

const startTraining = async () => {
  try {
    isTraining.value = true
    // Get session for training
    const sessionResponse = await conversationService.getSession(aiPrompt.value)
    console.log('Training session:', sessionResponse)
    // Here you can add additional training logic
  } catch (error) {
    console.error('Error during training:', error)
  } finally {
    isTraining.value = false
  }
}

const testTTS = async () => {
  if (!selectedVoice.value || !selectedVibe.value) return

  try {
    isPlaying.value = true
    const instructions = getVibeInstructions(selectedVibe.value)

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice.value,
      input: ttsText.value,
      response_format: 'mp3',
      speed: 1.0,
      instructions
    })

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    audio.onended = () => {
      isPlaying.value = false
      URL.revokeObjectURL(audioUrl)
    }

    await audio.play()
  } catch (error) {
    console.error('Error testing TTS:', error)
    isPlaying.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <AdminNavbar />
    <main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div class="grid gap-4 md:grid-cols-2">
        <n-card>
          <CardHeader>
            <div class="grid gap-2">
              <CardTitle>Huấn luyện AI</CardTitle>
              <CardDescription>
                Quản lý và huấn luyện mô hình AI của bạn
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-4">
              <TextareaComponent v-model="aiPrompt" placeholder="Nhập nội dung huấn luyện cho AI..."
                class="min-h-[200px]" />
              <div class="flex justify-end">
                <n-button variant="outline" class="flex items-center justify-center gap-2" @click="startTraining"
                  :disabled="isTraining">
                  <Bot class="h-5 w-5" />
                  <span>{{ isTraining ? 'Đang huấn luyện...' : 'Bắt đầu huấn luyện' }}</span>
                </n-button>
              </div>
            </div>
          </CardContent>
        </n-card>

        <n-card>
          <CardHeader>
            <div class="grid gap-2">
              <CardTitle>Cấu hình giọng nói</CardTitle>
              <CardDescription>
                Tùy chỉnh và kiểm tra giọng nói AI
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-4">
              <div class="grid gap-2">
                <label class="text-sm font-medium">Chọn giọng nói</label>
                <NSelect v-model="selectedVoice">
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn giọng nói..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Giọng nói</SelectLabel>
                      <SelectItem v-for="voice in TTS_VOICES" :key="voice.value" :value="voice.value">
                        {{ voice.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </NSelect>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium">Chọn cảm xúc</label>
                <NSelect v-model="selectedVibe">
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cảm xúc..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Cảm xúc</SelectLabel>
                      <SelectItem v-for="vibe in TTS_VIBES" :key="vibe.value" :value="vibe.value">
                        {{ vibe.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </NSelect>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-medium">Nội dung kiểm tra</label>
                <TextareaComponent v-model="ttsText" placeholder="Nhập nội dung để kiểm tra giọng nói..."
                  class="min-h-[100px]" />
              </div>

              <div class="flex justify-end">
                <n-button variant="outline" class="flex items-center justify-center gap-2" @click="testTTS"
                  :disabled="!selectedVoice || !selectedVibe || !ttsText || isPlaying">
                  <Volume2 class="h-5 w-5" :class="{ 'animate-pulse': isPlaying }" />
                  <span>{{ isPlaying ? 'Đang phát...' : 'Kiểm tra giọng nói' }}</span>
                </n-button>
              </div>
            </div>
          </CardContent>
        </n-card>
      </div>
    </main>
  </div>
</template>
