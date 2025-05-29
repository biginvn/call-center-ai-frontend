import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  // Convert to GMT+7
  const gmt7Date = new Date(date.getTime() + (7 * 60 * 60 * 1000))

  const hours = gmt7Date.getHours().toString().padStart(2, '0')
  const minutes = gmt7Date.getMinutes().toString().padStart(2, '0')
  const day = gmt7Date.getDate()
  const month = gmt7Date.getMonth() + 1
  const year = gmt7Date.getFullYear()

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