import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useGetAppointmentsQuery,
  useGetPatientsQuery,
  useUpdateAppointmentStatusMutation,
} from '@/app/api'
import { AppointmentFormDialog } from '@/components/appointment-form-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatClinicDateTime } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import { STATUS_LABELS } from '@/lib/labels'
import type { AppointmentStatus } from '@/types/clinic'

const statuses = Object.keys(STATUS_LABELS) as AppointmentStatus[]

export function AppointmentsPage() {
  const [params, setSearchParams] = useSearchParams()
  const date = params.get('date') ?? ''
  const status = parseStatus(params.get('status'))
  const presetPatientId = params.get('patientId') ?? undefined
  const [createOpen, setCreateOpen] = useState(Boolean(presetPatientId))
  const { data, isLoading, error } = useGetAppointmentsQuery({
    ...(date ? { date } : {}),
    ...(status ? { status } : {}),
  })
  const patients = useGetPatientsQuery({ page: 1, limit: 100 })
  const names = new Map(patients.data?.patients.map((patient) => [patient.id, patient.fullName]))
  const [updateStatus, updateState] = useUpdateAppointmentStatusMutation()

  function setFilter(key: 'date' | 'status', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  async function onStatusChange(id: string, nextStatus: AppointmentStatus) {
    try {
      await updateStatus({ id, status: nextStatus }).unwrap()
      toast.success('Statut mis à jour')
    } catch (caught) {
      toast.error(getErrorMessage(caught))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rendez-vous</h1>
          <p className="text-sm text-muted-foreground">Filtrer par jour ou par statut, puis mettre à jour.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus />
          Nouveau rendez-vous
        </Button>
      </div>
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            className="w-full sm:w-44"
            type="date"
            value={date}
            onChange={(event) => setFilter('date', event.target.value)}
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label>Statut</Label>
          <Select value={status ?? 'all'} onValueChange={(value) => setFilter('status', value === 'all' ? '' : value)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {statuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(date || status) && (
          <Button
            variant="ghost"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('date')
              next.delete('status')
              setSearchParams(next, { replace: true })
            }}
          >
            Effacer
          </Button>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-28 w-full md:h-8" />
          <Skeleton className="h-28 w-full md:h-8" />
        </div>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {data?.appointments.length === 0 && (
              <li className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
                Aucun rendez-vous pour ces filtres.
              </li>
            )}
            {data?.appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="font-medium break-words underline-offset-4 hover:underline"
                      to={`/patients/${appointment.patientId}`}
                    >
                      {names.get(appointment.patientId) ?? 'Patient'}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatClinicDateTime(appointment.appointmentDate)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm break-words">{appointment.reason}</p>
                {appointment.notes && (
                  <p className="mt-1 text-sm break-words text-muted-foreground">{appointment.notes}</p>
                )}
                <div className="mt-3">
                  <StatusSelect
                    value={appointment.status}
                    disabled={updateState.isLoading && updateState.originalArgs?.id === appointment.id}
                    onChange={(value) => onStatusChange(appointment.id, value)}
                    className="w-full"
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.appointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Aucun rendez-vous pour ces filtres.
                  </TableCell>
                </TableRow>
              )}
              {data?.appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{formatClinicDateTime(appointment.appointmentDate)}</TableCell>
                  <TableCell>
                    <Link className="underline-offset-4 hover:underline" to={`/patients/${appointment.patientId}`}>
                      {names.get(appointment.patientId) ?? 'Patient'}
                    </Link>
                  </TableCell>
                  <TableCell>{appointment.reason}</TableCell>
                  <TableCell className="max-w-48 truncate">{appointment.notes ?? '—'}</TableCell>
                  <TableCell>
                    <StatusSelect
                      value={appointment.status}
                      disabled={updateState.isLoading && updateState.originalArgs?.id === appointment.id}
                      onChange={(value) => onStatusChange(appointment.id, value)}
                      className="w-36"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </>
      )}
      <AppointmentFormDialog
        open={createOpen}
        defaultPatientId={presetPatientId}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}

function StatusSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: AppointmentStatus
  disabled: boolean
  onChange: (value: AppointmentStatus) => void
  className?: string
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as AppointmentStatus)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function parseStatus(value: string | null): AppointmentStatus | undefined {
  if (value === 'pending' || value === 'confirmed' || value === 'cancelled') return value
  return undefined
}
