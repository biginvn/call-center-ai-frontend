export interface UserBase {
  id: string
  username: string
  email: string
  fullName: string
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  client_name?: string // Optional client name for display
}

export interface Agent extends UserBase {
  role: 'agent'
  extensionNumber: string // Required for agent
  extension?: string
}

export interface Admin extends UserBase {
  role: 'admin'
  extensionNumber?: never // Forbidden for admin
}

export interface SystemUser extends UserBase {
  role: 'system'
  extensionNumber?: never
}

export type User = Agent | Admin | SystemUser
export default User
