import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { logout } from '@/app/auth-slice'
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AuthUser,
  Patient,
  PatientInput,
  PatientList,
} from '@/types/clinic'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('clinicflow_token')
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  const url = typeof args === 'string' ? args : args.url
  if (result.error?.status === 401 && !url.includes('/auth/login')) {
    api.dispatch(logout())
    api.dispatch(clinicApi.util.resetApiState())
  }
  return result
}

export const clinicApi = createApi({
  reducerPath: 'clinicApi',
  baseQuery,
  tagTypes: ['Auth', 'Patient', 'Appointment'],
  endpoints: (builder) => ({
    login: builder.mutation<{ token: string; user: AuthUser }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: builder.query<{ user: AuthUser }, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    getPatients: builder.query<
      PatientList,
      { search?: string; page?: number; limit?: number; archived?: boolean }
    >({
      query: ({ search = '', page = 1, limit = 10, archived = false }) => ({
        url: '/patients',
        params: { search, page, limit, ...(archived ? { archived: 'true' } : {}) },
      }),
      providesTags: (result, _error, arg) => {
        const listId = arg.archived ? 'ARCHIVED' : 'LIST'
        return result
          ? [
              ...result.patients.map((patient) => ({ type: 'Patient' as const, id: patient.id })),
              { type: 'Patient' as const, id: listId },
            ]
          : [{ type: 'Patient' as const, id: listId }]
      },
    }),
    getPatient: builder.query<{ patient: Patient }, string>({
      query: (id) => `/patients/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Patient', id }],
    }),
    createPatient: builder.mutation<{ patient: Patient }, PatientInput>({
      query: (body) => ({ url: '/patients', method: 'POST', body }),
      invalidatesTags: [{ type: 'Patient', id: 'LIST' }],
    }),
    updatePatient: builder.mutation<{ patient: Patient }, { id: string; body: PatientInput }>({
      query: ({ id, body }) => ({ url: `/patients/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Patient', id },
        { type: 'Patient', id: 'LIST' },
      ],
    }),
    deletePatient: builder.mutation<void, string>({
      query: (id) => ({ url: `/patients/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Patient', id },
        { type: 'Patient', id: 'LIST' },
        { type: 'Patient', id: 'ARCHIVED' },
      ],
    }),
    restorePatient: builder.mutation<{ patient: Patient }, string>({
      query: (id) => ({ url: `/patients/${id}/restore`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Patient', id },
        { type: 'Patient', id: 'LIST' },
        { type: 'Patient', id: 'ARCHIVED' },
      ],
    }),
    getAppointments: builder.query<
      { appointments: Appointment[] },
      { date?: string; status?: AppointmentStatus }
    >({
      query: ({ date, status } = {}) => ({
        url: '/appointments',
        params: {
          ...(date ? { date } : {}),
          ...(status ? { status } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.appointments.map((appointment) => ({
                type: 'Appointment' as const,
                id: appointment.id,
              })),
              { type: 'Appointment' as const, id: 'LIST' },
            ]
          : [{ type: 'Appointment' as const, id: 'LIST' }],
    }),
    createAppointment: builder.mutation<{ appointment: Appointment }, AppointmentInput>({
      query: (body) => ({ url: '/appointments', method: 'POST', body }),
      invalidatesTags: [{ type: 'Appointment', id: 'LIST' }],
    }),
    updateAppointmentStatus: builder.mutation<
      { appointment: Appointment },
      { id: string; status: AppointmentStatus }
    >({
      query: ({ id, status }) => ({
        url: `/appointments/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: [{ type: 'Appointment', id: 'LIST' }],
    }),
  }),
})

export const {
  useLoginMutation,
  useMeQuery,
  useGetPatientsQuery,
  useGetPatientQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useRestorePatientMutation,
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentStatusMutation,
} = clinicApi
