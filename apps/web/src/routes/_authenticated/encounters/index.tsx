import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  ClipboardList,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

const searchSchema = z.object({
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/encounters/")({
  component: EncountersPage,
  validateSearch: searchSchema,
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
  admissionSource: z.string(),
  causeExternalCode: z.string(),
  finalidadConsultaCode: z.string(),
  modalidadAtencionCode: z.string(),
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

interface EncounterRow {
  admissionSource: string | null;
  careModality: string;
  causeExternalCode: string | null;
  condicionDestinoCode: string | null;
  createdAt: Date | string;
  encounterClass: string;
  endedAt: Date | string | null;
  finalidadConsultaCode: string | null;
  id: string;
  modalidadAtencionCode: string | null;
  patientId: string;
  reasonForVisit: string;
  serviceUnitId: string;
  siteId: string;
  startedAt: Date | string;
  status: string;
  updatedAt: Date | string;
  vidaCode: string | null;
}

function EncounterForm({
  onCancel,
  defaultPatientId,
  editingId,
  initialValues,
}: {
  onCancel: () => void;
  defaultPatientId?: string;
  editingId?: string;
  initialValues?: EncounterRow;
}) {
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

  const { data: defaultPatientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: defaultPatientId ?? "" },
    }),
    enabled: !!defaultPatientId,
  });

  const { data: editingPatientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: initialValues?.patientId ?? "" },
    }),
    enabled:
      !!initialValues?.patientId &&
      initialValues.patientId !== defaultPatientId,
  });

  const defaultPatientOption =
    defaultPatientData && defaultPatientId
      ? {
          value: defaultPatientData.id,
          label: `${defaultPatientData.firstName} ${defaultPatientData.lastName1}`,
          description: `${defaultPatientData.primaryDocumentType} ${defaultPatientData.primaryDocumentNumber}`,
        }
      : null;

  const editingPatientOption =
    editingPatientData && initialValues?.patientId
      ? {
          value: editingPatientData.id,
          label: `${editingPatientData.firstName} ${editingPatientData.lastName1}`,
          description: `${editingPatientData.primaryDocumentType} ${editingPatientData.primaryDocumentNumber}`,
        }
      : null;

  const patientOptions = [
    ...(editingPatientOption ? [editingPatientOption] : []),
    ...(defaultPatientOption ? [defaultPatientOption] : []),
    ...(patientsData?.patients ?? [])
      .filter(
        (p) => p.id !== defaultPatientId && p.id !== initialValues?.patientId
      )
      .map((p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName1}`,
        description: `${p.primaryDocumentType} ${p.primaryDocumentNumber}`,
      })),
  ];

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

  const updateMutation = useMutation({
    ...orpc.encounters.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Atención actualizada");
      onCancel();
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar atención: ${error.message}`);
    },
  });

  const form = useForm({
    defaultValues: {
      patientId: initialValues?.patientId ?? defaultPatientId ?? "",
      siteId: initialValues?.siteId ?? "",
      serviceUnitId: initialValues?.serviceUnitId ?? "",
      encounterClass: initialValues?.encounterClass ?? "",
      careModality: initialValues?.careModality ?? "",
      reasonForVisit: initialValues?.reasonForVisit ?? "",
      startedAt: initialValues?.startedAt
        ? new Date(initialValues.startedAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      admissionSource: initialValues?.admissionSource ?? "",
      causeExternalCode: initialValues?.causeExternalCode ?? "",
      finalidadConsultaCode: initialValues?.finalidadConsultaCode ?? "",
      modalidadAtencionCode: initialValues?.modalidadAtencionCode ?? "",
    },
    onSubmit: async ({ value }) => {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          patientId: value.patientId,
          siteId: value.siteId,
          serviceUnitId: value.serviceUnitId,
          encounterClass: value.encounterClass,
          careModality: value.careModality,
          reasonForVisit: value.reasonForVisit,
          startedAt: new Date(value.startedAt),
          admissionSource: value.admissionSource || null,
          causeExternalCode: value.causeExternalCode || null,
          finalidadConsultaCode: value.finalidadConsultaCode || null,
          modalidadAtencionCode: value.modalidadAtencionCode || null,
        });
      } else {
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
      }
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
        <CardTitle>
          {editingId ? "Editar atención" : "Nueva atención"}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <form.Field name="patientId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Paciente *</Label>
                  <SearchSelect
                    emptyMessage="Escribe para buscar pacientes"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(v) => field.handleChange(v)}
                    onSearchChange={setPatientSearch}
                    options={patientOptions}
                    placeholder="Buscar paciente..."
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

            <form.Field name="siteId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Sede *</Label>
                  <Select
                    onValueChange={(v) => {
                      field.handleChange(v as string);
                      form.setFieldValue("serviceUnitId", "");
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Seleccione sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sitesData?.sites.map(
                        (s: (typeof sitesData.sites)[0]) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.map((error) => (
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="serviceUnitId">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Unidad de servicio *</Label>
                  <Select
                    disabled={!(selectedSiteId && serviceUnitsData)}
                    onValueChange={(v) => field.handleChange(v as string)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue
                        placeholder={
                          selectedSiteId
                            ? serviceUnitsData?.serviceUnits.length === 0
                              ? "Sin unidades"
                              : "Seleccione unidad"
                            : "Seleccione sede primero"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceUnitsData?.serviceUnits.map(
                        (u: (typeof serviceUnitsData.serviceUnits)[0]) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.map((error) => (
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="encounterClass">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>
                    Clase de atención (grupo servicios) *
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
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="careModality">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Modalidad de atención *</Label>
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
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="reasonForVisit">
              {(field) => (
                <div className={`${fieldGrid} md:col-span-2`}>
                  <Label htmlFor={field.name}>Motivo de consulta *</Label>
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
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="startedAt">
              {(field) => (
                <div className={fieldGrid}>
                  <Label htmlFor={field.name}>Fecha y hora de inicio *</Label>
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
                    <p className="text-destructive text-xs" key={String(error)}>
                      {String(error)}
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
                      ? "Actualizar atención"
                      : "Guardar atención"}
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
  const navigate = useNavigate();
  const { patientId } = useSearch({ from: "/_authenticated/encounters/" });
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [status, setStatus] = useState("");
  const [siteId, setSiteId] = useState("");
  const [showForm, setShowForm] = useState(!!patientId);
  const [editingEncounter, setEditingEncounter] = useState<EncounterRow | null>(
    null
  );

  useEffect(() => {
    document.title = "Atenciones | WellFit EMR";
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

  const { data: sitesData } = useQuery(
    orpc.facilities.listSites.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit,
        offset,
        search: querySearch || undefined,
        status: status || undefined,
        siteId: siteId || undefined,
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.encounters.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Atención eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.encounters.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar atención");
    },
  });

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
          className={`inline-flex items-center rounded-full border px-2.5 py-1 font-medium text-[11px] shadow-sm ${
            row.status === "in-progress"
              ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : row.status === "finished"
                ? "border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300"
                : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <span
            className={`mr-1.5 size-2 rounded-full ${
              row.status === "in-progress"
                ? "bg-amber-500"
                : row.status === "finished"
                  ? "bg-teal-500"
                  : "bg-slate-400"
            }`}
          />
          {row.status === "in-progress"
            ? "En progreso"
            : row.status === "finished"
              ? "Finalizada"
              : row.status}
        </span>
      ),
    },
    {
      header: "",
      accessor: (row: NonNullable<typeof data>["encounters"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            aria-label="Ver atención"
            className="hover:bg-teal-50 hover:text-teal-700"
            onClick={() => {
              navigate({
                params: { encounterId: row.id },
                search: { tab: undefined },
                to: "/encounters/$encounterId",
              });
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Eye size={14} />
          </Button>
          <Button
            aria-label="Editar atención"
            className="hover:bg-amber-50 hover:text-amber-700"
            onClick={() => {
              setEditingEncounter(row);
              setShowForm(true);
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil size={12} />
          </Button>
          <Button
            aria-label="Eliminar atención"
            className="hover:bg-red-50 hover:text-red-700"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta atención permanentemente?")) {
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
    setEditingEncounter(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button
            className="gap-1.5 shadow-md"
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setShowForm(true);
              }
            }}
            size="sm"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancelar" : "Nueva atención"}
          </Button>
        }
        description="Gestión de atenciones clínicas y registro de consultas"
        icon={ClipboardList}
        iconBgClass="bg-teal-50 text-teal-600"
        title="Atenciones"
      />

      {showForm && (
        <EncounterForm
          defaultPatientId={patientId}
          editingId={editingEncounter?.id}
          initialValues={editingEncounter ?? undefined}
          key={editingEncounter?.id || "new"}
          onCancel={handleCancelForm}
        />
      )}

      <div className="px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2.5 shadow-md">
          <div className="inline-flex items-center rounded-sm border bg-background p-0.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                className={`px-2.5 py-1 font-medium text-xs transition-colors ${
                  status === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={opt.value}
                onClick={() => {
                  setStatus(opt.value);
                  setOffset(0);
                }}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Select
            onValueChange={(v) => {
              setSiteId(v as string);
              setOffset(0);
            }}
            value={siteId}
          >
            <SelectTrigger className="h-8 w-44 bg-background text-xs">
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las sedes</SelectItem>
              {sitesData?.sites.map((s: { id: string; name: string }) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(status || siteId || search) && (
            <Button
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setStatus("");
                setSiteId("");
                setSearch("");
                setOffset(0);
              }}
              size="xs"
              variant="ghost"
            >
              <FilterX size={12} />
              Limpiar filtros
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-sm border bg-background px-2.5 py-1.5">
              <Search className="text-muted-foreground" size={14} />
              <Input
                className="h-6 w-48 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder="Buscar por motivo..."
                value={search}
              />
              {search && (
                <Button
                  aria-label="Limpiar búsqueda"
                  className="size-5"
                  onClick={() => {
                    setSearch("");
                    setOffset(0);
                  }}
                  size="icon-xs"
                  variant="ghost"
                >
                  <X size={10} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.encounters ?? []}
          emptyDescription={
            querySearch || status || siteId
              ? "Ninguna atención coincide con los filtros aplicados."
              : "Cree una nueva atención para comenzar."
          }
          emptyTitle={
            querySearch || status || siteId
              ? "Sin resultados"
              : "No hay atenciones"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/encounters/$encounterId",
              params: { encounterId: row.id },
              search: { tab: undefined },
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
