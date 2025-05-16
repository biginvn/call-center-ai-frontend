import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginAgent, getUserInfo } from '../authService'
import axiosInstance from '../axiosInstance'

// Mock axiosInstance
vi.mock('../axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loginAgent', () => {
    it('should successfully login an agent', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        }
      }

      vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse)

      const result = await loginAgent({
        username: 'testuser',
        password: 'testpass',
        extension_number: '123'
      })

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      })
      expect(axiosInstance.post).toHaveBeenCalledWith('/login/agent', {
        username: 'testuser',
        password: 'testpass',
        extension_number: '123'
      })
    })
  })

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const mockResponse = {
        data: {
          username: 'testuser',
          extension_number: '123',
          role: 'agent'
        }
      }

      vi.mocked(axiosInstance.get).mockResolvedValueOnce(mockResponse)

      const result = await getUserInfo('mock-token')

      expect(result).toEqual({
        username: 'testuser',
        extension_number: '123',
        role: 'agent'
      })
      expect(axiosInstance.get).toHaveBeenCalledWith('/user/', {
        headers: {
          Authorization: 'Bearer mock-token'
        }
      })
    })
  })
})
