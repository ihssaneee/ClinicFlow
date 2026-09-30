import { configureStore } from '@reduxjs/toolkit'
import { clinicApi } from '@/app/api'
import authReducer from '@/app/auth-slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [clinicApi.reducerPath]: clinicApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(clinicApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
