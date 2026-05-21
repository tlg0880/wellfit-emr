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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@wellfit-emr/ui/components/select";
import {
  Eye,
  FilterX,
  Pill,
  Plus,
  Search,
  Syringe,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";

const TRAILING_ZERO_DECIMALS_REGEX = /\.?0+$/;

const searchSchema = z.object({
  encounterId: z.string().optional(),
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/medication-orders/")({
  component: MedicationOrdersListPage,
  validateSearch: searchSchema,
});

const medicationOrderSchema = z.object({
  patientId: z.string().min(1, "Requerido"),
  encounterId: z.string().min(1, "Requerido"),
  prescriberId: z.string().min(1, "Requerido"),
  diagnosisId: z.string().nullable(),
  genericName: z.string().min(1, "Requerido"),
  concentration: z.string().min(1, "Requerido"),
  dosageForm: z.string().min(1, "Requerido"),
  dose: z.string().min(1, "Requerido"),
  doseUnit: z.string(),
  routeCode: z.string().min(1, "Requerido"),
  frequencyText: z.string().min(1, "Requerido"),
  durationText: z.string().min(1, "Requerido"),
  quantityTotal: z.string().min(1, "Requerido"),
  indications: z.string(),
  signedAt: z.string().min(1, "Requerido"),
  atcCode: z.string().nullable(),
});

function CreateMedicationOrderForm({
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
  const [prescriberSearch, setPrescriberSearch] = useState("");
  const [cumSearch, setCumSearch] = useState("");
  const [selectedCumCode, setSelectedCumCode] = useState("");
  const [ffmSearch, setFfmSearch] = useState("");
  const [ummSearch, setUmmSearch] = useState("");

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

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: prescriberSearch || undefined,
      },
    })
  );

  const { data: cumData, isLoading: cumLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "CatalogoCUMs",
        limit: 20,
        search: cumSearch || undefined,
      },
    })
  );

  const { data: selectedCumData } = useQuery({
    ...orpc.ripsReference.getEntry.queryOptions({
      input: { tableName: "CatalogoCUMs", code: selectedCumCode },
    }),
    enabled: !!selectedCumCode,
  });

  const { data: ffmData, isLoading: ffmLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "FFM",
        limit: 20,
        search: ffmSearch || undefined,
      },
    })
  );

  const { data: ummData, isLoading: ummLoading } = useQuery(
    orpc.ripsReference.listEntries.queryOptions({
      input: {
        tableName: "UMM",
        limit: 20,
        search: ummSearch || undefined,
      },
    })
  );

  const create = useMutation({
    ...orpc.medicationOrders.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Prescripción creada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear prescripción");
    },
  });

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

  const form = useForm({
    defaultValues: {
      patientId: defaultPatientId ?? "",
      encounterId: defaultEncounterId ?? "",
      prescriberId: "",
      diagnosisId: null as string | null,
      genericName: "",
      concentration: "",
      dosageForm: "",
      dose: "",
      doseUnit: "",
      routeCode: "",
      frequencyText: "",
      durationText: "",
      quantityTotal: "",
      indications: "",
      signedAt: new Date().toISOString().slice(0, 16),
      atcCode: null as string | null,
    },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({
        patientId: value.patientId,
        encounterId: value.encounterId,
        prescriberId: value.prescriberId,
        diagnosisId: value.diagnosisId,
        genericName: value.genericName,
        concentration: value.concentration,
        dosageForm: value.dosageForm,
        dose: value.dose,
        doseUnit: value.doseUnit || null,
        routeCode: value.routeCode,
        frequencyText: value.frequencyText,
        durationText: value.durationText,
        quantityTotal: value.quantityTotal,
        indications: value.indications || null,
        status: "active",
        signedAt: new Date(value.signedAt),
        atcCode: value.atcCode,
        validUntil: null,
      });
    },
    validators: {
      onSubmit: medicationOrderSchema,
    },
  });

  useEffect(() => {
    if (selectedCumData?.extraData) {
      const extra = selectedCumData.extraData;
      const concentrationRaw = extra.Extra_VI
        ? String(extra.Extra_VI).replace(TRAILING_ZERO_DECIMALS_REGEX, "")
        : "";
      form.setFieldValue(
        "genericName",
        extra.Extra_III || selectedCumData.name
      );
      form.setFieldValue(
        "concentration",
        concentrationRaw ? `${concentrationRaw} mg` : ""
      );
      form.setFieldValue("routeCode", extra.Extra_VIII || "");
      form.setFieldValue("atcCode", extra.Extra_II || null);
    }
  }, [selectedCumData, form]);

  const [selectedEncounterId, setSelectedEncounterId] = useState(
    defaultEncounterId ?? ""
  );

  const { data: diagnosesData } = useQuery({
    ...orpc.clinicalRecords.listDiagnoses.queryOptions({
      input: { encounterId: selectedEncounterId },
    }),
    enabled: !!selectedEncounterId,
  });

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nueva prescripción</CardTitle>
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
                  onChange={(v) => {
                    field.handleChange(v);
                    setSelectedEncounterId(v);
                  }}
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

          <form.Field name="prescriberId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Prescriptor *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar profesionales"
                  loading={practitionersLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setPrescriberSearch}
                  options={
                    practitionersData?.practitioners.map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      description: p.documentNumber,
                    })) ?? []
                  }
                  placeholder="Buscar profesional..."
                  required
                  search={prescriberSearch}
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

          <form.Field name="diagnosisId">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Diagnóstico *</Label>
                <Select
                  onValueChange={(v) =>
                    field.handleChange(
                      (v as string) === "__none__" ? null : (v as string)
                    )
                  }
                  value={field.state.value ?? "__none__"}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Seleccionar diagnóstico..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin diagnóstico</SelectItem>
                    {diagnosesData?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.description} ({d.code})
                      </SelectItem>
                    ))}
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

          <div className="space-y-1 md:col-span-3">
            <Label>Medicamento (CUM)</Label>
            <SearchSelect
              clearable
              emptyMessage="Escribe para buscar en catálogo CUMs"
              loading={cumLoading}
              onChange={(v) => {
                setSelectedCumCode(v);
              }}
              onSearchChange={setCumSearch}
              options={
                cumData?.entries.map((e) => ({
                  value: e.code,
                  label: e.name,
                  description: e.code,
                })) ?? []
              }
              placeholder="Buscar medicamento por nombre o CUM..."
              search={cumSearch}
              value={selectedCumCode}
            />
          </div>

          <form.Field name="genericName">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Nombre genérico (DCI) *</Label>
                <Input
                  autoFocus
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

          <form.Field name="concentration">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Concentración *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: 500 mg"
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

          <form.Field name="dosageForm">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Forma farmacéutica *</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar en FFM"
                  loading={ffmLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setFfmSearch}
                  options={
                    ffmData?.entries.map((e) => ({
                      value: e.name,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar forma farmacéutica..."
                  required
                  search={ffmSearch}
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

          <form.Field name="dose">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Dosis *</Label>
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

          <form.Field name="doseUnit">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Unidad dosis</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar en UMM"
                  loading={ummLoading}
                  onChange={(v) => field.handleChange(v)}
                  onSearchChange={setUmmSearch}
                  options={
                    ummData?.entries.map((e) => ({
                      value: e.name,
                      label: e.name,
                      description: e.code,
                    })) ?? []
                  }
                  placeholder="Buscar unidad..."
                  search={ummSearch}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="routeCode">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Vía *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: oral"
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

          <form.Field name="frequencyText">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Frecuencia *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: cada 8 horas"
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

          <form.Field name="durationText">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Duración *</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ej: 7 días"
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

          <form.Field name="quantityTotal">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Cantidad total *</Label>
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

          <form.Field name="indications">
            {(field) => (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor={field.name}>Indicaciones</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
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
                  {isSubmitting ? "Guardando..." : "Guardar prescripción"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MedicationOrderRowActions({
  row,
}: {
  row: {
    id: string;
  };
}) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <Button
        aria-label="Registrar administración"
        onClick={() => setShowModal(true)}
        size="icon-xs"
        variant="ghost"
      >
        <Syringe size={14} />
      </Button>
      {showModal && (
        <MedicationAdministrationModal
          medicationOrderId={row.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* ─── Medication Administration Modal ─── */

function MedicationAdministrationModal({
  medicationOrderId,
  onClose,
}: {
  medicationOrderId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const [practitionerSearch, setPractitionerSearch] = useState("");

  const { data: practitionersData, isLoading: practitionersLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: practitionerSearch || undefined,
      },
    })
  );

  const { data: administrationsData, isLoading: administrationsLoading } =
    useQuery(
      orpc.medicationOrders.listAdministrations.queryOptions({
        input: {
          medicationOrderId,
          limit: 25,
          offset: 0,
          sortDirection: "desc",
        },
      })
    );

  const createAdministration = useMutation({
    ...orpc.medicationOrders.createAdministration.mutationOptions(),
    onSuccess: () => {
      toast.success("Administración registrada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.listAdministrations.key({
          type: "query",
        }),
      });
      adminForm.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar administración");
    },
  });

  const adminForm = useForm({
    defaultValues: {
      status: "completed",
      administeredAt: new Date().toISOString().slice(0, 16),
      administeredBy: "",
      doseAdministered: "",
      reasonNotAdministered: "",
    },
    onSubmit: async ({ value }) => {
      await createAdministration.mutateAsync({
        medicationOrderId,
        administeredAt: new Date(value.administeredAt),
        administeredBy: value.administeredBy,
        doseAdministered: value.doseAdministered || null,
        reasonNotAdministered:
          value.status === "not-given"
            ? value.reasonNotAdministered || null
            : null,
        status: value.status,
      });
    },
    validators: {
      onSubmit: z.object({
        status: z.string().min(1, "Requerido"),
        administeredAt: z.string().min(1, "Requerido"),
        administeredBy: z.string().min(1, "Requerido"),
        doseAdministered: z.string(),
        reasonNotAdministered: z.string(),
      }),
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
    >
      <Card className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Administración de medicamento</CardTitle>
          <Button
            aria-label="Cerrar"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {administrationsLoading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : administrationsData && administrationsData.items.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Administraciones previas
              </p>
              <div className="border">
                {administrationsData.items.map((admin) => (
                  <div
                    className="flex items-center justify-between border-b px-3 py-2 text-xs last:border-b-0"
                    key={admin.id}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex border px-1.5 py-0.5 text-[10px] ${
                          admin.status === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : admin.status === "not-given"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {admin.status === "completed"
                          ? "Administrado"
                          : admin.status === "not-given"
                            ? "No administrado"
                            : admin.status}
                      </span>
                      <span>
                        {new Date(admin.administeredAt).toLocaleString("es-CO")}
                      </span>
                    </div>
                    {admin.doseAdministered && (
                      <span className="text-muted-foreground">
                        {admin.doseAdministered}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No hay administraciones registradas para esta orden.
            </p>
          )}

          <div className="border-t pt-4">
            <p className="mb-3 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              Registrar nueva administración
            </p>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                adminForm.handleSubmit();
              }}
            >
              <adminForm.Field name="status">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Estado *</Label>
                    <Select
                      onValueChange={(v) => field.handleChange(v as string)}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Administrado</SelectItem>
                        <SelectItem value="not-given">
                          No administrado
                        </SelectItem>
                        <SelectItem value="entered-in-error">
                          Error de registro
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </adminForm.Field>

              <adminForm.Field name="administeredAt">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Fecha y hora *</Label>
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
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </adminForm.Field>

              <adminForm.Field name="administeredBy">
                {(field) => (
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor={field.name}>Administrado por *</Label>
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
                      <p
                        className="text-destructive text-xs"
                        key={String(error)}
                      >
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </adminForm.Field>

              <adminForm.Field name="doseAdministered">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Dosis administrada</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej: 500 mg"
                      value={field.state.value}
                    />
                  </div>
                )}
              </adminForm.Field>

              <adminForm.Field name="reasonNotAdministered">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Razón si no administrado</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej: paciente rechazó, alergia..."
                      value={field.state.value}
                    />
                  </div>
                )}
              </adminForm.Field>

              <div className="flex items-end justify-end gap-2 md:col-span-2">
                <adminForm.Subscribe
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
                      {isSubmitting
                        ? "Guardando..."
                        : "Registrar administración"}
                    </Button>
                  )}
                </adminForm.Subscribe>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MedicationOrdersListPage() {
  const navigate = useNavigate();
  const { encounterId: defaultEncounterId, patientId: defaultPatientId } =
    useSearch({
      from: "/_authenticated/medication-orders/",
    });
  const [encounterId, setEncounterId] = useState(defaultEncounterId ?? "");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [queryEncounterSearch, setQueryEncounterSearch] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [queryPatientSearch, setQueryPatientSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(
    !!(defaultEncounterId || defaultPatientId)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEncounterSearch(encounterSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [encounterSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryPatientSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    document.title = "Prescripciones | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryEncounterSearch || undefined,
      },
    })
  );

  const { data: patientsData, isLoading: patientsLoading } = useQuery(
    orpc.patients.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: queryPatientSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.medicationOrders.list.queryOptions({
      input: {
        limit,
        offset,
        encounterId: encounterId || undefined,
        patientId: patientId || undefined,
        sortDirection: "desc",
      },
    })
  );

  const deleteMutation = useMutation({
    ...orpc.medicationOrders.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Prescripción eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.medicationOrders.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar prescripción");
    },
  });

  const columns = [
    {
      header: "Medicamento",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <Pill size={14} />
          {row.genericName}
        </span>
      ),
    },
    {
      header: "Concentración",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.concentration,
    },
    {
      header: "Vía",
      accessor: (row: NonNullable<typeof data>["items"][0]) => row.routeCode,
    },
    {
      header: "Frecuencia",
      accessor: (row: NonNullable<typeof data>["items"][0]) =>
        row.frequencyText,
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["items"][0]) => (
        <span
          className={`inline-flex border px-1.5 py-0.5 font-medium text-[10px] ${
            row.status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {row.status}
        </span>
      ),
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
          <MedicationOrderRowActions row={row} />
          <Link
            aria-label="Ver prescripción"
            className="inline-flex text-muted-foreground hover:text-foreground"
            params={{ orderId: row.id }}
            to="/medication-orders/$orderId"
          >
            <Eye size={14} />
          </Link>
          <Button
            aria-label="Eliminar prescripción"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta prescripción permanentemente?")) {
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

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={() => setShowForm((s) => !s)} size="sm">
            <Plus size={14} />
            {showForm ? "Cancelar" : "Nueva prescripción"}
          </Button>
        }
        description="Órdenes de medicamentos con denominación común internacional"
        icon={Pill}
        iconBgClass="bg-teal-50 text-teal-600"
        title="Prescripciones"
      />

      {showForm && (
        <CreateMedicationOrderForm
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
          {(encounterId || patientId) && (
            <Button
              onClick={() => {
                setEncounterId("");
                setEncounterSearch("");
                setPatientId("");
                setPatientSearch("");
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
            encounterId || patientId
              ? "Ninguna prescripción coincide con los filtros aplicados."
              : "No se encontraron prescripciones."
          }
          emptyTitle={
            encounterId || patientId ? "Sin resultados" : "Sin prescripciones"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/medication-orders/$orderId",
              params: { orderId: row.id },
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
