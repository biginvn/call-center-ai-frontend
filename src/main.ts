import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadConfig } from './config'
// import { useAuthStore } from './stores/auth'

const bootstrap = async () => {
  try {
    // Load configuration first
    const config = await loadConfig()
    console.log('Loaded configuration:', config)

    const app = createApp(App)
    const pinia = createPinia()
    app.use(pinia)
    app.use(router)

    // Make config available globally
    app.config.globalProperties.$config = config

    // Load user data from storage
    // const authStore = useAuthStore()
    // await authStore.loadFromStorage()

    app.mount('#app')
  } catch (error) {
    console.error('Failed to bootstrap application:', error)
    // You might want to show an error message to the user here
  }
}

bootstrap().catch(console.error)
