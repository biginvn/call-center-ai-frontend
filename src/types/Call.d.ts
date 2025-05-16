export interface Contact {
    id: string
    name: string
    extNumber: number
    email: string
    favorite: boolean
}

export interface Call {
    id: string
    contactId: string
    contactName: string
    extNumber: number
    timestamp: Date
    duration: number
    status: "incoming" | "outgoing" | "missed" | "rejected" | "completed"
}