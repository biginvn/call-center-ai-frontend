export interface UserBase {
    id: string;
    username: string;
    email: string;
    fullName: string;
    status: 'active' | 'inactive' | 'suspended';
    lastLogin: string;
}

export interface Agent extends UserBase {
    role: 'agent';
    extensionNumber: number;  // Required for agent
}

export interface Admin extends UserBase {
    role: 'admin';
    extensionNumber?: never;  // Forbidden for admin
}

export type User = Agent | Admin;
export default User;