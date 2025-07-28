export interface RuntimeConfig {
  API_URL: string
  SIP_SERVER: string
  SIP_URL: string
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const timestamp = new Date().getTime()
  const response = await fetch(`/config.json?t=${timestamp}`)
  if (!response.ok) {
    throw new Error('Failed to load config.json')
  }
  return await response.json()
}
