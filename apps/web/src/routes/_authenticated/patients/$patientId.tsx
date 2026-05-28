import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { env } from "@wellfit-emr/env/web";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@wellfit-emr/ui/components/dropdown-menu";
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
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@wellfit-emr/ui/components/tabs";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ClipboardPlus,
  Clock,
  Download,
  FileCheck,
  FileText,
  FileUp,
  FlaskConical,
  IdCard,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PatientTimeline } from "@/components/patient-timeline";
import { formatAge } from "@/utils/age";
import { orpc, queryClient } from "@/utils/orpc";

const PATIENT_TABS = [
  { id: "timeline", label: "Línea de tiempo", icon: Activity },
  { id: "encounters", label: "Atenciones", icon: ClipboardList },
  { id: "documents", label: "Documentos", icon: FileText },
  { id: "admin", label: "Administrativo", icon: IdCard },
] as const;

type PatientTabId = (typeof PATIENT_TABS)[number]["id"];

const DEFAULT_TAB: PatientTabId = "timeline";

const DOC_TYPE_LABELS: Record<string, string> = {
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  PA: "Pasaporte",
  RC: "Registro civil",
  TI: "Tarjeta de identidad",
  PEP: "Permiso especial de permanencia",
  PPT: "Permiso por protección temporal",
  NIT: "NIT",
};

const SEX_AT_BIRTH_LABELS: Record<string, string> = {
  H: "Hombre",
  M: "Mujer",
  I: "Indeterminado",
};

const GENDER_IDENTITY_LABELS: Record<string, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  transgenero: "Transgénero",
  no_binario: "No binario",
  otro: "Otro",
  prefiero_no_decir: "Prefiero no decir",
};

const ZONE_LABELS: Record<string, string> = {
  "01": "Rural",
  "02": "Urbano",
};

function isPatientTabId(value: unknown): value is PatientTabId {
  return (
    typeof value === "string" && PATIENT_TABS.some((tab) => tab.id === value)
  );
}

const patientDetailSearchSchema = z.object({
  tab: z
    .union([
      z.literal("timeline"),
      z.literal("encounters"),
      z.literal("documents"),
      z.literal("admin"),
    ])
    .optional(),
});

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  component: PatientDetailPage,
  validateSearch: patientDetailSearchSchema,
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className="font-medium text-foreground/90 text-xs">{value}</dd>
    </div>
  );
}

function InfoSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5 border-border/60 border-b pb-1.5">
        <Icon className="text-primary" size={12} />
        <h3 className="font-semibold text-[11px] text-foreground/80 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

function DeceasedBanner({ deceasedAt }: { deceasedAt: Date }) {
  return (
    <div className="mx-6 flex items-center gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 shadow-sm">
      <AlertCircle className="shrink-0 text-destructive" size={16} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-destructive text-xs">
          Paciente fallecido
        </p>
        <p className="text-[11px] text-destructive/80">
          Registrado el{" "}
          {new Date(deceasedAt).toLocaleString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function PatientInfoCard({
  patient,
  onEdit,
}: {
  patient: Patient;
  onEdit: () => void;
}) {
  const docTypeLabel =
    DOC_TYPE_LABELS[patient.primaryDocumentType] ?? patient.primaryDocumentType;
  const sexLabel =
    SEX_AT_BIRTH_LABELS[patient.sexAtBirth] ?? patient.sexAtBirth;
  const genderLabel = patient.genderIdentity
    ? (GENDER_IDENTITY_LABELS[patient.genderIdentity] ?? patient.genderIdentity)
    : "—";
  const zoneLabel = patient.zoneCode
    ? (ZONE_LABELS[patient.zoneCode] ?? patient.zoneCode)
    : "—";

  const fullName = [
    patient.firstName,
    patient.middleName,
    patient.lastName1,
    patient.lastName2,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="mx-6" size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary" size={14} />
          Información personal
        </CardTitle>
        <Button onClick={onEdit} size="sm" variant="outline">
          <Pencil size={14} />
          Editar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <InfoSection icon={IdCard} title="Identificación">
            <InfoRow label="Tipo" value={docTypeLabel} />
            <InfoRow
              label="Número"
              value={
                <span className="font-mono">
                  {patient.primaryDocumentNumber}
                </span>
              }
            />
          </InfoSection>

          <InfoSection icon={User} title="Datos personales">
            <div className="col-span-2">
              <InfoRow label="Nombre completo" value={fullName} />
            </div>
            <InfoRow
              label="Fecha de nacimiento"
              value={new Date(patient.birthDate).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            />
            <InfoRow label="Edad" value={formatAge(patient.birthDate)} />
            <InfoRow label="Sexo al nacer" value={sexLabel} />
            <InfoRow label="Identidad de género" value={genderLabel} />
          </InfoSection>

          <InfoSection icon={Activity} title="Ubicación">
            <InfoRow label="País" value={patient.countryCode ?? "—"} />
            <InfoRow
              label="Municipio"
              value={patient.municipalityCode ?? "—"}
            />
            <InfoRow label="Zona" value={zoneLabel} />
          </InfoSection>
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
    <Card size="sm">
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
                className="size-4 rounded-sm border border-input"
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
    <Card size="sm">
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
    <Card size="sm">
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
                className="size-4 rounded-sm border border-input"
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
    <Card size="sm">
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

const PATIENT_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const PATIENT_DOCUMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/jpg": "JPG",
  "text/plain": "TXT",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};

function mimeLabel(mime: string) {
  return MIME_LABELS[mime.split(";")[0].trim()] ?? mime.split("/")[1] ?? mime;
}

interface PatientDoc {
  createdAt: Date;
  id: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
  status: string;
  summaryJson: Record<string, unknown> | null;
  summaryText: string | null;
}

function DocStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-[10px] text-emerald-700">
        <CheckCircle2 size={10} />
        Completado
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-[10px] text-sky-700">
        <RefreshCw className="animate-spin" size={10} />
        Procesando IA…
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-[10px] text-amber-700">
        <Clock size={10} />
        En cola
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-[10px] text-red-700">
        <AlertCircle size={10} />
        Fallido
      </span>
    );
  }
  return null;
}

function DocSummaryPanel({ doc }: { doc: PatientDoc }) {
  if (doc.status === "processing" || doc.status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-sky-700 text-xs">
        <RefreshCw className="shrink-0 animate-spin" size={13} />
        <span>
          La IA está analizando este documento. El resumen aparecerá aquí
          automáticamente cuando esté listo.
        </span>
      </div>
    );
  }
  if (doc.status === "failed") {
    return (
      <p className="text-muted-foreground text-xs">
        No se pudo generar el resumen para este documento.
      </p>
    );
  }
  if (!doc.summaryText) {
    return (
      <p className="text-muted-foreground text-xs">
        Sin resumen disponible. Usa el botón ↺ para generarlo.
      </p>
    );
  }
  const points =
    doc.summaryJson &&
    typeof doc.summaryJson === "object" &&
    Array.isArray(doc.summaryJson.puntosClinicamenteRelevantes) &&
    (doc.summaryJson.puntosClinicamenteRelevantes as unknown[]).length > 0
      ? (doc.summaryJson.puntosClinicamenteRelevantes as unknown[])
      : null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        {doc.summaryText}
      </p>
      {points && (
        <div>
          <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            Puntos clínicamente relevantes
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground text-xs">
            {points.map((p, i) => (
              <li key={i}>{typeof p === "string" ? p : String(p)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PatientDocumentsSection({ patientId }: { patientId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    orpc.patientDocuments.list.queryOptions({
      input: { patientId, limit: 25, offset: 0, sortDirection: "desc" },
      refetchInterval: (query) => {
        const items = (query.state.data as { items?: PatientDoc[] } | undefined)
          ?.items;
        const hasInProgress = items?.some(
          (d) => d.status === "pending" || d.status === "processing"
        );
        return hasInProgress ? 3000 : false;
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.patientDocuments.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.patientDocuments.list.key({ type: "query" }),
      });
      setConfirmingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar documento");
    },
  });

  const generateSummaryMutation = useMutation({
    ...orpc.patientDocuments.generateSummary.mutationOptions(),
    onSuccess: () => {
      toast.success("Resumen en proceso");
      queryClient.invalidateQueries({
        queryKey: orpc.patientDocuments.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al iniciar resumen");
    },
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      return;
    }
    if (!PATIENT_DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) {
      toast.error("Tipo de archivo no permitido");
      return;
    }
    if (file.size > PATIENT_DOCUMENT_MAX_SIZE_BYTES) {
      toast.error("El archivo supera el máximo de 20 MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("patientId", patientId);
      formData.append("file", file);
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/patient-documents/upload`,
        { method: "POST", body: formData, credentials: "include" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al subir documento");
      }
      toast.success("Documento subido correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.patientDocuments.list.key({ type: "query" }),
      });
      setFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al subir documento"
      );
    } finally {
      setUploading(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Documentos adjuntos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload form */}
        <form
          className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center"
          onSubmit={handleUpload}
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Adjuntar archivo</Label>
            <Input
              accept="application/pdf,image/png,image/jpeg,image/jpg,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              type="file"
            />
            <p className="text-[10px] text-muted-foreground">
              Máximo 20 MB · PDF, PNG, JPG, TXT, Word, Excel
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={!file || uploading}
            size="sm"
            type="submit"
            variant="outline"
          >
            <FileUp size={14} />
            {uploading ? "Subiendo…" : "Subir"}
          </Button>
        </form>

        {/* Document list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton className="h-12 w-full" key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            Este paciente no tiene documentos adjuntos.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {items.map((doc) => {
              const isExpanded = expandedId === doc.id;
              const canRetry =
                doc.status === "failed" ||
                (!doc.summaryText &&
                  doc.status !== "processing" &&
                  doc.status !== "pending");
              return (
                <div key={doc.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {/* File icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                      <FileText size={14} />
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {doc.originalFileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {mimeLabel(doc.mimeType)} ·{" "}
                        {formatFileSize(doc.sizeBytes)} ·{" "}
                        {new Date(doc.createdAt).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Status badge */}
                    <DocStatusBadge status={doc.status} />

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      {/* Expand/collapse summary */}
                      <Button
                        aria-label={
                          isExpanded ? "Ocultar resumen" : "Ver resumen"
                        }
                        onClick={() =>
                          setExpandedId(isExpanded ? null : doc.id)
                        }
                        size="icon-xs"
                        variant="ghost"
                      >
                        <ChevronDown
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          size={12}
                        />
                      </Button>

                      <a
                        aria-label="Descargar documento"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        href={`${env.VITE_SERVER_URL}/api/patient-documents/${doc.id}/download`}
                        rel="noopener noreferrer"
                      >
                        <Download size={12} />
                      </a>

                      {canRetry && (
                        <Button
                          aria-label="Generar resumen IA"
                          disabled={generateSummaryMutation.isPending}
                          onClick={() =>
                            generateSummaryMutation.mutate({ id: doc.id })
                          }
                          size="icon-xs"
                          variant="ghost"
                        >
                          <RotateCcw size={12} />
                        </Button>
                      )}

                      {confirmingId === doc.id ? (
                        <>
                          <Button
                            aria-label="Confirmar eliminación"
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteMutation.isPending}
                            onClick={() =>
                              deleteMutation.mutate({ id: doc.id })
                            }
                            size="icon-xs"
                            variant="ghost"
                          >
                            <Trash2 size={12} />
                          </Button>
                          <Button
                            aria-label="Cancelar"
                            onClick={() => setConfirmingId(null)}
                            size="icon-xs"
                            variant="ghost"
                          >
                            <X size={12} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          aria-label="Eliminar documento"
                          onClick={() => setConfirmingId(doc.id)}
                          size="icon-xs"
                          variant="ghost"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable summary panel */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-3 py-3">
                      <p className="mb-1.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                        Resumen IA
                      </p>
                      <DocSummaryPanel doc={doc} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatientCreateActions({ patientId }: { patientId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="gap-1" size="sm">
            <Plus size={14} />
            Crear nuevo
            <ChevronDown size={12} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Atención clínica</DropdownMenuLabel>
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/encounters">
                <ClipboardPlus size={14} />
                Atención
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link search={{ documentary: true, patientId }} to="/encounters">
                <ClipboardList size={14} />
                Actualización documental
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/appointments">
                <Calendar size={14} />
                Cita
              </Link>
            }
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Órdenes y prescripciones</DropdownMenuLabel>
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/medication-orders">
                <Pill size={14} />
                Prescripción
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/service-requests">
                <FlaskConical size={14} />
                Orden de servicio
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/incapacity-certificates">
                <FileCheck size={14} />
                Incapacidad
              </Link>
            }
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Documentación</DropdownMenuLabel>
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/clinical-documents">
                <FileText size={14} />
                Documento clínico
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link search={{ patientId }} to="/consents">
                <ShieldCheck size={14} />
                Consentimiento
              </Link>
            }
          />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildPatientDescription(patient: Patient): string {
  const docTypeLabel =
    DOC_TYPE_LABELS[patient.primaryDocumentType] ?? patient.primaryDocumentType;
  const sexLabel =
    SEX_AT_BIRTH_LABELS[patient.sexAtBirth] ?? patient.sexAtBirth;
  const age = formatAge(patient.birthDate);
  return `${docTypeLabel} ${patient.primaryDocumentNumber} · ${age} · ${sexLabel}`;
}

function PatientDetailPage() {
  const { patientId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/patients/$patientId" });
  const [editing, setEditing] = useState(false);

  const activeTab: PatientTabId = search.tab ?? DEFAULT_TAB;

  function setTab(tabId: string) {
    if (isPatientTabId(tabId)) {
      navigate({
        search: (prev) => ({ ...prev, tab: tabId }),
        replace: true,
      });
    }
  }

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
              <PatientCreateActions patientId={patient.id} />
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
        description={
          patient
            ? buildPatientDescription(patient)
            : "Información clínica y atenciones del paciente"
        }
        icon={User}
        iconBgClass="bg-teal-100 text-teal-600"
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
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : patient ? (
        <>
          {patient.deceasedAt && (
            <DeceasedBanner deceasedAt={patient.deceasedAt} />
          )}

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

          <div className="px-6">
            <Tabs onValueChange={(v) => setTab(v as string)} value={activeTab}>
              <TabsList className="mb-3 w-full justify-start overflow-x-auto">
                {PATIENT_TABS.map((tab) => (
                  <TabsTab key={tab.id} value={tab.id}>
                    <tab.icon size={14} />
                    {tab.label}
                  </TabsTab>
                ))}
              </TabsList>

              <TabsPanel value="timeline">
                <PatientTimeline patientId={patientId} />
              </TabsPanel>

              <TabsPanel value="encounters">
                <EncountersSection patientId={patientId} />
              </TabsPanel>

              <TabsPanel value="documents">
                <PatientDocumentsSection patientId={patientId} />
              </TabsPanel>

              <TabsPanel value="admin">
                <div className="space-y-4">
                  <ContactsSection patientId={patientId} />
                  <CoverageSection patientId={patientId} />
                  <IdentifiersSection patientId={patientId} />
                </div>
              </TabsPanel>
            </Tabs>
          </div>
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
