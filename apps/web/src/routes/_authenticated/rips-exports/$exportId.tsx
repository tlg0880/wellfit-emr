import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Badge } from "@wellfit-emr/ui/components/badge";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import {
  AlertTriangle,
  Baby,
  Building,
  CheckCircle,
  FileOutput,
  FlaskConical,
  Pencil,
  Pill,
  Play,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { orpc, queryClient } from "@/utils/orpc";
import {
  extractRipsGenerationIssues,
  handleRipsGenerateSuccess,
  RipsGenerationIssuesPanel,
  showRipsGenerationIssuesToast,
} from "./-components/generation-issues";
import {
  RipsExportForm,
  ripsExportToFormValues,
} from "./-components/rips-export-form";

const ripsExportDetailSearchSchema = z.object({
  edit: z.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/rips-exports/$exportId")({
  component: RipsExportDetailPage,
  validateSearch: (search) =>
    ripsExportDetailSearchSchema.parse({
      edit: search.edit === true || search.edit === "true" ? true : undefined,
    }),
});

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  consultas: <Stethoscope size={14} />,
  procedimientos: <FlaskConical size={14} />,
  medicamentos: <Pill size={14} />,
  urgencias: <AlertTriangle size={14} />,
  hospitalizacion: <Building size={14} />,
  recienNacidos: <Baby size={14} />,
  otrosServicios: <FlaskConical size={14} />,
};

const SERVICE_LABELS: Record<string, string> = {
  consultas: "Consultas",
  procedimientos: "Procedimientos",
  medicamentos: "Medicamentos",
  urgencias: "Urgencias",
  hospitalizacion: "Hospitalización",
  recienNacidos: "Recién nacidos",
  otrosServicios: "Otros servicios",
};

function RipsPayloadViewer({
  payload,
}: {
  payload: Record<string, unknown> | null;
}) {
  if (!payload) {
    return null;
  }
  // biome-ignore lint/suspicious/noExplicitAny: RIPS JSON structure is dynamic by design
  const tx = payload as any;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transacción</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground">NIT Obligado</p>
            <p className="font-medium">{tx.numDocumentoIdObligado}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Factura</p>
            <p className="font-medium">{tx.numFactura ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Tipo nota</p>
            <p className="font-medium">{tx.tipoNota ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">N. nota</p>
            <p className="font-medium">{tx.numNota ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Usuarios</p>
            <p className="font-medium">{tx.usuarios?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      {(tx.usuarios ?? []).map(
        (
          u: {
            numDocumentoIdentificacion: string;
            tipoDocumentoIdentificacion: string;
            consecutivo: number;
            fechaNacimiento: string;
            codSexo: string;
            tipoUsuario: string;
            servicios: Record<string, unknown[]>;
          },
          idx: number
        ) => (
          <Card key={`${u.numDocumentoIdentificacion}-${idx}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users size={16} />
                Usuario {u.consecutivo}: {u.tipoDocumentoIdentificacion}{" "}
                {u.numDocumentoIdentificacion}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{u.fechaNacimiento}</Badge>
                <Badge variant="outline">Sexo: {u.codSexo}</Badge>
                <Badge variant="outline">Tipo: {u.tipoUsuario}</Badge>
              </div>

              {Object.entries(u.servicios).map(([serviceType, items]) => {
                if (!Array.isArray(items) || items.length === 0) {
                  return null;
                }
                return (
                  <div
                    className="rounded-md border border-border/60 bg-muted/30 p-2.5"
                    key={serviceType}
                  >
                    <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-xs">
                      {SERVICE_ICONS[serviceType]}
                      {SERVICE_LABELS[serviceType] ?? serviceType}
                      <Badge className="ml-auto" variant="secondary">
                        {items.length}
                      </Badge>
                    </h4>
                    <div className="space-y-1.5">
                      {items.map((item, i) => {
                        // biome-ignore lint/suspicious/noExplicitAny: service item shape varies by type
                        const it = item as Record<string, any>;
                        return (
                          <div
                            className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-sm bg-background p-2 text-[10px]"
                            key={i}
                          >
                            <div>
                              <span className="text-muted-foreground">
                                Prestador:
                              </span>{" "}
                              <span className="font-medium">
                                {String(it.codPrestador ?? "—")}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Consecutivo:
                              </span>{" "}
                              <span className="font-medium">
                                {String(it.consecutivo ?? "—")}
                              </span>
                            </div>
                            {it.fechaInicioAtencion && (
                              <div>
                                <span className="text-muted-foreground">
                                  Inicio:
                                </span>{" "}
                                <span className="font-medium">
                                  {String(it.fechaInicioAtencion)}
                                </span>
                              </div>
                            )}
                            {it.codDiagnosticoPrincipal && (
                              <div>
                                <span className="text-muted-foreground">
                                  Dx:
                                </span>{" "}
                                <span className="font-medium">
                                  {String(it.codDiagnosticoPrincipal)}
                                </span>
                              </div>
                            )}
                            {it.vrServicio && (
                              <div>
                                <span className="text-muted-foreground">
                                  Valor:
                                </span>{" "}
                                <span className="font-medium">
                                  ${String(it.vrServicio)}
                                </span>
                              </div>
                            )}
                            {it.codConsulta && (
                              <div>
                                <span className="text-muted-foreground">
                                  CUPS:
                                </span>{" "}
                                <span className="font-medium">
                                  {String(it.codConsulta)}
                                </span>
                              </div>
                            )}
                            {it.codProcedimiento && (
                              <div>
                                <span className="text-muted-foreground">
                                  CUPS:
                                </span>{" "}
                                <span className="font-medium">
                                  {String(it.codProcedimiento)}
                                </span>
                              </div>
                            )}
                            {it.codTecnologiaSalud && (
                              <div>
                                <span className="text-muted-foreground">
                                  Tecnología:
                                </span>{" "}
                                <span className="font-medium">
                                  {String(it.codTecnologiaSalud)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function ValidationPanel({
  result,
}: {
  result: Record<string, unknown> | null;
}) {
  if (!result) {
    return null;
  }
  const passed = result.passed as boolean;
  const rejections = (result.rejections ?? []) as Record<string, unknown>[];
  const notifications = (result.notifications ?? []) as Record<
    string,
    unknown
  >[];
  const checkedRules = (result.checkedRules ?? []) as string[];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {passed ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle className="mr-1" size={12} />
            Aprobado preflight
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="mr-1" size={12} />
            Rechazado preflight
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">
          {checkedRules.length} reglas verificadas
        </span>
      </div>

      {rejections.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-red-700 text-xs">
            <XCircle size={14} />
            Rechazos ({rejections.length})
          </h4>
          <div className="space-y-2">
            {rejections.map((r, i) => (
              <div className="rounded-sm bg-background p-2 text-[10px]" key={i}>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] text-red-600">
                    {String(r.ruleCode)}
                  </span>
                  <span className="font-medium">
                    {String(r.path)}.{String(r.field)}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {String(r.message)}
                </p>
                <p className="mt-0.5">
                  Valor:{" "}
                  <span className="font-mono">
                    {JSON.stringify(r.sourceValue)}
                  </span>{" "}
                  — Esperado: {String(r.expectedConstraint)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-amber-700 text-xs">
            <AlertTriangle size={14} />
            Notificaciones ({notifications.length})
          </h4>
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <div className="rounded-sm bg-background p-2 text-[10px]" key={i}>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] text-amber-600">
                    {String(n.ruleCode)}
                  </span>
                  <span className="font-medium">
                    {String(n.path)}.{String(n.field)}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {String(n.message)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RipsExportDetailPage() {
  const { exportId } = Route.useParams();
  const { edit: openEditFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const [showRawJson, setShowRawJson] = useState(false);
  const [showEditForm, setShowEditForm] = useState(openEditFromSearch ?? false);
  const [generationIssues, setGenerationIssues] = useState<
    ReturnType<typeof extractRipsGenerationIssues>
  >([]);

  useEffect(() => {
    if (openEditFromSearch) {
      setShowEditForm(true);
    }
  }, [openEditFromSearch]);

  const deleteMutation = useMutation({
    ...orpc.ripsExports.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Exportación eliminada");
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      navigate({ to: "/rips-exports" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar exportación");
    },
  });

  const generateMutation = useMutation({
    ...orpc.ripsExports.generatePayload.mutationOptions(),
    onMutate: () => {
      setGenerationIssues([]);
    },
    onSuccess: (data) => {
      handleRipsGenerateSuccess(data.numUsers);
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.get.key({ input: { id: exportId } }),
      });
    },
    onError: (error: Error) => {
      const issues = extractRipsGenerationIssues(error);
      if (issues.length > 0) {
        setGenerationIssues(issues);
        showRipsGenerationIssuesToast(issues);
        return;
      }
      toast.error(error.message || "Error al generar payload");
    },
  });

  const validateMutation = useMutation({
    ...orpc.ripsExports.validatePayload.mutationOptions(),
    onSuccess: (data) => {
      if (data.validation.passed) {
        toast.success("Validación preflight aprobada");
      } else {
        toast.error(
          `Validación preflight rechazada: ${data.validation.rejections.length} rechazos`
        );
      }
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.list.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.ripsExports.get.key({ input: { id: exportId } }),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al validar payload");
    },
  });

  const { data: exportData, isLoading } = useQuery(
    orpc.ripsExports.get.queryOptions({ input: { id: exportId } })
  );

  const { data: payerData } = useQuery({
    ...orpc.payers.get.queryOptions({
      input: { id: exportData?.payerId ?? "" },
    }),
    enabled: !!exportData?.payerId,
  });

  const editFormValues = useMemo(
    () => (exportData ? ripsExportToFormValues(exportData) : undefined),
    [exportData]
  );

  const canEdit = exportData?.status !== "sent";

  const closeEditForm = () => {
    setShowEditForm(false);
    if (openEditFromSearch) {
      navigate({
        to: "/rips-exports/$exportId",
        params: { exportId },
        search: {},
        replace: true,
      });
    }
  };

  const title = isLoading
    ? "Cargando..."
    : (exportData?.status ?? "Detalle de export RIPS");

  useEffect(() => {
    if (exportData) {
      document.title = `RIPS ${exportData.status} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [exportData]);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          exportData ? (
            <div className="flex items-center gap-2">
              {canEdit ? (
                <Button
                  disabled={showEditForm}
                  onClick={() => setShowEditForm(true)}
                  size="sm"
                  variant="outline"
                >
                  <Pencil size={14} />
                  <span className="ml-1.5">Editar</span>
                </Button>
              ) : null}
              <Button
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate({ id: exportId })}
                size="sm"
                variant="outline"
              >
                <Play size={14} />
                <span className="ml-1.5">
                  {generateMutation.isPending ? "Generando..." : "Generar"}
                </span>
              </Button>
              <Button
                disabled={!exportData.payloadJson || validateMutation.isPending}
                onClick={() => validateMutation.mutate({ id: exportId })}
                size="sm"
                variant="outline"
              >
                <ShieldCheck size={14} />
                <span className="ml-1.5">
                  {validateMutation.isPending ? "Validando..." : "Validar"}
                </span>
              </Button>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar esta exportación permanentemente?")) {
                    deleteMutation.mutate({ id: exportId });
                  }
                }}
                size="sm"
                variant="outline"
              >
                <Trash2 size={14} />
                <span className="ml-1.5">
                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                </span>
              </Button>
            </div>
          ) : undefined
        }
        backTo="/rips-exports"
        description="Información de la exportación RIPS"
        icon={FileOutput}
        iconBgClass="bg-emerald-100 text-emerald-600"
        title={title}
      />

      {isLoading ? (
        <div className="mx-6 space-y-4">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : exportData ? (
        <>
          <div className="px-6">
            <RipsGenerationIssuesPanel
              issues={generationIssues}
              onDismiss={() => setGenerationIssues([])}
            />
          </div>

          {showEditForm && editFormValues ? (
            <div className="px-6">
              <RipsExportForm
                exportId={exportId}
                initialValues={editFormValues}
                key={exportId}
                mode="edit"
                onCancel={closeEditForm}
                onSuccess={closeEditForm}
                title="Editar exportación RIPS"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información general</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-xs">
                {[
                  {
                    label: "Estado",
                    value: (
                      <Badge
                        className={
                          exportData.status === "ready"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : exportData.status === "locally_invalid"
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : exportData.status === "generated"
                                ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                        }
                      >
                        {exportData.status}
                      </Badge>
                    ),
                  },
                  {
                    label: "Operación",
                    value: exportData.operationType,
                  },
                  {
                    label: "Pagador",
                    value:
                      payerData?.name ?? `${exportData.payerId.slice(0, 8)}…`,
                  },
                  {
                    label: "NIT obligado",
                    value: exportData.organizationTaxId ?? "—",
                  },
                  {
                    label: "Factura",
                    value: exportData.invoiceNumber ?? "—",
                  },
                  {
                    label: "Nota",
                    value:
                      exportData.noteType || exportData.noteNumber
                        ? `${exportData.noteType ?? "—"} ${exportData.noteNumber ?? ""}`.trim()
                        : "—",
                  },
                  {
                    label: "Periodo",
                    value: `${new Date(exportData.periodFrom).toLocaleDateString("es-CO")} - ${new Date(exportData.periodTo).toLocaleDateString("es-CO")}`,
                  },
                  {
                    label: "Usuarios / Valor total",
                    value: `${exportData.numUsers ?? 0} usuarios · $${exportData.totalValue ?? "0.00"}`,
                  },
                  {
                    label: "Generado",
                    value: new Date(exportData.generatedAt).toLocaleString(
                      "es-CO"
                    ),
                  },
                  exportData.cuv
                    ? {
                        label: "CUV",
                        value: (
                          <span className="font-mono">{exportData.cuv}</span>
                        ),
                      }
                    : null,
                ]
                  .filter((i): i is NonNullable<typeof i> => !!i)
                  .map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 font-medium">{item.value}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {exportData.validationResultJson && (
              <Card>
                <CardHeader>
                  <CardTitle>Validación preflight</CardTitle>
                </CardHeader>
                <CardContent>
                  <ValidationPanel result={exportData.validationResultJson} />
                </CardContent>
              </Card>
            )}

            {exportData.payloadJson && (
              <div className="lg:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Payload RIPS</h3>
                  <Button
                    onClick={() => setShowRawJson((s) => !s)}
                    size="xs"
                    variant="ghost"
                  >
                    {showRawJson ? "Ver estructurado" : "Ver JSON"}
                  </Button>
                </div>
                {showRawJson ? (
                  <pre className="max-h-[600px] overflow-auto rounded-md border bg-muted p-3 text-[10px]">
                    {JSON.stringify(exportData.payloadJson, null, 2)}
                  </pre>
                ) : (
                  <RipsPayloadViewer payload={exportData.payloadJson} />
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          description="No se encontró la exportación solicitada."
          title="Exportación no encontrada"
        />
      )}
    </div>
  );
}
