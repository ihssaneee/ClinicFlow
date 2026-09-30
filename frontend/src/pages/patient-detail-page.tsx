import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useGetAppointmentsQuery, useGetPatientQuery } from '@/app/api'
import { AppointmentFormDialog } from '@/components/appointment-form-dialog'
import { PatientFormDialog } from '@/components/patient-form-dialog'
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
import { formatClinicDate, formatClinicDateTime } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const { data, isLoading, error } = useGetPatientQuery(id, { skip: !id })
  const appointments = useGetAppointmentsQuery({})
  const [editOpen, setEditOpen] = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const patient = data?.patient
  const rows = (appointments.data?.appointments ?? [])
    .filter((appointment) => appointment.patientId === id)
    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))

  if (isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Patient introuvable</AlertTitle>
        <AlertDescription>{error ? getErrorMessage(error) : 'Ce dossier n’existe pas.'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Link to="/patients" className="underline-offset-4 hover:underline">
              Patients
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight break-words">{patient.fullName}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Modifier
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setAppointmentOpen(true)}>
            <Plus />
            Rendez-vous
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Info label="CIN" value={patient.cin} />
          <Info label="Téléphone" value={patient.phone} />
          <Info label="Date de naissance" value={formatClinicDate(patient.birthDate)} />
          <Info label="Adresse" value={patient.address ?? '—'} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous pour ce patient.</p>
          ) : (
            <>
              <ul className="grid gap-2 md:hidden">
                {rows.map((appointment) => (
                  <li key={appointment.id} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {formatClinicDateTime(appointment.appointmentDate)}
                      </p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-2 break-words">{appointment.reason}</p>
                    {appointment.notes && (
                      <p className="mt-1 text-sm break-words text-muted-foreground">{appointment.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{formatClinicDateTime(appointment.appointmentDate)}</TableCell>
                    <TableCell>{appointment.reason}</TableCell>
                    <TableCell>{appointment.notes ?? '—'}</TableCell>
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
      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} />
      <AppointmentFormDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        defaultPatientId={patient.id}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  )
}
