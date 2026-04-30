import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { Pill, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const TRAILING_ZERO_DECIMALS_REGEX = /\.?0+$/;

export const Route = createFileRoute("/_authenticated/medication-orders/")({
  component: MedicationOrdersListPage,
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

const medicationOrderSchema = z.object({
  patientId: z.string().min(1, "Requerido"),
  encounterId: z.string().min(1, "Requerido"),
  prescriberId: z.string().min(1, "Requerido"),
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

function CreateMedicationOrderForm({ onCancel }: { onCancel: () => void }) {
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

  const form = useForm({
    defaultValues: {
      patientId: "",
      encounterId: "",
      prescriberId: "",
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
        diagnosisId: null,
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
                <Label htmlFor={field.name}>Paciente</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar pacientes"
                  loading={patientsLoading}
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
                <Label htmlFor={field.name}>Atención</Label>
                <SearchSelect
                  emptyMessage="Escribe para buscar atenciones"
                  loading={encountersLoading}
                  onChange={(v) => field.handleChange(v)}
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
                <Label htmlFor={field.name}>Prescriptor</Label>
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
                <Label htmlFor={field.name}>Nombre genérico (DCI)</Label>
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

          <form.Field name="concentration">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Concentración</Label>
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
                <Label htmlFor={field.name}>Forma farmacéutica</Label>
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
                <Label htmlFor={field.name}>Dosis</Label>
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
                <Label htmlFor={field.name}>Vía</Label>
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
                <Label htmlFor={field.name}>Frecuencia</Label>
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
                <Label htmlFor={field.name}>Duración</Label>
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
                <Label htmlFor={field.name}>Cantidad total</Label>
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
                <Label htmlFor={field.name}>Fecha firma</Label>
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

function MedicationOrdersListPage() {
  const [encounterId, setEncounterId] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);

  const { data: encountersData, isLoading: encountersLoading } = useQuery(
    orpc.encounters.list.queryOptions({
      input: {
        limit: 20,
        offset: 0,
        search: encounterSearch || undefined,
      },
    })
  );

  const { data, isLoading } = useQuery(
    orpc.medicationOrders.list.queryOptions({
      input: {
        limit,
        offset,
        encounterId: encounterId || undefined,
        sortDirection: "desc",
      },
    })
  );

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
        title="Prescripciones"
      />

      {showForm && (
        <CreateMedicationOrderForm onCancel={() => setShowForm(false)} />
      )}

      <div className="px-6">
        <div className="mb-3 flex items-center gap-2">
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
                description: new Date(e.startedAt).toLocaleDateString("es-CO"),
              })) ?? []
            }
            placeholder="Filtrar por atención..."
            search={encounterSearch}
            value={encounterId}
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          emptyDescription="No se encontraron prescripciones."
          emptyTitle="Sin prescripciones"
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
