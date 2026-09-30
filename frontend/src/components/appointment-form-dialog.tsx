import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateAppointmentMutation, useGetPatientsQuery } from '@/app/api'
import { FieldError, FieldLabel } from '@/components/field-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { casablancaLocalToIso } from '@/lib/datetime'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'
import { STATUS_LABELS } from '@/lib/labels'
import type { AppointmentStatus } from '@/types/clinic'

type AppointmentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPatientId?: string
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  defaultPatientId,
}: AppointmentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <AppointmentForm
            defaultPatientId={defaultPatientId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AppointmentForm({
  defaultPatientId,
  onDone,
}: {
  defaultPatientId?: string
  onDone: () => void
}) {
  const { data, isLoading } = useGetPatientsQuery({ page: 1, limit: 100 })
  const [patientId, setPatientId] = useState(defaultPatientId ?? '')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [status, setStatus] = useState<AppointmentStatus>('pending')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [createAppointment, { isLoading: isSaving, error }] = useCreateAppointmentMutation()
  const apiFieldErrors = Object.fromEntries(getFieldErrors(error).map((issue) => [issue.field, issue.message]))
  const generalError = error && getFieldErrors(error).length === 0 ? getErrorMessage(error) : undefined

  function messageFor(field: string) {
    return localErrors[field] ?? apiFieldErrors[field]
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!patientId) next.patientId = 'Le patient est obligatoire.'
    if (!appointmentDate) next.appointmentDate = 'La date et l’heure sont obligatoires.'
    if (!reason.trim()) next.reason = 'Le motif est obligatoire.'
    setLocalErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      await createAppointment({
        patientId,
        appointmentDate: casablancaLocalToIso(appointmentDate),
        status,
        reason: reason.trim(),
        notes: notes.trim() || null,
      }).unwrap()
      toast.success('Rendez-vous créé')
      onDone()
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Nouveau rendez-vous</DialogTitle>
        <DialogDescription>
          Les champs marqués d&apos;un * sont obligatoires. Deux rendez-vous confirmés du même patient doivent être
          espacés d&apos;au moins 30 minutes.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-4">
        <div className="grid gap-1.5">
          <FieldLabel required>Patient</FieldLabel>
          <Select value={patientId} onValueChange={setPatientId} disabled={isLoading}>
            <SelectTrigger className="w-full" aria-invalid={Boolean(messageFor('patientId'))}>
              <SelectValue placeholder="Choisir un patient" />
            </SelectTrigger>
            <SelectContent>
              {data?.patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.fullName} · {patient.cin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{messageFor('patientId')}</FieldError>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="appointmentDate" required>
            Date et heure
          </FieldLabel>
          <Input
            id="appointmentDate"
            type="datetime-local"
            aria-invalid={Boolean(messageFor('appointmentDate'))}
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
          />
          <FieldError>{messageFor('appointmentDate')}</FieldError>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel required>Statut</FieldLabel>
          <Select value={status} onValueChange={(value) => setStatus(value as AppointmentStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="reason" required>
            Motif
          </FieldLabel>
          <Input
            id="reason"
            aria-invalid={Boolean(messageFor('reason'))}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <FieldError>{messageFor('reason')}</FieldError>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {generalError && <p className="text-sm text-destructive">{generalError}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Enregistrement…' : 'Créer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
