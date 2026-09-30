import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const TOKEN_KEY = 'clinicflow_token'

type AuthState = {
  token: string | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem(TOKEN_KEY),
  } satisfies AuthState,
  reducers: {
    setCredentials(state, action: PayloadAction<string>) {
      state.token = action.payload
      localStorage.setItem(TOKEN_KEY, action.payload)
    },
    logout(state) {
      state.token = null
      localStorage.removeItem(TOKEN_KEY)
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
