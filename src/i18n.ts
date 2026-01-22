import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import vi from './locales/vi.json'

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'vi', // Default locale
  fallbackLocale: 'en',
  messages: {
    en,
    vi
  }
})

export default i18n
