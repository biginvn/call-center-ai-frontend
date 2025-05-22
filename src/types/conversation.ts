export type ConversationStatus = 'start' | 'accept' | 'decline' | 'closed'
export type ConversationType = 'A->A' | 'A->AI' | 'A->C'
export type ConversationMood = 'positive' | 'neutral' | 'negative' | 'unknown'

export interface User {
  id: string
  username: string
  fullname: string
  email: string
  role: string
  // Add other user fields as needed
}

export interface Message {
  id: string
  sender_id: User
  content: string
  mood: ConversationMood
  order: number
}

export interface Conversation {
  id: string
  status: ConversationStatus
  type: ConversationType
  record_url: string
  record_text: string
  summarize: string
  from_user: User
  to_user: User
  messages: Message[]
  mood: ConversationMood
  sentiment: string
  created_at: string
}

export interface ConversationResponse {
  pagination: {
    page_number: number
    page_size: number
    total_items: number
    total_pages: number
  }
  conversations: Conversation[]
}
