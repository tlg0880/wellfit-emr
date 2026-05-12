import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { calculateAge } from "@/utils/age";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/patients/")({
  component: PatientsListPage,
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

const createPatientSchema = z.object({
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

interface PatientRow {
  birthDate: Date | string;
  countryCode: string | null;
  createdAt: Date | string;
  deceasedAt: Date | string | null;
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
  updatedAt: Date | string;
  zoneCode: string | null;
}

function PatientForm({
  onCancel,
  editingId,
  initialValues,
}: {
  onCancel: () => void;
  editingId?: string;
  initialValues?: PatientRow;
}) {
  const [countrySearch, setCountrySearch] = useState("");
  const [municipalitySearch, setMunicipalitySearch] = useState("");

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

  const createMutation = useMutation({
    ...orpc.patients.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Paciente creado correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.patients.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear paciente");
    },
  });

  const updateMutation = useMutation({
    ...orpc.patients.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Paciente actualizado");
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
      primaryDocumentType: initialValues?.primaryDocumentType ?? "",
      primaryDocumentNumber: initialValues?.primaryDocumentNumber ?? "",
      firstName: initialValues?.firstName ?? "",
      middleName: initialValues?.middleName ?? "",
      lastName1: initialValues?.lastName1 ?? "",
      lastName2: initialValues?.lastName2 ?? "",
      birthDate: initialValues?.birthDate
        ? new Date(initialValues.birthDate).toISOString().slice(0, 10)
        : "",
      sexAtBirth: initialValues?.sexAtBirth ?? "",
      genderIdentity: initialValues?.genderIdentity ?? "",
      countryCode: initialValues?.countryCode ?? "",
      municipalityCode: initialValues?.municipalityCode ?? "",
      zoneCode: initialValues?.zoneCode ?? "",
      deceasedAt: initialValues?.deceasedAt
        ? new Date(initialValues.deceasedAt).toISOString().slice(0, 16)
        : "",
    },
    onSubmit: async ({ value }) => {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
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
      } else {
        await createMutation.mutateAsync({
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
      }
    },
    validators: {
      onSubmit: createPatientSchema,
    },
  });

  const fieldGrid = "space-y-1";

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>
          {editingId ? "Editar paciente" : "Nuevo paciente"}
        </CardTitle>
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
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar"
                      : "Guardar"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PatientsListPage() {
  const navigate = useNavigate({ from: "/patients/" });
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [sortBy, setSortBy] = useState<
    "createdAt" | "birthDate" | "firstName" | "lastName1"
  >("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);

  useEffect(() => {
    document.title = "Pacientes | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit,
        offset,
        search: querySearch || undefined,
        sortBy,
        sortDirection,
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.patients.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Paciente eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.patients.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar paciente");
    },
  });

  const columns = [
    {
      header: "Nombre completo",
      accessor: (row: {
        firstName: string;
        middleName: string | null;
        lastName1: string;
        lastName2: string | null;
        deceasedAt: Date | string | null;
      }) => (
        <span className="inline-flex items-center gap-1.5">
          {row.firstName}
          {row.middleName ? ` ${row.middleName}` : ""} {row.lastName1}
          {row.lastName2 ? ` ${row.lastName2}` : ""}
          {row.deceasedAt && (
            <span className="inline-flex border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[10px] text-red-700">
              Fallecido
            </span>
          )}
        </span>
      ),
    },
    {
      header: "Documento",
      accessor: (row: {
        primaryDocumentType: string;
        primaryDocumentNumber: string;
      }) => `${row.primaryDocumentType} ${row.primaryDocumentNumber}`,
    },
    {
      header: "Fecha nacimiento",
      accessor: (row: { birthDate: Date }) =>
        new Date(row.birthDate).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      header: "Edad",
      accessor: (row: { birthDate: Date }) => (
        <span className="tabular-nums">{calculateAge(row.birthDate)}</span>
      ),
    },
    {
      header: "Sexo",
      accessor: (row: { sexAtBirth: string }) => row.sexAtBirth,
    },
    {
      header: "Acciones",
      accessor: (row: { id: string }) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Ver paciente"
            onClick={() =>
              navigate({
                to: "/patients/$patientId",
                params: { patientId: row.id },
              })
            }
            size="icon-xs"
            variant="ghost"
          >
            <Eye size={14} />
          </Button>
          <Button
            aria-label="Editar paciente"
            onClick={() => {
              setEditingPatient(row as PatientRow);
              setShowForm(true);
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar paciente"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este paciente permanentemente?")) {
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
      className: "w-24",
    },
  ];

  function handleCancelForm() {
    setShowForm(false);
    setEditingPatient(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setShowForm(true);
              }
            }}
            size="sm"
          >
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nuevo paciente"}
          </Button>
        }
        description="Gestión de pacientes del sistema"
        title="Pacientes"
      />

      {showForm && (
        <PatientForm
          editingId={editingPatient?.id}
          initialValues={editingPatient ?? undefined}
          key={editingPatient?.id || "new"}
          onCancel={handleCancelForm}
        />
      )}

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Search className="text-muted-foreground" size={14} />
          <Input
            className="h-7 max-w-xs text-xs"
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Buscar por nombre o documento..."
            value={search}
          />
          {search && (
            <Button
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setSearch("");
                setOffset(0);
              }}
              size="icon-xs"
              variant="ghost"
            >
              <X size={12} />
            </Button>
          )}
          <Select
            onValueChange={(v) => {
              setSortBy(v as typeof sortBy);
              setOffset(0);
            }}
            value={sortBy}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Creación</SelectItem>
              <SelectItem value="firstName">Nombre</SelectItem>
              <SelectItem value="lastName1">Apellido</SelectItem>
              <SelectItem value="birthDate">Nacimiento</SelectItem>
            </SelectContent>
          </Select>
          <Button
            aria-label={
              sortDirection === "asc"
                ? "Ordenar descendente"
                : "Ordenar ascendente"
            }
            onClick={() => {
              setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
              setOffset(0);
            }}
            size="icon-xs"
            variant="ghost"
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={data?.patients ?? []}
          emptyDescription={
            querySearch
              ? "Ningún paciente coincide con la búsqueda."
              : "No se encontraron pacientes registrados."
          }
          emptyTitle={querySearch ? "Sin resultados" : "No hay pacientes"}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) =>
            navigate({
              to: "/patients/$patientId",
              params: { patientId: row.id },
            })
          }
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
      </div>
    </div>
  );
}
