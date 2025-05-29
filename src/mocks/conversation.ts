import type { Conversation } from '@/types/conversation'

export const mockConversation: Conversation = {
  id: '1',
  created_at: '2024-03-20T10:30:00Z',
  status: 'closed',
  type: 'A->C',
  sentiment: 'positive',
  summarize: 'Khách hàng gọi đến để hỏi về chính sách bảo hành sản phẩm. Nhân viên đã giải thích chi tiết và khách hàng tỏ ra hài lòng với thông tin nhận được.',
  record_url: '/src/assets/audio/conversation.wav',
  record_text: 'Cuộc hội thoại về chính sách bảo hành sản phẩm',
  from_user: {
    id: '1',
    username: 'customer123',
    fullname: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    role: 'customer'
  },
  to_user: {
    id: '2',
    username: 'agent456',
    fullname: 'Trần Thị B',
    email: 'tranthib@example.com',
    role: 'agent'
  },
  messages: [
    {
      id: '1',
      sender_id: {
        id: '1',
        username: 'customer123',
        fullname: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        role: 'customer'
      },
      content: 'Chào chị, tôi muốn hỏi về chính sách bảo hành sản phẩm.',
      mood: 'neutral',
      order: 1,
      time: 0
    },
    {
      id: '2',
      sender_id: {
        id: '2',
        username: 'agent456',
        fullname: 'Trần Thị B',
        email: 'tranthib@example.com',
        role: 'agent'
      },
      content: 'Chào anh, em có thể giúp gì cho anh ạ?',
      mood: 'positive',
      order: 2,
      time: 5
    },
    {
      id: '3',
      sender_id: {
        id: '1',
        username: 'customer123',
        fullname: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        role: 'customer'
      },
      content: 'Tôi mua sản phẩm được 2 tháng rồi, giờ có vấn đề về pin. Tôi muốn biết thời gian bảo hành là bao lâu?',
      mood: 'neutral',
      order: 3,
      time: 10
    },
    {
      id: '4',
      sender_id: {
        id: '2',
        username: 'agent456',
        fullname: 'Trần Thị B',
        email: 'tranthib@example.com',
        role: 'agent'
      },
      content: 'Dạ, sản phẩm của anh được bảo hành 12 tháng ạ. Anh có thể mang đến trung tâm bảo hành gần nhất để được hỗ trợ ạ.',
      mood: 'positive',
      order: 4,
      time: 15
    },
    {
      id: '5',
      sender_id: {
        id: '1',
        username: 'customer123',
        fullname: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        role: 'customer'
      },
      content: 'Cảm ơn chị nhiều, tôi sẽ mang đến trung tâm bảo hành.',
      mood: 'positive',
      order: 5,
      time: 20
    }
  ]
}
