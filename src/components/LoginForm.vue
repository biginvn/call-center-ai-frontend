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
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import { loginAgent, loginAdmin, getUserInfo } from '@/services/authService'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Agent, Admin } from '@/types/User'
// import { h } from 'vue'
import * as z from 'zod'



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
    invalid_type_error: 'Ext phải là số',
  }).optional(),

}))

const { isFieldDirty, handleSubmit, setFieldError } = useForm({
  validationSchema: formSchema,
})

const isLoading = ref(false)
const isError = ref(false)

const router = useRouter()
const authStore = useAuthStore()

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

    if (!values.ext) {
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
        extension_number: values.ext
      });

      user = {
        id: '', // This should come from the API response
        username: values.username,
        email: '', // This should come from the API response
        status: 'active',
        lastLogin: new Date().toISOString(),
        role: 'agent',
        fullName: '',
        extensionNumber: values.ext
      };

      // Store extension number in local storage for SIP
      localStorage.setItem('extension_number', values.ext)
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
      const updatedUser = {
        ...user,
        ...userData,
        extensionNumber: user.role === 'agent' ? userData.extension_number : undefined
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
        setFieldError('username', 'Tên đăng nhập không chính xác');
      } else if (errorDetail === 'Incorrect password') {
        setFieldError('password', 'Mật khẩu không chính xác');
      } else if (errorDetail === 'Only admins can use this endpoint') {
        setFieldError('ext', 'Vui lòng điền số Extension');
      } else if (errorDetail === 'Extension number is already in use') {
        setFieldError('ext', 'Số Extension đã được sử dụng');
      } else if (errorDetail === 'Only agents can use this endpoint') {
        setFieldError('ext', 'Vui lòng xoá số Extension');
      } else if (errorDetail === 'Extension number must be a 3-digit number') {
        setFieldError('ext', 'Số Extension phải là số có 3 chữ số');
      } else if (errorDetail === 'Extension not found') {
        setFieldError('ext', 'Số không hợp lệ')
      } else if (errorDetail === 'User already on connection, please login another account') {
        setFieldError('username', 'Người dùng đã đăng nhập trên thiết bị khác');
      } else {
        setFieldError('username', 'Vui lòng kiểm tra thông tin đăng nhập')
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
      setFieldError('username', 'Vui lòng kiểm tra thông tin đăng nhập')
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
    <FormField v-slot="{ componentField }" name="ext" :validate-on-blur="!isFieldDirty">
      <FormItem v-auto-animate>
        <FormLabel>Ext</FormLabel>
        <FormControl>
          <n-input type="text" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <n-button type="submit" :disabled="isLoading" class="w-full">
      <template v-if="isLoading">Signing in...</template>
      <template v-else>Sign in</template>
    </n-button>
  </form>
</template>
