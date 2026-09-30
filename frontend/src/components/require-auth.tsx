import { Navigate, Outlet } from 'react-router-dom'
import { useMeQuery } from '@/app/api'
import { useAppSelector } from '@/app/hooks'
import { Skeleton } from '@/components/ui/skeleton'

export function RequireAuth() {
  const token = useAppSelector((state) => state.auth.token)
  const { data, isLoading, isError } = useMeQuery(undefined, { skip: !token })

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
