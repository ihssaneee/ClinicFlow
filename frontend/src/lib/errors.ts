import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { ApiErrorBody } from '@/types/clinic'

export function getErrorMessage(error: unknown): string {
  if (isFetchError(error)) {
    if (error.status === 'FETCH_ERROR') {
      return 'Impossible de joindre le serveur.'
    }
    const data = error.data
    if (isErrorBody(data) && data.message) {
      return data.message
    }
  }
  return 'Une erreur est survenue.'
}

export function getFieldErrors(error: unknown): { field: string; message: string }[] {
  if (!isFetchError(error) || !isErrorBody(error.data) || !error.data.errors) {
    return []
  }
  return error.data.errors
}

function isFetchError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === 'object' && data !== null
}
