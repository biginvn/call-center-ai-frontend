export interface UserV2 {
  _id: string
  username: string
  role: 'admin' | 'user'
  disabled: boolean
  seconds_used: number
  seconds_limit: number
}

export default UserV2
