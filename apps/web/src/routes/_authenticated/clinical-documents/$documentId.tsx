import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@wellfit-emr/ui/components/card";
import { Skeleton } from "@wellfit-emr/ui/components/skeleton";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

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

  // Known SOAP/evolution keys rendered as labeled blocks
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

  // Fallback: render remaining entries as labeled rows
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

export const Route = createFileRoute(
  "/_authenticated/clinical-documents/$documentId"
)({
  component: ClinicalDocumentDetailPage,
});

function ClinicalDocumentDetailPage() {
  const { documentId } = useParams({
    from: "/_authenticated/clinical-documents/$documentId",
  });

  const { data, isLoading } = useQuery(
    orpc.clinicalDocuments.get.queryOptions({ input: { id: documentId } })
  );

  const documentTitle = data?.document
    ? getDocumentTypeLabel(data.document.documentType)
    : "Documento clínico";

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        backTo="/clinical-documents"
        title={isLoading ? "Cargando..." : documentTitle}
      />

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
                  <p
                    className="font-medium text-muted-foreground"
                    title={data.document.patientId}
                  >
                    {data.document.patientId.slice(0, 8)}…
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Atención</p>
                  <p
                    className="font-medium text-muted-foreground"
                    title={data.document.encounterId}
                  >
                    {data.document.encounterId.slice(0, 8)}…
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">ID</p>
                  <p
                    className="font-medium text-muted-foreground"
                    title={data.document.id}
                  >
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
                  <p className="text-[10px] text-muted-foreground">
                    Autor (practitioner ID)
                  </p>
                  <p className="font-medium">
                    {data.version.authorPractitionerId}
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
