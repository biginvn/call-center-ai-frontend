<script setup lang="ts">
import { NButton } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { NInput } from '@/components/ui/input'
import NSelect from '@/components/ui/select/NSelect.vue'
import SelectTrigger from '@/components/ui/select/SelectTrigger.vue'
import SelectValue from '@/components/ui/select/SelectValue.vue'
import SelectContent from '@/components/ui/select/SelectContent.vue'
import SelectGroup from '@/components/ui/select/SelectGroup.vue'
import SelectItem from '@/components/ui/select/SelectItem.vue'
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import axios from '@/services/axiosInstance'
import { loginAgent, loginAdmin, getUserInfo } from '@/services/authService'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Agent, Admin } from '@/types/User'
// import { h } from 'vue'
import * as z from 'zod'

interface Extension {
  _id: string;
  extension: string;
  number: string;
  available: boolean;
  user: unknown | null;
}

const props = defineProps<{ isAdmin?: boolean }>()

const formSchema = toTypedSchema(z.object({
  username: z.string({
    required_error: 'Username is required',
    invalid_type_error: 'Username must be a string',
  }).max(50, {
    message: 'Username cannot exceed 50 characters',
  }),
  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }).max(50, {
    message: 'Password cannot exceed 50 characters',
  }),
  ext: z.string({
    invalid_type_error: 'Ext must be a number',
  }).optional(),

}))

const { isFieldDirty, handleSubmit, setFieldError } = useForm({
  validationSchema: formSchema,
})

const isLoading = ref(false)
const isError = ref(false)

const router = useRouter()
const authStore = useAuthStore()

const availableExtensions = ref<{ label: string; value: string }[]>([])
const loadingExtensions = ref(false)

onMounted(async () => {
  if (!props.isAdmin) {
    loadingExtensions.value = true
    try {
      const res = await axios.get<Extension[]>('/extensions/available')
      // Only show extensions with user == null
      availableExtensions.value = (res.data || [])
        .filter((ext) => ext.user == null)
        .map((ext) => ({ label: `${ext.extension} (${ext.number})`, value: ext.number }))
    } catch {
      availableExtensions.value = []
    } finally {
      loadingExtensions.value = false
    }
  }
})

const handleFormSubmit = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  await handleLogin()
  return false
}

const handleLogin = async () => {
  await onSubmit()
}

const onSubmit = handleSubmit(async (values) => {
  try {
    isLoading.value = true
    isError.value = false

    let response;
    let user: Agent | Admin;

    if (props.isAdmin) {
      // Admin login
      response = await loginAdmin({
        username: values.username,
        password: values.password
      });

      user = {
        id: '', // This should come from the API response
        username: values.username,
        email: '', // This should come from the API response
        status: 'active', // This should come from the API response
        lastLogin: new Date().toISOString(),
        role: 'admin',
        fullName: '', // This should come from the API response
      };
    } else {
      // Agent login
      response = await loginAgent({
        username: values.username,
        password: values.password,
        extension_number: values.ext ?? ''
      });

      // Find the selected extension object
      const selectedExtObj = availableExtensions.value.find(ext => ext.value === values.ext);
      user = {
        id: '', // This should come from the API response
        username: values.username,
        email: '', // This should come from the API response
        status: 'active',
        lastLogin: new Date().toISOString(),
        role: 'agent',
        fullName: '',
        extensionNumber: values.ext ?? '',
        extension: selectedExtObj ? selectedExtObj.label : ''
      };

      if (values.ext) {
        localStorage.setItem('extension_number', values.ext)
        localStorage.setItem('extension', selectedExtObj ? selectedExtObj.label : '')
      }
    }

    // Update auth store with tokens and user info
      authStore.login({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user
      });

    await nextTick();

    // Get user info immediately after login
    try {
      const userData = await getUserInfo(response.access_token);
      // Find the selected extension object again for fallback
      const selectedExtObj = availableExtensions.value.find(ext => ext.value === userData.extension_number);
      const updatedUser = {
        ...user,
        ...userData,
        ...(user.role === 'agent' ? {
          extensionNumber: userData.extension_number ?? '',
          extension: selectedExtObj ? selectedExtObj.label : user.extension
        } : {})
      } as Agent | Admin;

      // Update the store with the complete user data
      authStore.login({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user: updatedUser
      });

      user = updatedUser;
    } catch (error) {
      console.error('Failed to get user info:', error);
    }

    await router.push(user.role === 'admin' ? '/admin' : '/');
  } catch (error: unknown) {
    isError.value = true

    if (error && typeof error === 'object' && 'response' in error) {
      const errorResponse = error as {
        response?: {
          data?: {
            detail?: string,
            errors?: Record<string, string>,
            message?: string
          }
        }
      };

      console.error('Login failed:', errorResponse.response?.data);

      const errorDetail = errorResponse.response?.data?.detail;
      const errors = errorResponse.response?.data?.errors;

      if (errorDetail === 'Incorrect username') {
        setFieldError('username', 'Incorrect username');
      } else if (errorDetail === 'Incorrect password') {
        setFieldError('password', 'Incorrect password');
      } else if (errorDetail === 'Only admins can use this endpoint') {
        if (props.isAdmin) {
          setFieldError('username', 'Only admins can use this endpoint');
        } else {
          setFieldError('ext', 'Only admins can use this endpoint');
        }
      } else if (errorDetail === 'Extension number is already in use') {
        setFieldError('ext', 'Extension number is already in use');
      } else if (errorDetail === 'Only agents can use this endpoint') {
        setFieldError('ext', 'Please remove Extension number');
      } else if (errorDetail === 'Extension number must be a 3-digit number') {
        setFieldError('ext', 'Extension number must be a 3-digit number');
      } else if (errorDetail === 'Extension not found') {
        setFieldError('ext', 'Invalid extension number')
      } else if (errorDetail === 'User already on connection, please login another account') {
        setFieldError('username', 'User is already logged in on another device');
      } else {
        setFieldError('username', 'Please check your login information')
        setFieldError('password', '')
        setFieldError('ext', '')
      }

      if (errors) {
        if (errors.username) {
          setFieldError('username', errors.username);
        }
        if (errors.password) {
          setFieldError('password', errors.password);
        }
        if (errors.ext) {
          setFieldError('ext', errors.ext);
        }
      }
    } else {
      console.error('General error:', error);
      setFieldError('username', 'Please check your login information')
      setFieldError('password', '')
      setFieldError('ext', '')
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleFormSubmit">
    <FormField v-slot="{ componentField }" name="username" :validate-on-blur="!isFieldDirty">
      <FormItem v-auto-animate>
        <FormLabel>Username</FormLabel>
        <FormControl>
          <n-input type="text" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="password" :validate-on-blur="!isFieldDirty">
      <FormItem v-auto-animate>
        <FormLabel>Password</FormLabel>
        <FormControl>
          <n-input type="password" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-if="!props.isAdmin" v-slot="{ componentField }" name="ext" :validate-on-blur="!isFieldDirty">
      <FormItem>
        <FormLabel>Ext</FormLabel>
        <NSelect v-bind="componentField">
          <FormControl class="w-full">
            <SelectTrigger>
              <SelectValue placeholder="Select extension" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="ext in availableExtensions" :key="ext.value" :value="ext.value">
                {{ ext.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </NSelect>
        <FormMessage />
      </FormItem>
    </FormField>
    <n-button type="submit" :disabled="isLoading" class="w-full">
      <template v-if="isLoading">Signing in...</template>
      <template v-else>Sign in</template>
    </n-button>
  </form>
</template>
