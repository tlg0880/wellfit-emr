import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@wellfit-emr/ui/components/dialog";
import { Label } from "@wellfit-emr/ui/components/label";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { Textarea } from "@wellfit-emr/ui/components/textarea";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileText,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

const sectionCodeLabels: Record<string, string> = {
  subjective: "Subjetivo",
  objective: "Objetivo",
  assessment: "Análisis / Evaluación",
  plan: "Plan",
  evolucion: "Evolución",
  nota: "Nota",
  motivo_consulta: "Motivo de consulta",
  examen_fisico: "Examen físico",
  diagnosticos: "Diagnósticos",
  plan_manejo: "Plan de manejo",
};

function getSectionCodeLabel(code: string): string {
  return sectionCodeLabels[code] ?? code;
}

function getDocumentStatusLabel(status: string): string {
  if (status === "draft") {
    return "Borrador";
  }
  if (status === "signed") {
    return "Firmado";
  }
  return status;
}

function getStatusBadgeClass(status: string): string {
  if (status === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "signed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

interface SectionPayload {
  [key: string]: unknown;
}

function isReadablePayload(payload: SectionPayload): boolean {
  if (typeof payload.text === "string" && payload.text.length > 0) {
    return true;
  }
  if (typeof payload.content === "string" && payload.content.length > 0) {
    return true;
  }
  if (typeof payload.value === "string" && payload.value.length > 0) {
    return true;
  }
  if (typeof payload.note === "string" && payload.note.length > 0) {
    return true;
  }
  if (typeof payload.subjective === "string" && payload.subjective.length > 0) {
    return true;
  }
  if (typeof payload.objective === "string" && payload.objective.length > 0) {
    return true;
  }
  if (typeof payload.assessment === "string" && payload.assessment.length > 0) {
    return true;
  }
  if (typeof payload.plan === "string" && payload.plan.length > 0) {
    return true;
  }
  if (
    typeof payload.reasonForVisit === "string" &&
    payload.reasonForVisit.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(payload.diagnoses) &&
    payload.diagnoses.length > 0 &&
    payload.diagnoses.every((d) => typeof d === "string")
  ) {
    return true;
  }
  return false;
}

function renderReadablePayload(payload: SectionPayload): React.ReactNode {
  const text =
    typeof payload.text === "string" && payload.text.length > 0
      ? payload.text
      : typeof payload.content === "string" && payload.content.length > 0
        ? payload.content
        : typeof payload.value === "string" && payload.value.length > 0
          ? payload.value
          : typeof payload.note === "string" && payload.note.length > 0
            ? payload.note
            : null;

  if (text) {
    return (
      <div className="whitespace-pre-wrap text-foreground text-xs leading-relaxed">
        {text}
      </div>
    );
  }

  const knownKeys: { key: string; label: string }[] = [
    { key: "subjective", label: "Subjetivo" },
    { key: "objective", label: "Objetivo" },
    { key: "assessment", label: "Análisis / Evaluación" },
    { key: "plan", label: "Plan" },
    { key: "reasonForVisit", label: "Motivo de consulta" },
  ];

  const knownBlocks = knownKeys
    .map(({ key, label }) => {
      const value = payload[key];
      if (typeof value === "string" && value.length > 0) {
        return (
          <div className="rounded-none border border-muted p-2" key={key}>
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed">
              {value}
            </p>
          </div>
        );
      }
      return null;
    })
    .filter(Boolean);

  const diagnoses = Array.isArray(payload.diagnoses)
    ? payload.diagnoses.filter((d) => typeof d === "string" && d.length > 0)
    : [];

  if (diagnoses.length > 0) {
    knownBlocks.push(
      <div className="rounded-none border border-muted p-2" key="diagnoses">
        <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
          Diagnósticos
        </p>
        <ul className="list-disc pl-4 text-foreground text-xs leading-relaxed">
          {diagnoses.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (knownBlocks.length > 0) {
    return <div className="grid grid-cols-1 gap-2">{knownBlocks}</div>;
  }

  const entries = Object.entries(payload).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-xs">Sin contenido</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {entries.map(([key, value]) => (
        <div className="rounded-none border border-muted p-2" key={key}>
          <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
            {key}
          </p>
          <p className="text-foreground text-xs">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── section card with raw JSON toggle ─── */

function SectionCard({
  section,
}: {
  section: {
    id: string;
    sectionCode: string;
    sectionOrder: number;
    sectionPayloadJson: SectionPayload;
  };
}) {
  const [showRaw, setShowRaw] = useState(false);
  const readable = isReadablePayload(section.sectionPayloadJson);

  return (
    <div className="border" key={section.id}>
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
          {getSectionCodeLabel(section.sectionCode)} (orden{" "}
          {section.sectionOrder})
        </p>
        <Button onClick={() => setShowRaw((s) => !s)} size="sm" variant="ghost">
          {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span className="ml-1 text-[10px]">
            {showRaw ? "Ocultar JSON" : "Ver JSON"}
          </span>
        </Button>
      </div>
      <div className="p-3">
        {readable && !showRaw ? (
          renderReadablePayload(section.sectionPayloadJson)
        ) : (
          <pre className="overflow-auto text-xs">
            {JSON.stringify(section.sectionPayloadJson, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ─── sign dialog ─── */

function SignDocumentDialog({
  documentId,
  documentType,
}: {
  documentId: string;
  documentType: string;
}) {
  const [open, setOpen] = useState(false);

  const signMutation = useMutation({
    ...orpc.clinicalDocuments.sign.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento firmado correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.get.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Error al firmar: ${error.message}`);
    },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger className="inline-flex h-8 items-center gap-1.5 rounded-none border border-transparent bg-primary px-2.5 font-medium text-primary-foreground text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50">
        <ShieldCheck size={14} />
        Firmar documento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <ShieldCheck size={16} />
            Confirmar firma de documento
          </DialogTitle>
          <DialogDescription>
            Está a punto de firmar el documento{" "}
            <strong>{getDocumentTypeLabel(documentType)}</strong>. Una vez
            firmado, el documento quedará inmutable y solo podrá corregirse
            mediante una nueva versión con motivo documentado.
          </DialogDescription>
        </DialogHeader>
        <div className="border-amber-300 border-l-4 bg-amber-50 px-3 py-2">
          <p className="text-amber-800 text-xs">
            <AlertTriangle className="mr-1 inline" size={12} />
            Esta acción representa su firma electrónica como autor del documento
            clínico y quedará auditada con fecha, hora e identificación.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            disabled={signMutation.isPending}
            onClick={() => signMutation.mutate({ id: documentId })}
            size="sm"
            type="button"
          >
            <FileCheck size={14} />
            {signMutation.isPending ? "Firmando..." : "Confirmar firma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── correct dialog ─── */

function CorrectDocumentDialog({
  documentId,
  documentType,
  currentPayload,
  currentSections,
}: {
  documentId: string;
  documentType: string;
  currentPayload: Record<string, unknown>;
  currentSections: Array<{
    sectionCode: string;
    sectionOrder: number;
    sectionPayloadJson: Record<string, unknown>;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
  });

  const correctMutation = useMutation({
    ...orpc.clinicalDocuments.correct.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento corregido correctamente");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.get.key({ type: "query" }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
      setOpen(false);
      setReason("");
    },
    onError: (error: Error) => {
      toast.error(`Error al corregir: ${error.message}`);
    },
  });

  const userPractitionerId = session?.data?.user?.id ?? "";

  function handleCorrect() {
    if (!reason.trim()) {
      toast.error("El motivo de corrección es obligatorio");
      return;
    }
    correctMutation.mutate({
      id: documentId,
      authorPractitionerId: userPractitionerId || "system",
      correctionReason: reason,
      payloadJson: currentPayload,
      sections: currentSections.map((s) => ({
        sectionCode: s.sectionCode,
        sectionOrder: s.sectionOrder,
        sectionPayloadJson: s.sectionPayloadJson,
      })),
      textRendered: null,
    });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger className="inline-flex h-7 items-center gap-1.5 rounded-none border border-border bg-background px-2.5 font-medium text-xs outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50">
        <Pencil size={14} />
        Corregir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Pencil size={16} />
            Corrección de documento
          </DialogTitle>
          <DialogDescription>
            Va a crear una nueva versión del documento{" "}
            <strong>{getDocumentTypeLabel(documentType)}</strong>. La versión
            anterior se conservará y esta corrección quedará auditada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="correction-reason">
              Motivo de corrección <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="correction-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique el motivo de la corrección (ej: error en diagnóstico, omisión de datos, etc.)"
              rows={3}
              value={reason}
            />
            <p className="text-[10px] text-muted-foreground">
              Este motivo será parte del registro permanente y visible en la
              auditoría del documento.
            </p>
          </div>
        </div>
        <div className="border-amber-300 border-l-4 bg-amber-50 px-3 py-2">
          <p className="text-amber-800 text-xs">
            <AlertTriangle className="mr-1 inline" size={12} />
            La corrección genera una nueva versión vinculada a la anterior. El
            motivo es obligatorio según la Resolución 1995 de 1999.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            disabled={correctMutation.isPending || !reason.trim()}
            onClick={handleCorrect}
            size="sm"
            type="button"
          >
            {correctMutation.isPending
              ? "Corrigiendo..."
              : "Confirmar corrección"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute(
  "/_authenticated/clinical-documents/$documentId"
)({
  component: ClinicalDocumentDetailPage,
});

function ClinicalDocumentDetailPage() {
  const { documentId } = useParams({
    from: "/_authenticated/clinical-documents/$documentId",
  });

  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery(
    orpc.clinicalDocuments.get.queryOptions({ input: { id: documentId } })
  );

  const { data: patientData } = useQuery({
    ...orpc.patients.get.queryOptions({
      input: { id: data?.document.patientId ?? "" },
    }),
    enabled: !!data?.document.patientId,
  });

  const { data: encounterData } = useQuery({
    ...orpc.encounters.get.queryOptions({
      input: { id: data?.document.encounterId ?? "" },
    }),
    enabled: !!data?.document.encounterId,
  });

  const { data: authorData } = useQuery({
    ...orpc.facilities.getPractitioner.queryOptions({
      input: { id: data?.version?.authorPractitionerId ?? "" },
    }),
    enabled: !!data?.version?.authorPractitionerId,
  });

  const deleteMutation = useMutation({
    ...orpc.clinicalDocuments.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({
        queryKey: orpc.clinicalDocuments.list.key({ type: "query" }),
      });
      navigate({ to: "/clinical-documents" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar documento");
    },
  });

  const documentTitle = data?.document
    ? getDocumentTypeLabel(data.document.documentType)
    : "Documento clínico";

  useEffect(() => {
    if (data?.document) {
      document.title = `${documentTitle} | WellFit EMR`;
    }
    return () => {
      document.title = "WellFit EMR";
    };
  }, [data?.document, documentTitle]);

  const isDraft = data?.document?.status === "draft";
  const isSigned = data?.document?.status === "signed";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        actions={
          data?.document ? (
            <div className="flex items-center gap-2">
              {isDraft && (
                <SignDocumentDialog
                  documentId={documentId}
                  documentType={data.document.documentType}
                />
              )}
              {isSigned && (
                <CorrectDocumentDialog
                  currentPayload={data.version?.payloadJson ?? {}}
                  currentSections={
                    data.sections.map((s) => ({
                      sectionCode: s.sectionCode,
                      sectionOrder: s.sectionOrder,
                      sectionPayloadJson: s.sectionPayloadJson,
                    })) ?? []
                  }
                  documentId={documentId}
                  documentType={data.document.documentType}
                />
              )}
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("¿Eliminar este documento permanentemente?")) {
                    deleteMutation.mutate({ id: documentId });
                  }
                }}
                size="sm"
                variant="destructive"
              >
                <Trash2 size={14} />
                <span className="ml-1.5">
                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                </span>
              </Button>
            </div>
          ) : undefined
        }
        backTo="/clinical-documents"
        title={isLoading ? "Cargando..." : documentTitle}
      />

      {isError && (
        <div className="px-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-destructive text-sm">
                Error al cargar documento
              </p>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: orpc.clinicalDocuments.get.key({ type: "query" }),
                  })
                }
                size="sm"
                variant="outline"
              >
                <RefreshCw size={12} />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <FileText size={16} />
              Información del documento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton className="h-4 w-full" key={i} />
              ))
            ) : data?.document ? (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {getDocumentTypeLabel(data.document.documentType)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Estado</p>
                  <span
                    className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${getStatusBadgeClass(data.document.status)}`}
                  >
                    {getDocumentStatusLabel(data.document.status)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Paciente</p>
                  <p className="font-medium">
                    <Link
                      className="text-primary hover:underline"
                      params={{ patientId: data.document.patientId }}
                      to="/patients/$patientId"
                    >
                      {patientData
                        ? `${patientData.firstName} ${patientData.lastName1}`
                        : `${data.document.patientId.slice(0, 8)}…`}
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Atención</p>
                  <p className="font-medium">
                    <Link
                      className="text-primary hover:underline"
                      params={{ encounterId: data.document.encounterId }}
                      search={{ tab: undefined }}
                      to="/encounters/$encounterId"
                    >
                      {encounterData
                        ? encounterData.reasonForVisit || "Sin motivo"
                        : `${data.document.encounterId.slice(0, 8)}…`}
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">ID</p>
                  <p className="font-medium text-muted-foreground">
                    {data.document.id.slice(0, 8)}…
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Fecha creación
                  </p>
                  <p className="font-medium">
                    {new Date(data.document.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
              </>
            ) : (
              <p className="col-span-2 text-muted-foreground">
                Documento no encontrado
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento / Versión actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : data?.version ? (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground">Estado</p>
                  <span
                    className={`inline-flex items-center border px-1.5 py-0.5 font-medium text-[10px] ${getStatusBadgeClass(data.document.status)}`}
                  >
                    {getDocumentStatusLabel(data.document.status)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Versión</p>
                  <p className="font-medium">{data.version.versionNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Autor</p>
                  <p className="font-medium">
                    {authorData?.fullName ??
                      `${data.version.authorPractitionerId.slice(0, 8)}…`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Hash SHA-256
                  </p>
                  <p className="truncate font-medium font-mono text-[10px]">
                    {data.version.hashSha256}
                  </p>
                </div>
                {data.version.signedAt ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Firmado el
                    </p>
                    <p className="font-medium">
                      {new Date(data.version.signedAt).toLocaleString("es-CO")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Firma</p>
                    <p className="font-medium text-amber-700">
                      Pendiente de firma
                    </p>
                  </div>
                )}
                {data.version.correctionReason && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Motivo de corrección
                    </p>
                    <p className="font-medium">
                      {data.version.correctionReason}
                    </p>
                  </div>
                )}
                {data.version.supersedesVersionId && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Versión anterior
                    </p>
                    <p className="truncate font-medium font-mono text-[10px]">
                      {`${data.version.supersedesVersionId.slice(0, 8)}…`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Sin versión</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="px-6">
          <Card>
            <CardHeader>
              <CardTitle>Secciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton className="h-24 w-full" key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : data && data.sections.length > 0 ? (
        <div className="px-6">
          <Card>
            <CardHeader>
              <CardTitle>Secciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : data && data.sections.length === 0 ? (
        <div className="px-6">
          <Card>
            <CardHeader>
              <CardTitle>Secciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Este documento no tiene secciones.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
