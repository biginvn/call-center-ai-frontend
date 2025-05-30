import axiosInstance from "./axiosInstance";


interface SessionResponse {
  id: string
  object: string
  model: string
  modalities: string[]
  instructions: string
  voice: string
  input_audio_format: string
  output_audio_format: string
  input_audio_transcription: {
    model: string
  }
  turn_detection: {
    create_response: boolean
    interrupt_response: boolean
    eagerness: string
    prefix_padding_ms: number
    silence_duration_ms: number
    threshold: number
  }
  tools: Record<string, unknown>[]
  tool_choice: string
  temperature: number
  max_response_output_tokens: string
  client_secret: {
    value: string
    expires_at: number
  }
}

interface ConfigurationData {
  instructions: string
  voice: string
}

class AiCallService {
  async configSession({ instructions, voice }: ConfigurationData): Promise<SessionResponse> {
    const response = await axiosInstance.post<SessionResponse>('/realtime/config', {
      instructions,
      voice
    });
    return response.data;
  }

  async getSession(): Promise<SessionResponse> {
    const response = await axiosInstance.get<SessionResponse>('/realtime/session');
    return response.data;
  }

  async submitVoice(url: string): Promise<string> {
    const response = await axiosInstance.post<string>(`/realtime/finish?audio_url=${url}`);
    return response.data;
  }
}

export default new AiCallService();
