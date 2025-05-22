import { RuntimeConfig } from '@/config'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $config: RuntimeConfig
  }
}
