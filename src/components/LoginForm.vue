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
import { loginAgent, loginAdmin } from '@/services/authService'
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
    required_error: 'Tên đăng nhập là bắt buộc',
    invalid_type_error: 'Tên đăng nhập phải là chuỗi',
  }).max(50, {
    message: 'Tên đăng nhập không được vượt quá 50 ký tự',
  }),
  password: z.string({
    required_error: 'Mật khẩu là bắt buộc',
    invalid_type_error: 'Mật khẩu phải là chuỗi',
  }).max(50, {
    message: 'Mật khẩu không được vượt quá 50 ký tự',
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
        extensionNumber: parseInt(values.ext)
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
      }

      const errors = errorResponse.response?.data?.errors;
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
      setFieldError('username', 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
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
        <FormLabel>Tên đăng nhập</FormLabel>
        <FormControl>
          <n-input type="text" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="password" :validate-on-blur="!isFieldDirty">
      <FormItem v-auto-animate>
        <FormLabel>Mật khẩu</FormLabel>
        <FormControl>
          <n-input type="password" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="flex gap-4">
      <FormField v-slot="{ componentField }" name="ext" :validate-on-blur="!isFieldDirty" class="w-1/2">
        <FormItem v-auto-animate>
          <FormLabel>Ext</FormLabel>
          <FormControl>
            <n-input type="text" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <n-button type="button" class="w-1/2 mt-5.5" :disabled="isLoading" @click="handleLogin">
        <template v-if="isLoading">Đang đăng nhập...</template>
        <template v-else>Đăng nhập</template>
      </n-button>
    </div>
  </form>
</template>
