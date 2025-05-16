<script setup lang="ts">
import {
    PinInput,
    PinInputGroup,
    PinInputSlot,
} from '@/components/ui/pin-input'
import { ref } from 'vue'

const value = ref<string[]>([])
const handleComplete = (e: string[]) => alert(e.join(''))
</script>

<template>
    <div>
        <PinInput id="pin-input" v-model="value" placeholder="" @complete="handleComplete">
            <PinInputGroup>
                <PinInputSlot v-for="(id, index) in 3" :key="id" :index="index" />
            </PinInputGroup>
        </PinInput>
    </div>
</template>