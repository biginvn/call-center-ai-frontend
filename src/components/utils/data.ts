
import type { Contact, Call } from "@/types/Call"

export const initialContacts: Contact[] = [
    {
        id: "contact-1",
        name: "John Smith",
        extNumber: 101,
        email: "john.smith@example.com",
        favorite: true,
    },
    {
        id: "contact-2",
        name: "Sarah Johnson",
        extNumber: 102,
        email: "sarah.johnson@example.com",
        favorite: true,
    },
    {
        id: "contact-3",
        name: "Michael Brown",
        extNumber: 103,
        email: "michael.brown@example.com",
        favorite: false,
    },
    {
        id: "contact-4",
        name: "Emily Davis",
        extNumber: 104,
        email: "emily.davis@example.com",
        favorite: false,
    },
    {
        id: "contact-5",
        name: "David Wilson",
        extNumber: 105,
        email: "david.wilson@example.com",
        favorite: false,
    },
]

export const initialCalls: Call[] = [
    {
        id: "call-1",
        contactId: "contact-1",
        contactName: "John Smith",
        extNumber: 101,
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        duration: 125,
        status: "completed"
    },
    {
        id: "call-2",
        contactId: "contact-2",
        contactName: "Sarah Johnson",
        extNumber: 102,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        duration: 0,
        status: "missed"
    },
    {
        id: "call-3",
        contactId: "contact-3",
        contactName: "Michael Brown",
        extNumber: 103,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        duration: 45,
        status: "completed"
    },
    {
        id: "call-4",
        contactId: "contact-4",
        contactName: "Emily Davis",
        extNumber: 104,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        duration: 0,
        status: "rejected"
    },
    {
        id: "call-5",
        contactId: "",
        contactName: "Unknown",
        extNumber: 105,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        duration: 78,
        status: "completed"
    },
]
