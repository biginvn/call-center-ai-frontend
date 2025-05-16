import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const bootstrap = async () => {
    const app = createApp(App)
    const pinia = createPinia()
    app.use(pinia)
    app.use(router)

    // Load user data from storage
    const authStore = useAuthStore()
    await authStore.loadFromStorage()

    app.mount('#app')
}

bootstrap().catch(console.error)
