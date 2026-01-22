import { getAxiosInstanceV2 } from './axiosInstanceV2'

export interface CallbackRequest {
  _id?: string
  customer_name?: string
  customer_phone?: string
  notes?: string
  created_at?: string
  status?: string
}

export const listAppointmentsV2 = async (): Promise<CallbackRequest[]> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.get<CallbackRequest[]>('/customers/appointments')
  return response.data
}

export const createAppointmentV2 = async (appointment: CallbackRequest): Promise<CallbackRequest> => {
  const axiosInstance = await getAxiosInstanceV2()
  const response = await axiosInstance.post<CallbackRequest>('/customers/appointments', appointment)
  return response.data
}

// Note: API v2 may not have PATCH endpoint for appointments
export const updateAppointmentStatusV2 = async (appointmentId: string, status: string): Promise<void> => {
  const axiosInstance = await getAxiosInstanceV2()
  // TODO: Update when API v2 supports PATCH /appointments/{appointment_id}
  // For now, this will fail - implement when backend supports it
  await axiosInstance.patch(`/customers/appointments/${appointmentId}`, { status })
}
