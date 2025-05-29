import { mockConversation } from './conversation'

export const handlers = [
  {
    path: '/api/conversations/:id',
    method: 'GET',
    response: (req: any) => {
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
