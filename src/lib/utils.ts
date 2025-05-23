import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  return `${hours}:${minutes}, ${day}-${month}-${year}`
}

export const determineWebClient = (extension: string) => {
  if (extension.startsWith('111')) {
    return 'web1'
  } else if (extension.startsWith('112')) {
    return 'web2'
  } else if (extension.startsWith('101'))
    return 'test2' // default fallback
  else if (extension.startsWith('100'))
    return 'test1'
  else
    return 'web1'
}