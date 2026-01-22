import { getAxiosInstanceV2 } from './axiosInstanceV2'

export interface TranscriptSegment {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown'
}

export interface CallResponseV2 {
  id: string
  call_id: string
  customer_phone?: string | null
  start_time: string
  end_time?: string | null
  transcript?: TranscriptSegment[]
  recording_url?: string | null
  duration_seconds?: number
  sentiment?: 'positive' | 'neutral' | 'negative' | 'unknown'
  summary?: string
}

export const listCallsV2 = async (): Promise<CallResponseV2[]> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<CallResponseV2[]>('/calls/')
  return response.data
}

// Note: API v2 may not have GET /calls/{call_id} endpoint
// This is a placeholder - implement when API supports it
export const getCallV2 = async (callId: string): Promise<CallResponseV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  // TODO: Update when API v2 supports GET /calls/{call_id}
  const response = await axiosInstance.get<CallResponseV2>(`/calls/${callId}`)
  return response.data
}
