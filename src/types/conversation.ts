export type ConversationStatus = 'start' | 'accept' | 'decline' | 'closed'
export type ConversationType = 'A->A' | 'A->AI' | 'A->C'
export type ConversationMood = 'positive' | 'neutral' | 'negative' | 'unknown'

export interface User {
  _id: string
  name: string
  email: string
  // Add other user fields as needed
}

export interface Message {
  _id: string
  content: string
  sender: User
  created_at: string
  // Add other message fields as needed
}

export interface Conversation {
  _id: string | null
  status: ConversationStatus
  type: ConversationType
  record_url: string | null
  summarize: string | null
  from_user: User
  to_user: User
  messages: Message[] | null
  mood: ConversationMood
  sentiment: string | null
  created_at: string
}
