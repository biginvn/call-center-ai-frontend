export interface RuntimeConfig {
  API_URL: string;
  SIP_SERVER: string;
  SIP_PORT: string;
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const response = await fetch('/config.json');
  if (!response.ok) {
    throw new Error('Failed to load config.json');
  }
  return await response.json();
}
