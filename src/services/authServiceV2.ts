import { getAxiosInstanceV2 } from './axiosInstanceV2'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface UserInfoV2 {
  _id: string
  username: string
  role: 'admin' | 'user'
  disabled: boolean
  seconds_used: number
  seconds_limit: number
}

export const loginV2 = async ({
  username,
  password,
}: {
  username: string
  password: string
}): Promise<TokenResponse> => {
  const axiosInstance = await getAxiosInstanceV2()
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)
  formData.append('grant_type', 'password')

  const response = await axiosInstance.post<TokenResponse>('/token', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return {
    access_token: response.data.access_token,
    token_type: response.data.token_type,
  }
}

export const getUserInfoV2 = async (access_token: string): Promise<UserInfoV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<UserInfoV2>('/users/me', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })
  return response.data
}

export const listUsersV2 = async (): Promise<UserInfoV2[]> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<UserInfoV2[]>('/users')
  return response.data
}

export const createUserV2 = async (userData: {
  username: string
  password: string
  role?: 'admin' | 'user'
  seconds_limit?: number
}): Promise<UserInfoV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.post<UserInfoV2>('/users', userData)
  return response.data
}

// Note: API v2 may not have PATCH endpoints for users
// These functions are placeholders - implement when API supports them
export const updateUserV2 = async (userId: string, updates: {
  seconds_limit?: number
  disabled?: boolean
}): Promise<UserInfoV2> => {
  const axiosInstance = await getAxiosInstanceV2()
  // TODO: Update when API v2 supports PATCH /users/{user_id}
  // For now, this will fail - implement when backend supports it
  const response = await axiosInstance.patch<UserInfoV2>(`/users/${userId}`, updates)
  return response.data
}

export const resetUserPasswordV2 = async (userId: string, newPassword: string): Promise<void> => {
  const axiosInstance = await getAxiosInstanceV2()
  // TODO: Update when API v2 supports password reset endpoint
  // For now, this will fail - implement when backend supports it
  await axiosInstance.patch(`/users/${userId}/password`, { password: newPassword })
}
