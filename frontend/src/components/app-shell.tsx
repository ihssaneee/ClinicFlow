import { CalendarDays, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clinicApi, useMeQuery } from '@/app/api'
import { logout } from '@/app/auth-slice'
import { useAppDispatch } from '@/app/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Tableau de bord', short: 'Tableau', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patients', short: 'Patients', icon: Users, end: false },
  { to: '/appointments', label: 'Rendez-vous', short: 'Rendez-vous', icon: CalendarDays, end: false },
]

export function AppShell() {
  const { data } = useMeQuery()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = data?.user

  function onLogout() {
    dispatch(logout())
    dispatch(clinicApi.util.resetApiState())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <NavLink to="/" className="shrink-0 text-sm font-semibold tracking-tight">
            ClinicFlow
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                <link.icon className="size-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <>
                <span className="hidden max-w-40 truncate text-sm lg:inline">{user.fullName}</span>
                <Badge className="hidden sm:inline-flex" variant="secondary">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] text-muted-foreground',
                  isActive && 'text-foreground',
                )
              }
            >
              <link.icon className="size-5" />
              {link.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
