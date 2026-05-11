import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { ChevronRight, Plus, Search, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/encounters/")({
  component: EncountersPage,
});

const STATUS_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "En progreso", value: "in-progress" },
  { label: "Finalizadas", value: "finished" },
  { label: "Canceladas", value: "cancelled" },
];

const encounterSchema = z.object({
  patientId: z.string().min(1, "Paciente es obligatorio"),
  siteId: z.string().min(1, "Sede es obligatoria"),
  serviceUnitId: z.string().min(1, "Unidad de servicio es obligatoria"),
  encounterClass: z.string().min(1, "Clase de atención es obligatoria"),
  careModality: z.string().min(1, "Modalidad es obligatoria"),
  reasonForVisit: z.string().min(1, "Motivo de consulta es obligatorio"),
  startedAt: z.string().min(1, "Fecha de inicio es obligatoria"),
  admissionSource: z.string().optional(),
  causeExternalCode: z.string().optional(),
  finalidadConsultaCode: z.string().optional(),
  modalidadAtencionCode: z.string().optional(),
});

function PatientName({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    ...orpc.patients.get.queryOptions({ input: { id: patientId } }),
    enabled: !!patientId,
  });
  if (isLoading) {
    return <Skeleton className="h-3 w-20" />;
  }
  if (!data) {
    return (
      <span className="text-[10px] text-muted-foreground">{patientId}</span>
    );
  }
  return (
    <span>
      {data.firstName} {data.lastName1}
    </span>
  );
}

function CreateEncounterForm({ onCancel }: { onCancel: () => void }) {
  const queryClient = useQueryClient();

  const [patientSearch, setPatientSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [modalitySearch, setModalitySearch] = useState("");
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [causeSearch, setCauseSearch] = useState("");
  const [finalidadSearch, setFinalidadSearch] = useState("");

  const { data: patientsData } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: patientSearch || undefined,
      },
    })
  );

  const { data: sitesData } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: {
        limit: 50,
        offset: 0,
      },
    })
  );

  const { data: groupData, isLoading: groupLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "GrupoServicios",
        limit: 20,
        search: groupSearch || undefined,
      },
    })
  );

  const { data: modalityData, isLoading: modalityLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "ModalidadAtencion",
        limit: 20,
        search: modalitySearch || undefined,
      },
    })
  );

  const { data: admissionData, isLoading: admissionLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "ViaIngresoUsuario",
        limit: 20,
        search: admissionSearch || undefined,
      },
    })
  );

  const { data: causeData, isLoading: causeLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "RIPSCausaExternaVersion2",
        limit: 20,
        search: causeSearch || undefined,
      },
    })
  );

  const { data: finalidadData, isLoading: finalidadLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "RIPSFinalidadConsultaVersion2",
        limit: 20,
        search: finalidadSearch || undefined,
      },
    })
  );

  const createMutation = useMutation({
    ...orpc.encounters.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Atención creada correctamente");
      onCancel();
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al crear atención: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: "",
      siteId: "",
      serviceUnitId: "",
      encounterClass: "",
      careModality: "",
      reasonForVisit: "",
      startedAt: new Date().toISOString().slice(0, 16),
      admissionSource: "",
      causeExternalCode: "",
      finalidadConsultaCode: "",
      modalidadAtencionCode: "",
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        patientId: value.patientId,
        siteId: value.siteId,
        serviceUnitId: value.serviceUnitId,
        encounterClass: value.encounterClass,
        careModality: value.careModality,
        reasonForVisit: value.reasonForVisit,
        startedAt: new Date(value.startedAt),
        status: "in-progress",
        admissionSource: value.admissionSource || null,
        causeExternalCode: value.causeExternalCode || null,
        finalidadConsultaCode: value.finalidadConsultaCode || null,
        modalidadAtencionCode: value.modalidadAtencionCode || null,
        vidaCode: null,
        condicionDestinoCode: null,
      });
    },
    validators: {
      onSubmit: encounterSchema,
    },
  });

  const selectedSiteId = form.getFieldValue("siteId");

  const { data: serviceUnitsData } = useQuery({
    ...orpc.facilities.listServiceUnits.queryOptions({
      input: {
        limit: 50,
        offset: 0,
        siteId: selectedSiteId || undefined,
      },
    }),
    enabled: !!selectedSiteId,
  });

  const fieldGrid = "space-y-1";

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva atención</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="patientId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Paciente</Label>
                  <SearchSelect
                    emptyMessage="Escribe para buscar pacientes"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setPatientSearch}
                    options={
                      patientsData?.patients.map((p) => ({
                        value: p.id,
                        label: `${p.firstName} ${p.lastName1}`,
                        description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
                      })) ?? []
                    }
                    placeholder="Buscar paciente..."
                    search={patientSearch}
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

            <form.Field name="siteId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Sede</Label>
                  <select
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      form.setFieldValue("serviceUnitId", "");
                    }}
                    value={field.state.value}
                  >
                    <option value="">Seleccione sede</option>
                    {sitesData?.sites.map((s: (typeof sitesData.sites)[0]) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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

            <form.Field name="serviceUnitId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Unidad de servicio</Label>
                  <select
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50"
                    disabled={!(selectedSiteId && serviceUnitsData)}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  >
                    <option value="">
                      {selectedSiteId
                        ? serviceUnitsData?.serviceUnits.length === 0
                          ? "Sin unidades"
                          : "Seleccione unidad"
                        : "Seleccione sede primero"}
                    </option>
                    {serviceUnitsData?.serviceUnits.map(
                      (u: (typeof serviceUnitsData.serviceUnits)[0]) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      )
                    )}
                  </select>
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

            <form.Field name="encounterClass">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>
                    Clase de atención (grupo servicios)
                  </Label>
                  <SearchSelect
                    emptyMessage="Escribe para buscar grupo"
                    id={field.name}
                    loading={groupLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setGroupSearch}
                    options={
                      groupData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar grupo de servicios..."
                    search={groupSearch}
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

            <form.Field name="careModality">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Modalidad de atención</Label>
                  <SearchSelect
                    emptyMessage="Escribe para buscar modalidad"
                    id={field.name}
                    loading={modalityLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => {
                      field.handleChange(v);
                      const currentModalidad = form.getFieldValue(
                        "modalidadAtencionCode"
                      );
                      if (!currentModalidad) {
                        form.setFieldValue("modalidadAtencionCode", v);
                      }
                    }}
                    onSearchChange={setModalitySearch}
                    options={
                      modalityData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar modalidad..."
                    search={modalitySearch}
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

            <form.Field name="reasonForVisit">
              {(field) => (
                <div className={`${fieldGrid} md:col-span-2`}>
                  <Label htmlFor={field.name}>Motivo de consulta</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describa el motivo de consulta"
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

            <form.Field name="startedAt">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Fecha y hora de inicio</Label>
                  <Input
                    className="text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="datetime-local"
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

            <form.Field name="admissionSource">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Vía de ingreso (RIPS)</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id={field.name}
                    loading={admissionLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setAdmissionSearch}
                    options={
                      admissionData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar vía de ingreso..."
                    search={admissionSearch}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="causeExternalCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Causa externa (RIPS)</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id={field.name}
                    loading={causeLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setCauseSearch}
                    options={
                      causeData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar causa externa..."
                    search={causeSearch}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="finalidadConsultaCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Finalidad consulta (RIPS)</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar"
                    id={field.name}
                    loading={finalidadLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setFinalidadSearch}
                    options={
                      finalidadData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar finalidad..."
                    search={finalidadSearch}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="modalidadAtencionCode">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Modalidad atención (RIPS)</Label>
                  <SearchSelect
                    clearable
                    emptyMessage="Escribe para buscar modalidad"
                    id={field.name}
                    loading={modalityLoading}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => {
                      field.handleChange(v);
                      const currentCare = form.getFieldValue("careModality");
                      if (!currentCare) {
                        form.setFieldValue("careModality", v);
                      }
                    }}
                    onSearchChange={setModalitySearch}
                    options={
                      modalityData?.entries.map((e) => ({
                        value: e.code,
                        label: e.name,
                        description: e.code,
                      })) ?? []
                    }
                    placeholder="Buscar modalidad RIPS..."
                    search={modalitySearch}
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
                  {isSubmitting ? "Guardando..." : "Guardar atención"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EncountersPage() {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit,
        offset,
        search: search || undefined,
        status: status || undefined,
      },
    })
  );

  const columns = [
    {
      header: "Paciente",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <div className="flex items-center gap-2">
          <User className="text-muted-foreground" size={14} />
          <PatientName patientId={row.patientId} />
        </div>
      ),
    },
    {
      header: "Motivo de consulta",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <span className="font-medium">{row.reasonForVisit}</span>
      ),
    },
    {
      header: "Fecha inicio",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <span className="text-[10px]">
          {new Date(row.startedAt).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 text-[10px] ${
            row.status === "in-progress"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : row.status === "finished"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
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
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <Link
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          params={{ encounterId: row.id }}
          search={{ tab: undefined }}
          to="/encounters/$encounterId"
        >
          Ver <ChevronRight size={12} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nueva atención"}
          </Button>
        }
        description="Gestión de atenciones clínicas y registro de consultas"
        title="Atenciones"
      />

      {showForm && <CreateEncounterForm onCancel={() => setShowForm(false)} />}

      <div className="px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => {
                setStatus(opt.value);
                setOffset(0);
              }}
              size="xs"
              variant={status === opt.value ? "default" : "outline"}
            >
              {opt.label}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Search className="text-muted-foreground" size={14} />
            <Input
              className="h-7 w-48 text-xs"
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Buscar por motivo..."
              value={search}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.encounters ?? []}
          emptyDescription="Cree una nueva atención para comenzar."
          emptyTitle="No hay atenciones"
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
      </div>
    </div>
  );
}
