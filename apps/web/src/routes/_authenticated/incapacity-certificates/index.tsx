import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
  ClipboardList,
  Eye,
  FilterX,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const searchSchema = z.object({
  encounterId: z.string().optional(),
  patientId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/incapacity-certificates/"
)({
  component: IncapacityCertificatesListPage,
  validateSearch: searchSchema,
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

const incapacitySchema = z
  .object({
    patientId: z.string().min(1, "Requerido"),
    encounterId: z.string().min(1, "Requerido"),
    issuedBy: z.string().min(1, "Requerido"),
    conceptText: z.string().min(1, "Requerido"),
    destinationEntity: z.string(),
    startDate: z.string().min(1, "Requerido"),
    endDate: z.string().min(1, "Requerido"),
    issuedAt: z.string().min(1, "Requerido"),
    signedAt: z.string().min(1, "Requerido"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "La fecha fin debe ser mayor o igual a la fecha inicio",
    path: ["endDate"],
  });

function CreateIncapacityForm({
  onCancel,
  defaultPatientId,
  defaultEncounterId,
}: {
  onCancel: () => void;
  defaultPatientId?: string;
  defaultEncounterId?: string;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [practitionerSearch, setPractitionerSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const { data: defaultPatientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: defaultPatientId ?? "" },
    }),
    enabled: !!defaultPatientId,
  });

  const { data: defaultEncounterData } = useQuery({
    ...orpc.encounters.get.queryOptions({
      input: { id: defaultEncounterId ?? "" },
    }),
    enabled: !!defaultEncounterId,
  });

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.incapacityCertificates.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Incapacidad registrada");
      queryClient.invalidateQueries({
        queryKey: orpc.incapacityCertificates.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar incapacidad");
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: defaultPatientId ?? "",
      encounterId: defaultEncounterId ?? "",
      issuedBy: "",
      conceptText: "",
      destinationEntity: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      issuedAt: new Date().toISOString().slice(0, 16),
      signedAt: new Date().toISOString().slice(0, 16),
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        patientId: value.patientId,
        encounterId: value.encounterId,
        issuedBy: value.issuedBy,
        conceptText: value.conceptText,
        destinationEntity: value.destinationEntity || null,
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        issuedAt: new Date(value.issuedAt),
        signedAt: new Date(value.signedAt),
      });
    },
    validators: {
      onSubmit: incapacitySchema,
    },
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva incapacidad / certificado</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="patientId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Paciente *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar pacientes"
                  loading={patientsLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPatientSearch}
                  options={[
                    ...(defaultPatientData && defaultPatientId
                      ? [
                          {
                            value: defaultPatientData.id,
                            label: `${defaultPatientData.firstName} ${defaultPatientData.lastName1}`,
                            description: `${defaultPatientData.primaryDocumentType} ${defaultPatientData.primaryDocumentNumber}`,
                          },
                        ]
                      : []),
                    ...(patientsData?.patients ?? [])
                      .filter((p) => p.id !== defaultPatientId)
                      .map((p) => ({
                        value: p.id,
                        label: `${p.firstName} ${p.lastName1}`,
                        description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                      })),
                  ]}
                  placeholder="Buscar paciente..."
                  required
                  search={patientSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="encounterId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Atención *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar atenciones"
                  loading={encountersLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setEncounterSearch}
                  options={[
                    ...(defaultEncounterData && defaultEncounterId
                      ? [
                          {
                            value: defaultEncounterData.id,
                            label:
                              defaultEncounterData.reasonForVisit ||
                              "Sin motivo",
                            description: new Date(
                              defaultEncounterData.startedAt
                            ).toLocaleDateString("es-CO"),
                          },
                        ]
                      : []),
                    ...(encountersData?.encounters ?? [])
                      .filter((e) => e.id !== defaultEncounterId)
                      .map((e) => ({
                        value: e.id,
                        label: e.reasonForVisit || "Sin motivo",
                        description: new Date(e.startedAt).toLocaleDateString(
                          "es-CO"
                        ),
                      })),
                  ]}
                  placeholder="Buscar atención..."
                  required
                  search={encounterSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="issuedBy">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Emitido por *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar profesionales"
                  loading={practitionersLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPractitionerSearch}
                  options={
                    practitionersData?.practitioners.map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      description: p.documentNumber,
                    })) ?? []
                  }
                  placeholder="Buscar profesional..."
                  required
                  search={practitionerSearch}
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="conceptText">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Concepto / diagnóstico *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="destinationEntity">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Entidad destino</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: EPS"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="startDate">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha inicio *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="date"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="endDate">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha fin *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="date"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="issuedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha emisión *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="signedAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Fecha firma *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={String(error)}>
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <div className="flex items-end gap-2 md:col-span-3">
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
                  {isSubmitting ? "Guardando..." : "Guardar incapacidad"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function IncapacityCertificatesListPage() {
  const navigate = useNavigate();
  const { encounterId: defaultEncounterId, patientId: defaultPatientId } =
    useSearch({
      from: "/_authenticated/incapacity-certificates/",
    });
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [queryPatientSearch, setQueryPatientSearch] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [queryEncounterSearch, setQueryEncounterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(
    !!(defaultEncounterId || defaultPatientId)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryPatientSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEncounterSearch(encounterSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [encounterSearch]);

  useEffect(() => {
    document.title = "Incapacidades | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryPatientSearch || undefined,
      },
    })
  );

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEncounterSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.incapacityCertificates.list.queryOptions({
      input: {
        limit,
        offset,
        patientId: patientId || undefined,
        encounterId: encounterId || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.incapacityCertificates.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Incapacidad eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.incapacityCertificates.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar incapacidad");
    },
  });

  const columns = [
    {
      header: "Concepto",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={14} />
          {row.conceptText}
        </span>
      ),
    },
    {
      header: "Destino",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.destinationEntity ?? "—",
    },
    {
      header: "Inicio",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.startDate).toLocaleDateString("es-CO"),
    },
    {
      header: "Fin",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.endDate).toLocaleDateString("es-CO"),
    },
    {
      header: "Firmado",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        new Date(row.signedAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <div className="flex items-center gap-1">
          <Link
            aria-label="Ver incapacidad"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ certificateId: row.id }}
            to="/incapacity-certificates/$certificateId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar incapacidad"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta incapacidad permanentemente?")) {
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
      className: "w-20",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nueva incapacidad"}
          </Button>
        }
        description="Certificados de incapacidad médica"
        icon={ClipboardList}
        iconBgClass="bg-amber-100 text-amber-600"
        title="Incapacidades"
      />

      {showForm && (
        <CreateIncapacityForm
          defaultEncounterId={defaultEncounterId}
          defaultPatientId={defaultPatientId}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <SearchSelect
              className="max-w-xs"
              clearable
              emptyMessage="Escribe para buscar pacientes"
              loading={patientsLoading}
              onChange={(v) => {
                setPatientId(v);
                setOffset(0);
              }}
              onSearchChange={setPatientSearch}
              options={
                patientsData?.patients.map((p) => ({
                  value: p.id,
                  label: `${p.firstName} ${p.lastName1}`,
                  description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                })) ?? []
              }
              placeholder="Filtrar por paciente..."
              search={patientSearch}
              value={patientId}
            />
          </div>
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <SearchSelect
              className="max-w-xs"
              clearable
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => {
                setEncounterId(v);
                setOffset(0);
              }}
              onSearchChange={setEncounterSearch}
              options={
                encountersData?.encounters.map((e) => ({
                  value: e.id,
                  label: e.reasonForVisit || "Sin motivo",
                  description: new Date(e.startedAt).toLocaleDateString(
                    "es-CO"
                  ),
                })) ?? []
              }
              placeholder="Filtrar por atención..."
              search={encounterSearch}
              value={encounterId}
            />
          </div>
          {(patientId || encounterId) && (
            <Button
              onClick={() => {
                setPatientId("");
                setPatientSearch("");
                setEncounterId("");
                setEncounterSearch("");
                setOffset(0);
              }}
              size="sm"
              variant="ghost"
            >
              <FilterX size={14} />
              Limpiar filtros
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription={
            patientId || encounterId
              ? "Ninguna incapacidad coincide con los filtros aplicados."
              : "No se encontraron incapacidades registradas."
          }
          emptyTitle={
            patientId || encounterId ? "Sin resultados" : "Sin incapacidades"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/incapacity-certificates/$certificateId",
              params: { certificateId: row.id },
            });
          }}
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
