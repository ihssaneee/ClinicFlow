import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  useCreatePatientMutation,
  useUpdatePatientMutation,
} from '@/app/api'
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
import { todayInClinic } from '@/lib/datetime'
import { getErrorMessage, getFieldErrors } from '@/lib/errors'
import type { Patient } from '@/types/clinic'

type PatientFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: Patient | null
}

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <PatientForm
            patient={patient}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PatientForm({
  patient,
  onDone,
}: {
  patient?: Patient | null
  onDone: () => void
}) {
  const [fullName, setFullName] = useState(patient?.fullName ?? '')
  const [cin, setCin] = useState(patient?.cin ?? '')
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [birthDate, setBirthDate] = useState(patient?.birthDate ?? '')
  const [address, setAddress] = useState(patient?.address ?? '')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [createPatient, createState] = useCreatePatientMutation()
  const [updatePatient, updateState] = useUpdatePatientMutation()
  const pending = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const apiFieldErrors = Object.fromEntries(getFieldErrors(error).map((issue) => [issue.field, issue.message]))
  const generalError = error && getFieldErrors(error).length === 0 ? getErrorMessage(error) : undefined

  function messageFor(field: string) {
    return localErrors[field] ?? apiFieldErrors[field]
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.fullName = 'Le nom complet est obligatoire.'
    if (!cin.trim()) next.cin = 'Le CIN est obligatoire.'
    if (!phone.trim()) next.phone = 'Le téléphone est obligatoire.'
    if (!birthDate) next.birthDate = 'La date de naissance est obligatoire.'
    else if (birthDate > todayInClinic()) {
      next.birthDate = 'La date de naissance ne peut pas être dans le futur.'
    }
    setLocalErrors(next)
    if (Object.keys(next).length > 0) return

    const body = {
      fullName: fullName.trim(),
      cin: cin.trim(),
      phone: phone.trim(),
      birthDate,
      address: address.trim() || null,
    }
    try {
      if (patient) {
        await updatePatient({ id: patient.id, body }).unwrap()
        toast.success('Patient modifié')
      } else {
        await createPatient(body).unwrap()
        toast.success('Patient créé')
      }
      onDone()
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{patient ? 'Modifier le patient' : 'Nouveau patient'}</DialogTitle>
        <DialogDescription>Les champs marqués d&apos;un * sont obligatoires.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-4">
        <Field
          id="fullName"
          label="Nom complet"
          value={fullName}
          error={messageFor('fullName')}
          onChange={setFullName}
        />
        <Field id="cin" label="CIN" value={cin} error={messageFor('cin')} onChange={setCin} />
        <Field id="phone" label="Téléphone" value={phone} error={messageFor('phone')} onChange={setPhone} />
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="birthDate" required>
            Date de naissance
          </FieldLabel>
          <Input
            id="birthDate"
            type="date"
            max={todayInClinic()}
            aria-invalid={Boolean(messageFor('birthDate'))}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <FieldError>{messageFor('birthDate')}</FieldError>
        </div>
        <Field id="address" label="Adresse" value={address} required={false} onChange={setAddress} />
        {generalError && <p className="text-sm text-destructive">{generalError}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError>{error}</FieldError>
    </div>
  )
}
