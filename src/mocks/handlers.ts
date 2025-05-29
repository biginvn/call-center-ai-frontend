import { mockConversation } from './conversation'

interface MockRequest {
  params: {
    id: string
  }
}

export const handlers = [
  {
    path: '/api/conversations/:id',
    method: 'GET',
    response: (req: MockRequest) => {
      const { id } = req.params
      if (id === '1') {
        return {
          status: 200,
          data: mockConversation
        }
      }
      return {
        status: 404,
        data: {
          message: 'Conversation not found'
        }
      }
    }
  }
]
