import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useLoginMutation } from '@/app/api'
import { setCredentials } from '@/app/auth-slice'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { FieldError, FieldLabel } from '@/components/field-label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'

export function LoginPage() {
  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  if (token) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'L’email est obligatoire.'
    else if (!email.includes('@')) next.email = 'Email invalide.'
    if (!password) next.password = 'Le mot de passe est obligatoire.'
    setFieldErrors(next)
    if (next.email || next.password) return
    try {
      const result = await login({ email: email.trim(), password }).unwrap()
      dispatch(setCredentials(result.token))
      navigate('/', { replace: true })
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <p className="text-sm font-medium tracking-wide">ClinicFlow</p>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight">Patients et rendez-vous, au même endroit.</h1>
          <p className="mt-4 text-sm text-primary-foreground/80">
            Le tableau de bord, les dossiers patients et le planning de la clinique.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">Heure de la clinique : Africa/Casablanca</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-md gap-6">
          <p className="text-sm font-medium tracking-wide lg:hidden">ClinicFlow</p>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>Email et mot de passe du compte staff.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" noValidate onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="email" required>
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.email)}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="password" required>
                  Mot de passe
                </FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <FieldError>{fieldErrors.password}</FieldError>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
            <div className="mt-6 rounded-lg bg-muted px-3 py-3 text-sm break-all text-muted-foreground">
              <p className="font-medium text-foreground">Comptes de démonstration</p>
              <p className="mt-1">admin@clinicflow.ma — admin</p>
              <p>sara.mansouri@clinicflow.ma — staff</p>
              <p className="mt-1">Mot de passe : Password123!</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  )
}
