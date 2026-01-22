import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useVersionStore = defineStore('version', {
  state: () => ({
    isV2: false, // false = standard version, true = Shinhan Bank (v2)
  }),

  getters: {
    currentVersion: (state): 'v1' | 'v2' => state.isV2 ? 'v2' : 'v1',
    versionLabel: (state): string => state.isV2 ? 'Shinhan Bank (v2)' : 'Standard',
  },

  actions: {
    toggleVersion() {
      const oldVersion = this.isV2 ? 'v2' : 'v1'
      this.isV2 = !this.isV2
      const newVersion = this.isV2 ? 'v2' : 'v1'
      localStorage.setItem('app_version', newVersion)
      
      // If version changed, clear auth to prevent using wrong API
      if (oldVersion !== newVersion) {
        const authStore = useAuthStore()
        authStore.logout()
      }
    },
    
    setVersion(version: 'v1' | 'v2') {
      const oldVersion = this.isV2 ? 'v2' : 'v1'
      this.isV2 = version === 'v2'
      localStorage.setItem('app_version', version)
      
      // If version changed, clear auth to prevent using wrong API
      if (oldVersion !== version) {
        const authStore = useAuthStore()
        authStore.logout()
      }
    },

    loadFromStorage() {
      const savedVersion = localStorage.getItem('app_version')
      if (savedVersion === 'v2') {
        this.isV2 = true
      } else {
        this.isV2 = false
      }
    },
  },
})
