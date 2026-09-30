import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useDeletePatientMutation,
  useGetPatientsQuery,
  useMeQuery,
  useRestorePatientMutation,
} from '@/app/api'
import { PatientFormDialog } from '@/components/patient-form-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatClinicDate } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Patient } from '@/types/clinic'

const PAGE_SIZE = 10

export function PatientsPage() {
  const [params, setSearchParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const page = positiveInt(params.get('page'))
  const archived = params.get('archived') === '1'
  const [searchInput, setSearchInput] = useState(search)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const { data: me } = useMeQuery()
  const isAdmin = me?.user.role === 'admin'
  const showArchived = isAdmin && archived
  const { data, isLoading, isFetching, error } = useGetPatientsQuery({
    search,
    page,
    limit: PAGE_SIZE,
    archived: showArchived,
  })
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  useDebouncedSearch(searchInput, (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    next.delete('page')
    setSearchParams(next, { replace: true })
  })

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(patient: Patient) {
    setEditing(patient)
    setFormOpen(true)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `${data.total} dossier${data.total > 1 ? 's' : ''}${showArchived ? ' archivé' + (data.total > 1 ? 's' : '') : ''}`
              : 'Dossiers de la clinique'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          <Plus />
          Nouveau patient
        </Button>
      </div>
      {isAdmin && (
        <div className="flex gap-2">
          <Button variant={showArchived ? 'outline' : 'secondary'} size="sm" onClick={() => setArchived(false)}>
            Actifs
          </Button>
          <Button variant={showArchived ? 'secondary' : 'outline'} size="sm" onClick={() => setArchived(true)}>
            Archivés
          </Button>
        </div>
      )}
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Nom ou CIN"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-24 w-full md:h-8" />
          <Skeleton className="h-24 w-full md:h-8" />
          <Skeleton className="h-24 w-full md:h-8" />
        </div>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {data?.patients.length === 0 && (
              <li className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
                {showArchived ? 'Aucun patient archivé.' : 'Aucun patient pour cette recherche.'}
              </li>
            )}
            {data?.patients.map((patient) => (
              <li key={patient.id} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {showArchived ? (
                      <p className="font-medium break-words">{patient.fullName}</p>
                    ) : (
                      <Link
                        className="font-medium break-words underline-offset-4 hover:underline"
                        to={`/patients/${patient.id}`}
                      >
                        {patient.fullName}
                      </Link>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{patient.cin}</p>
                  </div>
                  <PatientActions
                    patient={patient}
                    showArchived={showArchived}
                    isAdmin={isAdmin}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Téléphone</dt>
                    <dd>{patient.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Naissance</dt>
                    <dd>{formatClinicDate(patient.birthDate)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Naissance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {showArchived ? 'Aucun patient archivé.' : 'Aucun patient pour cette recherche.'}
                  </TableCell>
                </TableRow>
              )}
              {data?.patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    {showArchived ? (
                      <span className="font-medium">{patient.fullName}</span>
                    ) : (
                      <Link className="font-medium underline-offset-4 hover:underline" to={`/patients/${patient.id}`}>
                        {patient.fullName}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>{patient.cin}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>{formatClinicDate(patient.birthDate)}</TableCell>
                  <TableCell className="text-right">
                    <PatientActions
                      patient={patient}
                      showArchived={showArchived}
                      isAdmin={isAdmin}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </>
      )}
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Page {page} sur {totalPages}
          {isFetching && !isLoading ? ' · mise à jour…' : ''}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Précédent
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Suivant
          </Button>
        </div>
      </div>
      <PatientFormDialog
        open={formOpen}
        patient={editing}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeletePatientDialog patient={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </div>
  )

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
  }

  function setArchived(nextArchived: boolean) {
    const next = new URLSearchParams(params)
    if (nextArchived) next.set('archived', '1')
    else next.delete('archived')
    next.delete('page')
    setSearchParams(next)
  }
}

function PatientActions({
  patient,
  showArchived,
  isAdmin,
  onEdit,
  onDelete,
}: {
  patient: Patient
  showArchived: boolean
  isAdmin: boolean
  onEdit: (patient: Patient) => void
  onDelete: (patient: Patient) => void
}) {
  if (showArchived) {
    return <RestoreButton patientId={patient.id} />
  }

  return (
    <div className="flex shrink-0 justify-end">
      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(patient)}>
        <Pencil />
        <span className="sr-only">Modifier</span>
      </Button>
      {isAdmin && (
        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(patient)}>
          <Trash2 />
          <span className="sr-only">Archiver</span>
        </Button>
      )}
    </div>
  )
}

function DeletePatientDialog({
  patient,
  onOpenChange,
}: {
  patient: Patient | null
  onOpenChange: (open: boolean) => void
}) {
  const [remove, { isLoading, error }] = useDeletePatientMutation()

  async function onDelete() {
    if (!patient) return
    try {
      await remove(patient.id).unwrap()
      toast.success('Patient archivé')
      onOpenChange(false)
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog open={patient !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archiver ce patient ?</DialogTitle>
          <DialogDescription>
            {patient
              ? `${patient.fullName} quitte la liste active. Le dossier peut être restauré depuis Archivés.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={isLoading} onClick={onDelete}>
            {isLoading ? 'Archivage…' : 'Archiver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RestoreButton({ patientId }: { patientId: string }) {
  const [restore, { isLoading, originalArgs }] = useRestorePatientMutation()
  const pending = isLoading && originalArgs === patientId

  async function onRestore() {
    try {
      await restore(patientId).unwrap()
      toast.success('Patient restauré')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onRestore}>
      <RotateCcw />
      {pending ? 'Restauration…' : 'Restaurer'}
    </Button>
  )
}

function useDebouncedSearch(value: string, onChange: (value: string) => void) {
  const onChangeRef = useRef(onChange)
  const ready = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!ready.current) {
      ready.current = true
      return
    }
    const timer = window.setTimeout(() => onChangeRef.current(value), 300)
    return () => window.clearTimeout(timer)
  }, [value])
}

function positiveInt(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}
