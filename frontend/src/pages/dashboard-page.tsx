import { Link } from 'react-router-dom'
import { useGetAppointmentsQuery, useGetPatientsQuery } from '@/app/api'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clinicDateKey, formatClinicDateTime, todayInClinic } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'

export function DashboardPage() {
  const today = todayInClinic()
  const patients = useGetPatientsQuery({ page: 1, limit: 1 })
  const appointments = useGetAppointmentsQuery({})
  const patientNames = usePatientNames()

  const isLoading = patients.isLoading || appointments.isLoading
  const error = patients.error ?? appointments.error
  const rows = appointments.data?.appointments ?? []
  const todayRows = rows.filter((appointment) => clinicDateKey(appointment.appointmentDate) === today)
  const pending = rows.filter((appointment) => appointment.status === 'pending').length
  const confirmed = rows.filter((appointment) => appointment.status === 'confirmed').length

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Aujourd&apos;hui, {today.split('-').reverse().join('/')}</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Patients" value={patients.data?.total} loading={patients.isLoading} />
        <StatCard label="Rendez-vous du jour" value={isLoading ? undefined : todayRows.length} loading={isLoading} />
        <StatCard label="En attente" value={isLoading ? undefined : pending} loading={isLoading} />
        <StatCard label="Confirmés" value={isLoading ? undefined : confirmed} loading={isLoading} />
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Rendez-vous du jour</CardTitle>
          <Button className="w-full sm:w-auto" variant="outline" size="sm" asChild>
            <Link to={`/appointments?date=${today}`}>Voir le planning</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : todayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous aujourd&apos;hui.</p>
          ) : (
            <>
              <ul className="grid gap-2 md:hidden">
                {todayRows.map((appointment) => (
                  <li key={appointment.id} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          className="font-medium break-words underline-offset-4 hover:underline"
                          to={`/patients/${appointment.patientId}`}
                        >
                          {patientNames.get(appointment.patientId) ?? 'Patient'}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatClinicDateTime(appointment.appointmentDate)}
                        </p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-2 text-sm break-words">{appointment.reason}</p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRows.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{formatClinicDateTime(appointment.appointmentDate)}</TableCell>
                    <TableCell>
                      <Link className="underline-offset-4 hover:underline" to={`/patients/${appointment.patientId}`}>
                        {patientNames.get(appointment.patientId) ?? 'Patient'}
                      </Link>
                    </TableCell>
                    <TableCell>{appointment.reason}</TableCell>
                    <TableCell>
                      <StatusBadge status={appointment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-semibold">{value ?? '—'}</p>}
      </CardContent>
    </Card>
  )
}

function usePatientNames() {
  const { data } = useGetPatientsQuery({ page: 1, limit: 100 })
  return new Map(data?.patients.map((patient) => [patient.id, patient.fullName]))
}
