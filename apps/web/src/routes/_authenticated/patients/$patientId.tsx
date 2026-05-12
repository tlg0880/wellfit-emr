import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Input } from "@wellfit-emr/ui/components/input";
import { Label } from "@wellfit-emr/ui/components/label";
import { SearchSelect } from "@wellfit-emr/ui/components/search-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  Calendar,
  ClipboardPlus,
  FileCheck,
  FileText,
  FlaskConical,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PatientTimeline } from "@/components/patient-timeline";
import { authClient } from "@/lib/auth-client";
import { formatAge } from "@/utils/age";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  component: PatientDetailPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw new Error("UNAUTHORIZED");
    }
    return { session };
  },
  errorComponent: () => {
    window.location.href = "/login";
    return null;
  },
});

const updatePatientSchema = z.object({
  primaryDocumentType: z.string().min(1, "Requerido"),
  primaryDocumentNumber: z.string().min(1, "Requerido"),
  firstName: z.string().min(1, "Requerido"),
  middleName: z.string(),
  lastName1: z.string().min(1, "Requerido"),
  lastName2: z.string(),
  birthDate: z.string().min(1, "Requerido"),
  sexAtBirth: z.string().min(1, "Requerido"),
  genderIdentity: z.string(),
  countryCode: z.string(),
  municipalityCode: z.string(),
  zoneCode: z.string(),
  deceasedAt: z.string(),
});

interface Patient {
  birthDate: Date;
  countryCode: string | null;
  createdAt: Date;
  deceasedAt: Date | null;
  firstName: string;
  genderIdentity: string | null;
  id: string;
  lastName1: string;
  lastName2: string | null;
  middleName: string | null;
  municipalityCode: string | null;
  primaryDocumentNumber: string;
  primaryDocumentType: string;
  sexAtBirth: string;
  updatedAt: Date;
  zoneCode: string | null;
}

function EditPatientForm({
  patient,
  onCancel,
}: {
  patient: Patient;
  onCancel: () => void;
}) {
  const [countrySearch, setCountrySearch] = useState(patient.countryCode ?? "");
  const [municipalitySearch, setMunicipalitySearch] = useState(
    patient.municipalityCode ?? ""
  );

  const { data: countriesData, isLoading: countriesLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "Pais",
        limit: 20,
        search: countrySearch || undefined,
      },
    })
  );

  const { data: municipalitiesData, isLoading: municipalitiesLoading } =
    useQuery(
      orpc.ripsReference.listEntries.queryOptions({
        input: {
          tableName: "Municipio",
          limit: 20,
          search: municipalitySearch || undefined,
        },
      })
    );

  const updateMutation = useMutation({
    ...orpc.patients.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Paciente actualizado correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.patients.get.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.patients.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar paciente");
    },
  });

  const form = useForm({
    defaultValues: {
      primaryDocumentType: patient.primaryDocumentType,
      primaryDocumentNumber: patient.primaryDocumentNumber,
      firstName: patient.firstName,
      middleName: patient.middleName ?? "",
      lastName1: patient.lastName1,
      lastName2: patient.lastName2 ?? "",
      birthDate: new Date(patient.birthDate).toISOString().split("T")[0],
      sexAtBirth: patient.sexAtBirth,
      genderIdentity: patient.genderIdentity ?? "",
      countryCode: patient.countryCode ?? "",
      municipalityCode: patient.municipalityCode ?? "",
      zoneCode: patient.zoneCode ?? "",
      deceasedAt: patient.deceasedAt
        ? new Date(patient.deceasedAt).toISOString().slice(0, 16)
        : "",
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        id: patient.id,
        primaryDocumentType: value.primaryDocumentType,
        primaryDocumentNumber: value.primaryDocumentNumber,
        firstName: value.firstName,
        middleName: value.middleName || null,
        lastName1: value.lastName1,
        lastName2: value.lastName2 || null,
        birthDate: new Date(value.birthDate),
        sexAtBirth: value.sexAtBirth,
        genderIdentity: value.genderIdentity || null,
        countryCode: value.countryCode || null,
        municipalityCode: value.municipalityCode || null,
        zoneCode: value.zoneCode || null,
        deceasedAt: value.deceasedAt ? new Date(value.deceasedAt) : null,
      });
    },
    validators: {
      onSubmit: updatePatientSchema,
    },
  });

  const fieldGrid = "space-y-1";

  return (
    <Card className="mx-6" size="sm">
      <CardHeader>
        <CardTitle>Editar paciente</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <form.Field name="primaryDocumentType">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Tipo de documento *</Label>
                  <Select
                    onValueChange={(v) => field.handleChange(v as string)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de extranjería</SelectItem>
                      <SelectItem value="PA">Pasaporte</SelectItem>
                      <SelectItem value="RC">Registro civil</SelectItem>
                      <SelectItem value="TI">Tarjeta de identidad</SelectItem>
                      <SelectItem value="PEP">
                        Permiso especial de permanencia
                      </SelectItem>
                      <SelectItem value="PPT">
                        Permiso por protección temporal
                      </SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="primaryDocumentNumber">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Número de documento *</Label>
                  <Input
                    autoFocus
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="firstName">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Primer nombre *</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="middleName">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Segundo nombre</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="lastName1">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Primer apellido *</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="lastName2">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Segundo apellido</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="birthDate">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Fecha de nacimiento *</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="date"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="sexAtBirth">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Sexo al nacer *</Label>
                  <Select
                    onValueChange={(v) => field.handleChange(v as string)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="H">Hombre</SelectItem>
                      <SelectItem value="M">Mujer</SelectItem>
                      <SelectItem value="I">Indeterminado</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-xs"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="genderIdentity">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Identidad de género</Label>
                  <Select
                    onValueChange={(v) => field.handleChange(v as string)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="transgenero">Transgénero</SelectItem>
                      <SelectItem value="no_binario">No binario</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                      <SelectItem value="prefiero_no_decir">
                        Prefiero no decir
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="countryCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>País</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id={field.name}
                    loading={countriesLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setCountrySearch}
                    options={
                      countriesData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar país..."
                    search={countrySearch}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="municipalityCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Municipio</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id={field.name}
                    loading={municipalitiesLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setMunicipalitySearch}
                    options={
                      municipalitiesData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar municipio..."
                    search={municipalitySearch}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="zoneCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Zona</Label>
                  <Select
                    onValueChange={(v) => field.handleChange(v as string)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Rural</SelectItem>
                      <SelectItem value="02">Urbano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="deceasedAt">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Fecha de fallecimiento</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="datetime-local"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={!canSubmit || isSubmitting}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PatientInfoCard({
  patient,
  onEdit,
}: {
  patient: Patient;
  onEdit: () => void;
}) {
  const infoRows = [
    { label: "Tipo de documento", value: patient.primaryDocumentType },
    { label: "Número de documento", value: patient.primaryDocumentNumber },
    {
      label: "Nombres",
      value: `${patient.firstName} ${patient.middleName ?? ""}`.trim(),
    },
    {
      label: "Apellidos",
      value: `${patient.lastName1} ${patient.lastName2 ?? ""}`.trim(),
    },
    {
      label: "Fecha de nacimiento",
      value: new Date(patient.birthDate).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    },
    { label: "Edad", value: formatAge(patient.birthDate) },
    { label: "Sexo al nacer", value: patient.sexAtBirth },
    { label: "Identidad de género", value: patient.genderIdentity ?? "—" },
    { label: "País", value: patient.countryCode ?? "—" },
    { label: "Municipio", value: patient.municipalityCode ?? "—" },
    { label: "Zona", value: patient.zoneCode ?? "—" },
    ...(patient.deceasedAt
      ? [
          {
            label: "Fallecimiento",
            value: (
              <span className="text-destructive">
                {new Date(patient.deceasedAt).toLocaleString("es-CO")}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card className="mx-6" size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Información personal</CardTitle>
        <Button onClick={onEdit} size="sm" variant="outline">
          <Pencil size={14} />
          Editar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoRows.map((row) => (
            <div key={row.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {row.label}
              </p>
              <p className="mt-0.5 font-medium text-xs">{row.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactsSection({ patientId }: { patientId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contactType, setContactType] = useState("emergency");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationshipCode, setRelationshipCode] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const { data, isLoading } = useQuery(
    orpc.patientContacts.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        patientId,
        sortDirection: "asc",
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.patientContacts.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Contacto agregado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientContacts.list.key({ type: "query" }),
      });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar contacto");
    },
  });

  const updateMutation = useMutation({
    ...orpc.patientContacts.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Contacto actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientContacts.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar contacto");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.patientContacts.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Contacto eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientContacts.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar contacto");
    },
  });

  function resetForm() {
    setContactType("emergency");
    setFullName("");
    setPhone("");
    setEmail("");
    setRelationshipCode("");
    setIsPrimary(false);
  }

  function startEdit(row: {
    id: string;
    contactType: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    relationshipCode: string | null;
    isPrimary: boolean;
  }) {
    setEditingId(row.id);
    setContactType(row.contactType);
    setFullName(row.fullName ?? "");
    setPhone(row.phone ?? "");
    setEmail(row.email ?? "");
    setRelationshipCode(row.relationshipCode ?? "");
    setIsPrimary(row.isPrimary);
    setShowForm(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactType.trim()) {
      toast.error("Tipo de contacto es obligatorio");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        contactType: contactType.trim(),
        fullName: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        relationshipCode: relationshipCode.trim() || null,
        isPrimary,
      });
    } else {
      createMutation.mutate({
        patientId,
        contactType: contactType.trim(),
        fullName: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        relationshipCode: relationshipCode.trim() || null,
        isPrimary,
      });
    }
  };

  const columns = [
    {
      header: "Tipo",
      accessor: (row: { contactType: string; isPrimary: boolean }) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium capitalize">{row.contactType}</span>
          {row.isPrimary && (
            <span className="inline-flex border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-[10px] text-amber-700">
              Principal
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Nombre",
      accessor: (row: { fullName: string | null }) => row.fullName ?? "—",
    },
    {
      header: "Teléfono",
      accessor: (row: { phone: string | null }) => row.phone ?? "—",
    },
    {
      header: "Correo",
      accessor: (row: { email: string | null }) => row.email ?? "—",
    },
    {
      header: "Relación",
      accessor: (row: { relationshipCode: string | null }) =>
        row.relationshipCode ?? "—",
    },
    {
      header: "",
      accessor: (row: {
        id: string;
        contactType: string;
        fullName: string | null;
        phone: string | null;
        email: string | null;
        relationshipCode: string | null;
        isPrimary: boolean;
      }) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar contacto"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar contacto"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este contacto?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-16",
    },
  ];

  return (
    <Card className="mx-6" size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contactos</CardTitle>
        <Button
          onClick={() => {
            if (showForm && editingId) {
              setEditingId(null);
              resetForm();
            }
            setShowForm((s) => !s);
          }}
          size="sm"
          variant="outline"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar"}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select
                onValueChange={(v) => setContactType(v as string)}
                value={contactType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergencia</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Laboral</SelectItem>
                  <SelectItem value="family">Familiar</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre completo"
                value={fullName}
              />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
                value={phone}
              />
            </div>
            <div className="space-y-1">
              <Label>Correo</Label>
              <Input
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                value={email}
              />
            </div>
            <div className="space-y-1">
              <Label>Relación</Label>
              <Input
                onChange={(e) => setRelationshipCode(e.target.value)}
                placeholder="Ej. padre, cónyuge"
                value={relationshipCode}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                checked={isPrimary}
                className="size-4 rounded-none border border-input"
                id="contact-primary"
                onChange={(e) => setIsPrimary(e.target.checked)}
                type="checkbox"
              />
              <Label htmlFor="contact-primary">Principal</Label>
            </div>
            <div className="flex items-end gap-2 sm:col-start-1">
              <Button
                disabled={createMutation.isPending || updateMutation.isPending}
                size="sm"
                type="submit"
              >
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
              {editingId && (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                    setShowForm(false);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="Este paciente no tiene contactos registrados."
          emptyTitle="Sin contactos"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}

function PayerName({ payerId }: { payerId: string }) {
  const { data } = useQuery(
    orpc.payers.list.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );
  const payer = data?.items.find((p) => p.id === payerId);
  return (
    <span className="font-medium">
      {payer?.name ?? `${payerId.slice(0, 8)}…`}
    </span>
  );
}

function CoverageSection({ patientId }: { patientId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payerId, setPayerId] = useState("");
  const [affiliateType, setAffiliateType] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coveragePlanCode, setCoveragePlanCode] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  const { data, isLoading } = useQuery(
    orpc.coverage.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        patientId,
        sortDirection: "desc",
      },
    })
  );

  const { data: payersData } = useQuery(
    orpc.payers.list.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const createMutation = useMutation({
    ...orpc.coverage.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Cobertura agregada");
      queryClient.invalidateQueries({
        queryKey: orpc.coverage.list.key({ type: "query" }),
      });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar cobertura");
    },
  });

  const updateMutation = useMutation({
    ...orpc.coverage.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Cobertura actualizada");
      queryClient.invalidateQueries({
        queryKey: orpc.coverage.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar cobertura");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.coverage.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Cobertura eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.coverage.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar cobertura");
    },
  });

  function resetForm() {
    setPayerId("");
    setAffiliateType("");
    setPolicyNumber("");
    setCoveragePlanCode("");
    setEffectiveFrom("");
    setEffectiveTo("");
  }

  function startEdit(row: {
    id: string;
    payerId: string;
    affiliateType: string;
    policyNumber: string | null;
    coveragePlanCode: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }) {
    setEditingId(row.id);
    setPayerId(row.payerId);
    setAffiliateType(row.affiliateType);
    setPolicyNumber(row.policyNumber ?? "");
    setCoveragePlanCode(row.coveragePlanCode ?? "");
    setEffectiveFrom(new Date(row.effectiveFrom).toISOString().slice(0, 10));
    setEffectiveTo(
      row.effectiveTo
        ? new Date(row.effectiveTo).toISOString().slice(0, 10)
        : ""
    );
    setShowForm(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(payerId && affiliateType && effectiveFrom)) {
      toast.error(
        "Pagador, tipo de afiliación y fecha de inicio son obligatorios"
      );
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        payerId,
        affiliateType: affiliateType.trim(),
        policyNumber: policyNumber.trim() || null,
        coveragePlanCode: coveragePlanCode.trim() || null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      });
    } else {
      createMutation.mutate({
        patientId,
        payerId,
        affiliateType: affiliateType.trim(),
        policyNumber: policyNumber.trim() || null,
        coveragePlanCode: coveragePlanCode.trim() || null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      });
    }
  };

  const columns = [
    {
      header: "Pagador",
      accessor: (row: { payerId: string }) => (
        <PayerName payerId={row.payerId} />
      ),
    },
    {
      header: "Tipo afiliación",
      accessor: (row: { affiliateType: string }) => row.affiliateType,
    },
    {
      header: "Número póliza",
      accessor: (row: { policyNumber: string | null }) =>
        row.policyNumber ?? "—",
    },
    {
      header: "Plan",
      accessor: (row: { coveragePlanCode: string | null }) =>
        row.coveragePlanCode ?? "—",
    },
    {
      header: "Vigencia",
      accessor: (row: { effectiveFrom: Date; effectiveTo: Date | null }) => (
        <span>
          {new Date(row.effectiveFrom).toLocaleDateString("es-CO")}
          {row.effectiveTo
            ? ` → ${new Date(row.effectiveTo).toLocaleDateString("es-CO")}`
            : " → —"}
        </span>
      ),
    },
    {
      header: "",
      accessor: (row: {
        id: string;
        payerId: string;
        affiliateType: string;
        policyNumber: string | null;
        coveragePlanCode: string | null;
        effectiveFrom: Date;
        effectiveTo: Date | null;
      }) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar cobertura"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar cobertura"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta cobertura?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-16",
    },
  ];

  return (
    <Card className="mx-6" size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cobertura / Afiliación</CardTitle>
        <Button
          onClick={() => {
            if (showForm && editingId) {
              setEditingId(null);
              resetForm();
            }
            setShowForm((s) => !s);
          }}
          size="sm"
          variant="outline"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar"}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1">
              <Label>Pagador *</Label>
              <Select
                onValueChange={(v) => setPayerId(v as string)}
                value={payerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {payersData?.items.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo afiliación *</Label>
              <Select
                onValueChange={(v) => setAffiliateType(v as string)}
                value={affiliateType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributivo">Contributivo</SelectItem>
                  <SelectItem value="subsidado">Subsidado</SelectItem>
                  <SelectItem value="vinculado">Vinculado</SelectItem>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número póliza</Label>
              <Input
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="Número de póliza"
                value={policyNumber}
              />
            </div>
            <div className="space-y-1">
              <Label>Plan</Label>
              <Input
                onChange={(e) => setCoveragePlanCode(e.target.value)}
                placeholder="Código del plan"
                value={coveragePlanCode}
              />
            </div>
            <div className="space-y-1">
              <Label>Vigente desde *</Label>
              <Input
                onChange={(e) => setEffectiveFrom(e.target.value)}
                type="date"
                value={effectiveFrom}
              />
            </div>
            <div className="space-y-1">
              <Label>Vigente hasta</Label>
              <Input
                onChange={(e) => setEffectiveTo(e.target.value)}
                type="date"
                value={effectiveTo}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-start-1">
              <Button
                disabled={createMutation.isPending || updateMutation.isPending}
                size="sm"
                type="submit"
              >
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
              {editingId && (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                    setShowForm(false);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="Este paciente no tiene coberturas registradas."
          emptyTitle="Sin coberturas"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}

function IdentifiersSection({ patientId }: { patientId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [identifierSystem, setIdentifierSystem] = useState("");
  const [identifierType, setIdentifierType] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);

  const { data, isLoading } = useQuery(
    orpc.patientIdentifiers.list.queryOptions({
      input: {
        limit: 25,
        offset: 0,
        patientId,
        sortDirection: "desc",
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.patientIdentifiers.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Identificador agregado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientIdentifiers.list.key({ type: "query" }),
      });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar identificador");
    },
  });

  const updateMutation = useMutation({
    ...orpc.patientIdentifiers.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Identificador actualizado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientIdentifiers.list.key({ type: "query" }),
      });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar identificador");
    },
  });

  const deleteMutation = useMutation({
    ...orpc.patientIdentifiers.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Identificador eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientIdentifiers.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar identificador");
    },
  });

  function resetForm() {
    setIdentifierSystem("");
    setIdentifierType("");
    setIdentifierValue("");
    setIsCurrent(true);
  }

  function startEdit(row: {
    id: string;
    identifierSystem: string;
    identifierType: string;
    identifierValue: string;
    isCurrent: boolean;
  }) {
    setEditingId(row.id);
    setIdentifierSystem(row.identifierSystem);
    setIdentifierType(row.identifierType);
    setIdentifierValue(row.identifierValue);
    setIsCurrent(row.isCurrent);
    setShowForm(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(
        identifierSystem.trim() &&
        identifierType.trim() &&
        identifierValue.trim()
      )
    ) {
      toast.error("Todos los campos obligatorios deben estar completos");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        identifierSystem: identifierSystem.trim(),
        identifierType: identifierType.trim(),
        identifierValue: identifierValue.trim(),
        isCurrent,
      });
    } else {
      createMutation.mutate({
        patientId,
        identifierSystem: identifierSystem.trim(),
        identifierType: identifierType.trim(),
        identifierValue: identifierValue.trim(),
        isCurrent,
      });
    }
  };

  const columns = [
    {
      header: "Sistema",
      accessor: (row: { identifierSystem: string; isCurrent: boolean }) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium">{row.identifierSystem}</span>
          {row.isCurrent && (
            <span className="inline-flex border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-medium text-[10px] text-emerald-700">
              Vigente
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Tipo",
      accessor: (row: { identifierType: string }) => row.identifierType,
    },
    {
      header: "Valor",
      accessor: (row: { identifierValue: string }) => (
        <span className="font-mono text-xs">{row.identifierValue}</span>
      ),
    },
    {
      header: "",
      accessor: (row: {
        id: string;
        identifierSystem: string;
        identifierType: string;
        identifierValue: string;
        isCurrent: boolean;
      }) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Editar identificador"
            onClick={() => startEdit(row)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar identificador"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este identificador?")) {
                deleteMutation.mutate({ id: row.id });
              }
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
      className: "w-16",
    },
  ];

  return (
    <Card className="mx-6" size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Identificadores</CardTitle>
        <Button
          onClick={() => {
            if (showForm && editingId) {
              setEditingId(null);
              resetForm();
            }
            setShowForm((s) => !s);
          }}
          size="sm"
          variant="outline"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar"}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1">
              <Label>Sistema *</Label>
              <Select
                onValueChange={(v) => setIdentifierSystem(v as string)}
                value={identifierSystem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENI">RENI</SelectItem>
                  <SelectItem value="SAF">SAF</SelectItem>
                  <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                  <SelectItem value="TI">Tarjeta de identidad</SelectItem>
                  <SelectItem value="PAS">Pasaporte</SelectItem>
                  <SelectItem value="CE">Cédula de extranjería</SelectItem>
                  <SelectItem value="NIT">NIT</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Input
                onChange={(e) => setIdentifierType(e.target.value)}
                placeholder="Ej. número, código"
                value={identifierType}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor *</Label>
              <Input
                onChange={(e) => setIdentifierValue(e.target.value)}
                placeholder="Valor del identificador"
                value={identifierValue}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                checked={isCurrent}
                className="size-4 rounded-none border border-input"
                id="id-current"
                onChange={(e) => setIsCurrent(e.target.checked)}
                type="checkbox"
              />
              <Label htmlFor="id-current">Vigente</Label>
            </div>
            <div className="flex items-end gap-2">
              <Button
                disabled={createMutation.isPending || updateMutation.isPending}
                size="sm"
                type="submit"
              >
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
              {editingId && (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                    setShowForm(false);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="Este paciente no tiene identificadores adicionales registrados."
          emptyTitle="Sin identificadores"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}

function EncountersSection({ patientId }: { patientId: string }) {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);

  const { data, isLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit,
        offset,
        patientId,
        sortBy: "startedAt",
        sortDirection: "desc",
      },
    })
  );

  const columns = [
    {
      header: "Motivo de consulta",
      accessor: (row: { reasonForVisit: string }) => (
        <span className="font-medium">{row.reasonForVisit}</span>
      ),
    },
    {
      header: "Fecha de inicio",
      accessor: (row: { startedAt: Date }) =>
        new Date(row.startedAt).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      header: "Estado",
      accessor: (row: { status: string }) => (
        <span
          className={
            row.status === "in-progress"
              ? "text-emerald-600"
              : row.status === "finished"
                ? "text-muted-foreground"
                : ""
          }
        >
          {row.status === "in-progress"
            ? "En progreso"
            : row.status === "finished"
              ? "Finalizada"
              : row.status}
        </span>
      ),
    },
    {
      header: "Modalidad",
      accessor: (row: { careModality: string }) => row.careModality,
    },
  ];

  return (
    <Card className="mx-6" size="sm">
      <CardHeader>
        <CardTitle>Historial de atenciones</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data?.encounters ?? []}
          emptyDescription="Este paciente no tiene atenciones registradas."
          emptyTitle="Sin atenciones"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          pagination={
            data
              ? {
                  limit,
                  offset,
                  total: data.total,
                  onPageChange: setOffset,
                }
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

function PatientDetailPage() {
  const { patientId } = Route.useParams();
  const [editing, setEditing] = useState(false);

  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
  } = useQuery(orpc.patients.get.queryOptions({ input: { id: patientId } }));

  const fullName = patient
    ? `${patient.firstName} ${patient.lastName1}`
    : "Paciente";

  useEffect(() => {
    if (patient) {
      document.title = `${fullName} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [patient, fullName]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          !editing && patient ? (
            <div className="flex items-center gap-2">
              <Link search={{ patientId: patient.id }} to="/encounters">
                <Button size="sm" variant="outline">
                  <ClipboardPlus size={14} />
                  Nueva atención
                </Button>
              </Link>
              <Link search={{ patientId: patient.id }} to="/medication-orders">
                <Button size="sm" variant="outline">
                  <Pill size={14} />
                  Nueva prescripción
                </Button>
              </Link>
              <Link search={{ patientId: patient.id }} to="/service-requests">
                <Button size="sm" variant="outline">
                  <FlaskConical size={14} />
                  Nueva orden
                </Button>
              </Link>
              <Link search={{ patientId: patient.id }} to="/appointments">
                <Button size="sm" variant="outline">
                  <Calendar size={14} />
                  Nueva cita
                </Button>
              </Link>
              <Link
                search={{ patientId: patient.id }}
                to="/incapacity-certificates"
              >
                <Button size="sm" variant="outline">
                  <FileCheck size={14} />
                  Nueva incapacidad
                </Button>
              </Link>
              <Link search={{ patientId: patient.id }} to="/clinical-documents">
                <Button size="sm" variant="outline">
                  <FileText size={14} />
                  Nuevo documento
                </Button>
              </Link>
              <Link search={{ patientId: patient.id }} to="/consents">
                <Button size="sm" variant="outline">
                  <ShieldCheck size={14} />
                  Nuevo consentimiento
                </Button>
              </Link>
              <Button
                onClick={() => setEditing(true)}
                size="sm"
                variant="outline"
              >
                <Pencil size={14} />
                Editar
              </Button>
            </div>
          ) : undefined
        }
        backTo="/patients"
        description="Información clínica y atenciones del paciente"
        title={fullName}
      />

      {patientError ? (
        <div className="mx-6 flex flex-col items-center justify-center gap-2 py-12">
          <p className="text-destructive text-sm">Error al cargar paciente</p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: orpc.patients.get.key({ type: "query" }),
              })
            }
            size="sm"
            variant="outline"
          >
            <RefreshCw size={12} />
            Reintentar
          </Button>
        </div>
      ) : patientLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : patient ? (
        <>
          {editing ? (
            <EditPatientForm
              onCancel={() => setEditing(false)}
              patient={patient}
            />
          ) : (
            <PatientInfoCard
              onEdit={() => setEditing(true)}
              patient={patient}
            />
          )}
          <ContactsSection patientId={patientId} />
          <CoverageSection patientId={patientId} />
          <IdentifiersSection patientId={patientId} />
          <PatientTimeline patientId={patientId} />
          <EncountersSection patientId={patientId} />
        </>
      ) : (
        <EmptyState
          description="No se encontró el paciente solicitado."
          title="Paciente no encontrado"
        />
      )}
    </div>
  );
}
