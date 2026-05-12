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
import { Eye, FileText, FilterX, PenLine, Plus, Trash2 } from "lucide-react";
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[10px] shadow-sm ${mapped.colorClass}`}
    >
      {mapped.label}
    </span>
  );
}

export const Route = createFileRoute("/_authenticated/clinical-documents/")({
  component: ClinicalDocumentsListPage,
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

function CreateDocumentForm({
  onCancel,
  defaultPatientId,
  defaultEncounterId,
}: {
  onCancel: () => void;
  defaultPatientId?: string;
  defaultEncounterId?: string;
}) {
  const [form, setForm] = useState({
    patientId: defaultPatientId ?? "",
    encounterId: defaultEncounterId ?? "",
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
    if (!form.patientId.trim()) {
      toast.error("Paciente es obligatorio");
      return;
    }
    if (!form.encounterId.trim()) {
      toast.error("Atención es obligatoria");
      return;
    }
    if (!form.authorPractitionerId.trim()) {
      toast.error("Autor es obligatorio");
      return;
    }
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
            <Label>Paciente *</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar pacientes"
              loading={patientsLoading}
              onChange={(v) => setForm((f) => ({ ...f, patientId: v }))}
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
              value={form.patientId}
            />
          </div>
          <div className="space-y-1">
            <Label>Atención *</Label>
            <SearchSelect
              emptyMessage="Escribe para buscar atenciones"
              loading={encountersLoading}
              onChange={(v) => setForm((f) => ({ ...f, encounterId: v }))}
              onSearchChange={setEncounterSearch}
              options={[
                ...(defaultEncounterData && defaultEncounterId
                  ? [
                      {
                        value: defaultEncounterData.id,
                        label:
                          defaultEncounterData.reasonForVisit || "Sin motivo",
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
              value={form.encounterId}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de documento</Label>
            <Select
              onValueChange={(v) =>
                setForm({ ...form, documentType: v as string })
              }
              value={form.documentType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolucion_medica">
                  Evolución médica
                </SelectItem>
                <SelectItem value="nota_enfermeria">
                  Nota de enfermería
                </SelectItem>
                <SelectItem value="epicrisis">Epicrisis</SelectItem>
                <SelectItem value="informe_quirurgico">
                  Informe quirúrgico
                </SelectItem>
                <SelectItem value="orden_medica">Orden médica</SelectItem>
                <SelectItem value="consentimiento_informado">
                  Consentimiento informado
                </SelectItem>
                <SelectItem value="historia_clinica">
                  Historia clínica
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Autor *</Label>
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
            <Select
              onValueChange={(v) =>
                setForm({ ...form, sectionCode: v as string })
              }
              value={form.sectionCode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subjective">Subjetivo</SelectItem>
                <SelectItem value="objective">Objetivo</SelectItem>
                <SelectItem value="assessment">
                  Análisis / Evaluación
                </SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="evolucion">Evolución</SelectItem>
                <SelectItem value="nota">Nota</SelectItem>
              </SelectContent>
            </Select>
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
  const { encounterId: defaultEncounterId, patientId: defaultPatientId } =
    useSearch({
      from: "/_authenticated/clinical-documents/",
    });
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [showForm, setShowForm] = useState(
    !!(defaultEncounterId || defaultPatientId)
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    document.title = "Documentos clínicos | WellFit EMR";
    return () => {
      document.title = "WellFit EMR";
    };
  }, []);

  const { data, isLoading } = useQuery(
    orpc.clinicalDocuments.list.queryOptions({
      input: {
        limit,
        offset,
        sortDirection: "desc",
        status: statusFilter || undefined,
        documentType: typeFilter || undefined,
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

  const deleteMutation = useMutation({
    ...orpc.clinicalDocuments.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar documento");
    },
  });

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
        <Link
          className="text-[10px] text-primary hover:underline"
          params={{ patientId: row.patientId }}
          to="/patients/$patientId"
        >
          {row.patientId.slice(0, 8)}…
        </Link>
      ),
    },
    {
      header: "Atención",
      accessor: (row: NonNullable<typeof data>["documents"][0]) => (
        <Link
          className="text-[10px] text-primary hover:underline"
          params={{ encounterId: row.encounterId }}
          search={{ tab: undefined }}
          to="/encounters/$encounterId"
        >
          {row.encounterId.slice(0, 8)}…
        </Link>
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
            aria-label="Ver documento"
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
              aria-label="Firmar documento"
              onClick={() => signMutation.mutate({ id: row.id })}
              size="icon-xs"
              variant="ghost"
            >
              <PenLine size={14} />
            </Button>
          )}
          <Button
            aria-label="Eliminar documento"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("¿Eliminar este documento permanentemente?")) {
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
            {showForm ? "Cancelar" : "Nuevo documento"}
          </Button>
        }
        description="Documentos clínicos con versionado inmutable"
        icon={FileText}
        iconBgClass="bg-teal-50 text-teal-600"
        title="Documentos clínicos"
      />

      {showForm && (
        <CreateDocumentForm
          defaultEncounterId={defaultEncounterId}
          defaultPatientId={defaultPatientId}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-3 px-6">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
          <Select
            onValueChange={(v) => {
              setStatusFilter(v as string);
              setOffset(0);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="h-8 w-auto bg-background">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="signed">Firmado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) => {
              setTypeFilter(v as string);
              setOffset(0);
            }}
            value={typeFilter}
          >
            <SelectTrigger className="h-8 w-auto bg-background">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los tipos</SelectItem>
              <SelectItem value="evolucion_medica">Evolución médica</SelectItem>
              <SelectItem value="nota_enfermeria">
                Nota de enfermería
              </SelectItem>
              <SelectItem value="epicrisis">Epicrisis</SelectItem>
              <SelectItem value="informe_quirurgico">
                Informe quirúrgico
              </SelectItem>
              <SelectItem value="orden_medica">Orden médica</SelectItem>
              <SelectItem value="consentimiento_informado">
                Consentimiento informado
              </SelectItem>
              <SelectItem value="historia_clinica">Historia clínica</SelectItem>
            </SelectContent>
          </Select>
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
          data={data?.documents ?? []}
          emptyDescription={
            statusFilter || typeFilter
              ? "Ningún documento coincide con los filtros aplicados."
              : "No se encontraron documentos clínicos."
          }
          emptyTitle={
            statusFilter || typeFilter ? "Sin resultados" : "Sin documentos"
          }
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            navigate({
              to: "/clinical-documents/$documentId",
              params: { documentId: row.id },
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
