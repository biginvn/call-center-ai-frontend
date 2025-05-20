<template>
  <input :value="phoneNumber" @input="
    (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target) phoneNumber = target.value
    }
  " class="text-2xl text-center h-14" maxlength="4" />
  <div class="grid grid-cols-3 gap-4">
    <button v-for="key in [1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#']" :key="key"
      class="h-16 text-xl border rounded-md hover:bg-gray-100" @click="handleKeyPress(key.toString())">
      <template v-if="key === '#'">
        <Delete class="h-6 w-6 mx-auto" />
      </template>
      <template v-else-if="key === '*'">
        <X class="h-6 w-6 mx-auto" />
      </template>
      <template v-else>
        {{ key }}
      </template>
    </button>
  </div>
  <div class="flex justify-center">
    <button class="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
      @click="handleCall">
      <Phone class="h-6 w-6 text-white" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Delete, Phone, X } from 'lucide-vue-next'
import { useSipStore } from '@/stores/sip'

defineOptions({
  name: 'PhoneDialpad'
})

const props = defineProps<{
  onCall: (phoneNumber: string) => void
}>()

const sipStore = useSipStore()
const phoneNumber = ref('')

const handleKeyPress = (key: string) => {
  if (key === '*') {
    handleClear()
  } else if (key === '#') {
    handleBackspace()
  } else {
    if (phoneNumber.value.length < 4) {
      phoneNumber.value += key
    }
  }
}

const handleClear = () => {
  phoneNumber.value = ''
}

const handleBackspace = () => {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

const handleCall = () => {
  if (phoneNumber.value.length > 0) {
    // Make the call using SIP
    console.log('Making call to:', phoneNumber.value)
    sipStore.makeCall(phoneNumber.value)
    props.onCall(phoneNumber.value)
    phoneNumber.value = ''
  }
}
</script>
