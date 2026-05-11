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
import { Eye, FileText, FilterX, PenLine, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

/* ─── helpers ─── */

const documentTypeLabels: Record<string, string> = {
  evolucion_medica: "Evolución médica",
  nota_enfermeria: "Nota de enfermería",
  consentimiento_informado: "Consentimiento informado",
  epicrisis: "Epicrisis",
  historia_clinica: "Historia clínica",
  informe_quirurgico: "Informe quirúrgico",
  orden_medica: "Orden médica",
  otros: "Otro documento",
};

function getDocumentTypeLabel(type: string): string {
  return documentTypeLabels[type] ?? type;
}

const documentStatusMap: Record<string, { label: string; colorClass: string }> =
  {
    draft: {
      label: "Borrador",
      colorClass: "border-amber-200 bg-amber-50 text-amber-700",
    },
    signed: {
      label: "Firmado",
      colorClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  };

function getStatusBadge(status: string): React.ReactNode {
  const mapped = documentStatusMap[status] ?? {
    label: status,
    colorClass: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${mapped.colorClass}`}
    >
      {mapped.label}
    </span>
  );
}

export const Route = createFileRoute("/_authenticated/clinical-documents/")({
  component: ClinicalDocumentsListPage,
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

function CreateDocumentForm({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    patientId: "",
    encounterId: "",
    documentType: "evolucion_medica",
    authorPractitionerId: "",
    payloadJson: "{}",
    textRendered: "",
    sectionCode: "subjective",
    sectionOrder: 1,
    sectionPayloadJson: "{}",
  });

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
    ...orpc.clinicalDocuments.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento clínico creado");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
      onCancel();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear documento");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let payloadJson: Record<string, unknown> = {};
    let sectionPayloadJson: Record<string, unknown> = {};
    try {
      payloadJson = JSON.parse(form.payloadJson);
      sectionPayloadJson = JSON.parse(form.sectionPayloadJson);
    } catch {
      toast.error("JSON inválido en payload o sección");
      return;
    }
    if (
      typeof payloadJson !== "object" ||
      payloadJson === null ||
      Array.isArray(payloadJson)
    ) {
      toast.error("Payload JSON debe ser un objeto");
      return;
    }
    if (
      typeof sectionPayloadJson !== "object" ||
      sectionPayloadJson === null ||
      Array.isArray(sectionPayloadJson)
    ) {
      toast.error("Payload de sección debe ser un objeto");
      return;
    }
    create.mutate({
      patientId: form.patientId,
      encounterId: form.encounterId,
      documentType: form.documentType,
      authorPractitionerId: form.authorPractitionerId,
      payloadJson,
      textRendered: form.textRendered || null,
      sections: [
        {
          sectionCode: form.sectionCode,
          sectionOrder: form.sectionOrder,
          sectionPayloadJson,
        },
      ],
    });
  }

  return (
    <Card className="mx-6">
      <CardHeader>
        <CardTitle>Nuevo documento clínico</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <Label>Paciente</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar pacientes"
              loading={patientsLoading}
              onChange={(v) => setForm((f) => ({ ...f, patientId: v }))}
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
              value={form.patientId}
            />
          </div>
          <div className="space-y-1">
            <Label>Atención</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => setForm((f) => ({ ...f, encounterId: v }))}
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
              value={form.encounterId}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de documento</Label>
            <select
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              onChange={(e) =>
                setForm({ ...form, documentType: e.target.value })
              }
              required
              value={form.documentType}
            >
              <option value="evolucion_medica">Evolución médica</option>
              <option value="nota_enfermeria">Nota de enfermería</option>
              <option value="epicrisis">Epicrisis</option>
              <option value="informe_quirurgico">Informe quirúrgico</option>
              <option value="orden_medica">Orden médica</option>
              <option value="consentimiento_informado">
                Consentimiento informado
              </option>
              <option value="historia_clinica">Historia clínica</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Autor</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar profesionales"
              loading={practitionersLoading}
              onChange={(v) =>
                setForm((f) => ({ ...f, authorPractitionerId: v }))
              }
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
              value={form.authorPractitionerId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Texto renderizado</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, textRendered: e.target.value })
              }
              value={form.textRendered}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Payload JSON</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, payloadJson: e.target.value })
              }
              value={form.payloadJson}
            />
          </div>
          <div className="space-y-1">
            <Label>Código de sección</Label>
            <select
              className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              onChange={(e) =>
                setForm({ ...form, sectionCode: e.target.value })
              }
              value={form.sectionCode}
            >
              <option value="subjective">Subjetivo</option>
              <option value="objective">Objetivo</option>
              <option value="assessment">Análisis / Evaluación</option>
              <option value="plan">Plan</option>
              <option value="evolucion">Evolución</option>
              <option value="nota">Nota</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Orden de sección</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, sectionOrder: Number(e.target.value) })
              }
              type="number"
              value={form.sectionOrder}
            />
          </div>
          <div className="space-y-1">
            <Label>Payload de sección (JSON)</Label>
            <Input
              onChange={(e) =>
                setForm({ ...form, sectionPayloadJson: e.target.value })
              }
              value={form.sectionPayloadJson}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <Button
              onClick={onCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={create.isPending} size="sm" type="submit">
              {create.isPending ? "Guardando..." : "Guardar documento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ClinicalDocumentsListPage() {
  const navigate = useNavigate({ from: "/clinical-documents/" });
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data, isLoading } = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: {
        limit,
        offset,
        sortDirection: "desc",
        status: statusFilter || undefined,
        patientId: typeFilter ? undefined : undefined,
      },
    })
  );

  const signMutation = useMutation({
    ...orpc.clinicalDocuments.sign.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento firmado");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al firmar");
    },
  });

  const filteredDocuments =
    typeFilter && data
      ? data.documents.filter((d) => d.documentType === typeFilter)
      : (data?.documents ?? []);

  const filteredTotal =
    typeFilter && data ? filteredDocuments.length : (data?.total ?? 0);

  const columns = [
    {
      header: "Tipo",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <span className="inline-flex items-center gap-1.5">
          <FileText size={14} />
          <span className="font-medium">
            {getDocumentTypeLabel(row.documentType)}
          </span>
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: NonNullable<typeof data>["documents"][0]) =>
        getStatusBadge(row.status),
    },
    {
      header: "Paciente",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <span
          className="text-[10px] text-muted-foreground"
          title={row.patientId}
        >
          {row.patientId.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: "Atención",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <span
          className="text-[10px] text-muted-foreground"
          title={row.encounterId}
        >
          {row.encounterId.slice(0, 8)}…
        </span>
      ),
    },
    {
      header: "Fecha creación",
      accessor: (row: NonNullable<typeof data>["documents"][0]) =>
        new Date(row.createdAt).toLocaleString("es-CO"),
    },
    {
      header: "Acciones",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <div className="flex items-center gap-1">
          <Button
            onClick={() =>
              navigate({
                to: "/clinical-documents/$documentId",
                params: { documentId: row.id },
              })
            }
            size="icon-xs"
            variant="ghost"
          >
            <Eye size={14} />
          </Button>
          {row.status === "draft" && (
            <Button
              onClick={() => signMutation.mutate({ id: row.id })}
              size="icon-xs"
              variant="ghost"
            >
              <PenLine size={14} />
            </Button>
          )}
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
            {showForm ? "Cancelar" : "Nuevo documento"}
          </Button>
        }
        description="Documentos clínicos con versionado inmutable"
        title="Documentos clínicos"
      />

      {showForm && <CreateDocumentForm onCancel={() => setShowForm(false)} />}

      <div className="space-y-3 px-6">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            value={statusFilter}
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="signed">Firmado</option>
          </select>
          <select
            className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
            value={typeFilter}
          >
            <option value="">Todos los tipos</option>
            <option value="evolucion_medica">Evolución médica</option>
            <option value="nota_enfermeria">Nota de enfermería</option>
            <option value="epicrisis">Epicrisis</option>
            <option value="informe_quirurgico">Informe quirúrgico</option>
            <option value="orden_medica">Orden médica</option>
            <option value="consentimiento_informado">
              Consentimiento informado
            </option>
            <option value="historia_clinica">Historia clínica</option>
          </select>
          {(statusFilter || typeFilter) && (
            <Button
              onClick={() => {
                setStatusFilter("");
                setTypeFilter("");
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
          data={filteredDocuments}
          emptyDescription="No se encontraron documentos clínicos."
          emptyTitle="Sin documentos"
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          pagination={
            data
              ? {
                  limit,
                  offset,
                  total: filteredTotal,
                  onPageChange: setOffset,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
