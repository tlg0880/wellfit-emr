import { code } from "@streamdown/code";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@wellfit-emr/ui/components/button";
import { Input } from "@wellfit-emr/ui/components/input";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileText,
  FlaskConical,
  Loader2,
  MessageSquare,
  Pill,
  Printer,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { orpc } from "@/utils/orpc";

type AddToolOutput = (params: {
  tool?: string;
  toolCallId: string;
  output?: unknown;
  state?: "output-available" | "output-error";
  errorText?: string;
}) => void;

interface MessagePartsProps {
  addToolOutput: AddToolOutput;
  isLoading: boolean;
  message: UIMessage;
  selectedPatientId: string | null;
}

export function MessageParts({
  message,
  isLoading,
  addToolOutput,
  selectedPatientId,
}: MessagePartsProps) {
  return (
    <>
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;

        if (part.type === "text") {
          return (
            <TextPart
              index={i}
              isLoading={isLoading}
              key={key}
              message={message}
              part={part}
            />
          );
        }

        if (isToolUIPart(part)) {
          const toolName =
            "toolName" in part
              ? (part.toolName as string)
              : part.type.replace("tool-", "");

          // UI tools — render interactive components
          if (
            toolName === "pick_date" ||
            toolName === "pick_practitioner" ||
            toolName === "pick_encounter"
          ) {
            return (
              <UIToolPart
                addToolOutput={addToolOutput}
                key={key}
                part={part as UIToolPartShape}
                selectedPatientId={selectedPatientId}
                toolName={toolName}
              />
            );
          }

          return <ToolPart key={key} part={part} toolName={toolName} />;
        }

        return null;
      })}
    </>
  );
}

// ─── UI Tool Parts (interactive, client-side) ─────────────────────────────────

function formatToolOutput(output: unknown): string {
  if (output === null || output === undefined) {
    return "";
  }
  if (typeof output !== "object") {
    return String(output);
  }
  const obj = output as Record<string, unknown>;
  // Pick the most human-readable field
  const label =
    obj.fullName ?? obj.reasonForVisit ?? obj.name ?? obj.title ?? null;
  if (label) {
    return String(label);
  }
  // Fallback: join primitive values
  return Object.values(obj)
    .filter((v) => v !== null && typeof v !== "object")
    .join(" · ");
}

interface UIToolPartShape {
  input?: {
    label?: string;
    defaultValue?: string | null;
  };
  output?: unknown;
  state: string;
  toolCallId: string;
}

function UIToolPart({
  part,
  toolName,
  addToolOutput,
  selectedPatientId,
}: {
  part: UIToolPartShape;
  toolName: string;
  addToolOutput: AddToolOutput;
  selectedPatientId: string | null;
}) {
  const isDone =
    part.state === "output-available" || part.state === "output-error";
  const label = part.input?.label ?? toolName.replace(/_/g, " ");

  if (isDone) {
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-sm border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs">
        <Calendar size={12} />
        <span>{label}:</span>
        <span className="font-medium text-foreground">
          {formatToolOutput(part.output)}
        </span>
      </div>
    );
  }

  if (part.state !== "input-available") {
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-sm border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs">
        <Loader2 className="animate-spin" size={12} />
        <span>{label}</span>
      </div>
    );
  }

  if (toolName === "pick_date") {
    return (
      <PickDateUI
        addToolOutput={addToolOutput}
        defaultValue={part.input?.defaultValue ?? null}
        label={label}
        toolCallId={part.toolCallId}
      />
    );
  }

  if (toolName === "pick_practitioner") {
    return (
      <PickPractitionerUI
        addToolOutput={addToolOutput}
        label={label}
        toolCallId={part.toolCallId}
      />
    );
  }

  if (toolName === "pick_encounter") {
    return (
      <PickEncounterUI
        addToolOutput={addToolOutput}
        label={label}
        selectedPatientId={selectedPatientId}
        toolCallId={part.toolCallId}
      />
    );
  }

  return null;
}

// ─── Pick Date ────────────────────────────────────────────────────────────────

function PickDateUI({
  label,
  defaultValue,
  toolCallId,
  addToolOutput,
}: {
  label: string;
  defaultValue: string | null;
  toolCallId: string;
  addToolOutput: AddToolOutput;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [value, setValue] = useState(defaultValue ?? today);

  return (
    <div className="my-2 rounded-sm border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2 font-medium text-xs">
        <Calendar className="text-primary" size={13} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Input
          className="h-8 w-44 text-xs"
          onChange={(e) => setValue(e.target.value)}
          type="date"
          value={value}
        />
        <Button
          className="h-8 text-xs"
          disabled={!value}
          onClick={() => addToolOutput({ toolCallId, output: value })}
          size="sm"
          type="button"
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}

// ─── Pick Practitioner ────────────────────────────────────────────────────────

function PickPractitionerUI({
  label,
  toolCallId,
  addToolOutput,
}: {
  label: string;
  toolCallId: string;
  addToolOutput: AddToolOutput;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery(
    orpc.facilities.listPractitioners.queryOptions({
      input: { limit: 20, offset: 0, search: search || undefined },
    })
  );

  return (
    <div className="my-2 rounded-sm border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2 font-medium text-xs">
        <Users className="text-primary" size={13} />
        {label}
      </div>
      <Input
        className="mb-2 h-8 text-xs"
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar profesional..."
        value={search}
      />
      <div className="max-h-40 space-y-1 overflow-auto">
        {isLoading && (
          <p className="text-muted-foreground text-xs">Cargando...</p>
        )}
        {data?.practitioners.map((p) => (
          <button
            className="flex w-full items-center justify-between rounded-sm border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            key={p.id}
            onClick={() =>
              addToolOutput({
                toolCallId,
                output: { id: p.id, fullName: p.fullName },
              })
            }
            type="button"
          >
            <span className="font-medium">{p.fullName}</span>
            <span className="text-muted-foreground">
              {p.documentType} {p.documentNumber}
            </span>
          </button>
        ))}
        {data?.practitioners.length === 0 && (
          <p className="text-muted-foreground text-xs">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}

// ─── Pick Encounter ───────────────────────────────────────────────────────────

function PickEncounterUI({
  label,
  toolCallId,
  addToolOutput,
  selectedPatientId,
}: {
  label: string;
  toolCallId: string;
  addToolOutput: AddToolOutput;
  selectedPatientId: string | null;
}) {
  const { data, isLoading } = useQuery({
    ...orpc.encounters.list.queryOptions({
      input: {
        limit: 10,
        offset: 0,
        patientId: selectedPatientId ?? "",
      },
    }),
    enabled: !!selectedPatientId,
  });

  return (
    <div className="my-2 rounded-sm border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2 font-medium text-xs">
        <ClipboardList className="text-primary" size={13} />
        {label}
      </div>
      <div className="max-h-40 space-y-1 overflow-auto">
        {isLoading && (
          <p className="text-muted-foreground text-xs">Cargando...</p>
        )}
        {!selectedPatientId && (
          <p className="text-muted-foreground text-xs">
            Selecciona un paciente primero.
          </p>
        )}
        {data?.encounters.map((e) => (
          <button
            className="flex w-full items-center justify-between rounded-sm border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            key={e.id}
            onClick={() =>
              addToolOutput({
                toolCallId,
                output: { id: e.id, reasonForVisit: e.reasonForVisit },
              })
            }
            type="button"
          >
            <span className="font-medium">{e.reasonForVisit}</span>
            <span className="text-muted-foreground">
              {new Date(e.startedAt).toLocaleDateString("es-CO")} · {e.status}
            </span>
          </button>
        ))}
        {data?.encounters.length === 0 && (
          <p className="text-muted-foreground text-xs">Sin atenciones.</p>
        )}
      </div>
    </div>
  );
}

function TextPart({
  part,
  message,
  isLoading,
  index,
}: {
  part: { type: "text"; text: string };
  message: UIMessage;
  isLoading: boolean;
  index: number;
}) {
  if (message.role === "user") {
    return <p className="text-sm">{part.text}</p>;
  }

  return (
    <Streamdown
      caret="block"
      isAnimating={
        isLoading &&
        index === message.parts.length - 1 &&
        message.role === "assistant"
      }
      plugins={{ code }}
    >
      {part.text}
    </Streamdown>
  );
}

// ─── Tool metadata ────────────────────────────────────────────────────────────

interface ToolMeta {
  category: "read" | "write" | "search" | "safety";
  icon: React.ReactNode;
  label: string;
}

const TOOL_META: Record<string, ToolMeta> = {
  search_patients: {
    label: "Búsqueda de pacientes",
    icon: <Search size={13} />,
    category: "search",
  },
  get_patient: {
    label: "Datos del paciente",
    icon: <User size={13} />,
    category: "read",
  },
  get_patient_timeline: {
    label: "Línea de tiempo clínica",
    icon: <Activity size={13} />,
    category: "read",
  },
  get_patient_encounters: {
    label: "Atenciones del paciente",
    icon: <ClipboardList size={13} />,
    category: "read",
  },
  get_patient_diagnoses: {
    label: "Diagnósticos del paciente",
    icon: <Stethoscope size={13} />,
    category: "read",
  },
  get_patient_allergies: {
    label: "Alergias del paciente",
    icon: <AlertTriangle size={13} />,
    category: "read",
  },
  get_patient_observations: {
    label: "Observaciones y signos vitales",
    icon: <Activity size={13} />,
    category: "read",
  },
  get_patient_medications: {
    label: "Medicamentos del paciente",
    icon: <Pill size={13} />,
    category: "read",
  },
  get_patient_procedures: {
    label: "Procedimientos del paciente",
    icon: <FlaskConical size={13} />,
    category: "read",
  },
  get_active_encounter: {
    label: "Atención activa",
    icon: <ClipboardList size={13} />,
    category: "read",
  },
  clinical_safety_check: {
    label: "Revisión de seguridad clínica",
    icon: <ShieldCheck size={13} />,
    category: "safety",
  },
  create_medication_order: {
    label: "Crear prescripción",
    icon: <Pill size={13} />,
    category: "write",
  },
  create_diagnosis: {
    label: "Registrar diagnóstico",
    icon: <Stethoscope size={13} />,
    category: "write",
  },
  create_observation: {
    label: "Registrar observación",
    icon: <Activity size={13} />,
    category: "write",
  },
  create_procedure: {
    label: "Registrar procedimiento",
    icon: <FlaskConical size={13} />,
    category: "write",
  },
  create_service_request: {
    label: "Crear orden de servicio",
    icon: <FileText size={13} />,
    category: "write",
  },
  create_interconsultation: {
    label: "Crear interconsulta",
    icon: <MessageSquare size={13} />,
    category: "write",
  },
  create_incapacity_certificate: {
    label: "Crear incapacidad",
    icon: <FileCheck size={13} />,
    category: "write",
  },
  draft_clinical_document: {
    label: "Borrador de documento clínico",
    icon: <FileText size={13} />,
    category: "write",
  },
  list_clinical_documents: {
    label: "Documentos clínicos",
    icon: <FileText size={13} />,
    category: "read",
  },
  get_clinical_document: {
    label: "Detalle de documento clínico",
    icon: <FileText size={13} />,
    category: "read",
  },
  list_service_requests: {
    label: "Órdenes de servicio",
    icon: <FlaskConical size={13} />,
    category: "read",
  },
  get_diagnostic_report: {
    label: "Resultado diagnóstico",
    icon: <FlaskConical size={13} />,
    category: "read",
  },
  list_consents: {
    label: "Consentimientos",
    icon: <ShieldCheck size={13} />,
    category: "read",
  },
  list_attachments: {
    label: "Anexos",
    icon: <FileText size={13} />,
    category: "read",
  },
  list_patient_documents: {
    label: "Documentos adjuntos",
    icon: <FileText size={13} />,
    category: "read",
  },
  get_patient_document_summary: {
    label: "Resumen de documento",
    icon: <FileText size={13} />,
    category: "read",
  },
  get_patient_document_text: {
    label: "Texto de documento",
    icon: <FileText size={13} />,
    category: "read",
  },
  search_rips_reference: {
    label: "Búsqueda en catálogos RIPS",
    icon: <BookOpen size={13} />,
    category: "search",
  },
  list_rips_tables: {
    label: "Tablas de catálogos RIPS",
    icon: <BookOpen size={13} />,
    category: "search",
  },
  list_practitioners: {
    label: "Profesionales de salud",
    icon: <Users size={13} />,
    category: "read",
  },
};

function getToolMeta(toolName: string): ToolMeta {
  return (
    TOOL_META[toolName] ?? {
      label: toolName.replace(/_/g, " "),
      icon: <FileText size={13} />,
      category: "read",
    }
  );
}

// ─── ToolPart dispatcher ──────────────────────────────────────────────────────

function ToolPart({
  part,
  toolName,
}: {
  part: {
    state: string;
    output?: unknown;
    errorText?: string;
    input?: unknown;
  };
  toolName: string;
}) {
  const meta = getToolMeta(toolName);
  const output = part.state === "output-available" ? part.output : undefined;
  const errorText = part.state === "output-error" ? part.errorText : undefined;

  // Special rich rendering for medication order
  if (toolName === "create_medication_order" && output !== undefined) {
    return (
      <ToolCallCard meta={meta} part={part} toolName={toolName}>
        <CreateMedicationOutput data={output} />
      </ToolCallCard>
    );
  }

  return (
    <ToolCallCard meta={meta} part={part} toolName={toolName}>
      {errorText ? (
        <p className="text-destructive text-xs">{errorText}</p>
      ) : output === undefined ? null : (
        <GenericOutput data={output} toolName={toolName} />
      )}
    </ToolCallCard>
  );
}

// ─── Generic output renderer ─────────────────────────────────────────────────

function GenericOutput({ data }: { data: unknown; toolName?: string }) {
  // Error object from tool
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in (data as Record<string, unknown>)
  ) {
    return (
      <p className="text-destructive text-xs">
        {String((data as Record<string, unknown>).error)}
      </p>
    );
  }

  // Arrays: render as a compact list
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-muted-foreground text-xs">Sin resultados.</p>;
    }
    return (
      <div className="space-y-1">
        {data.slice(0, 8).map((item, i) => (
          <ArrayItem item={item} key={`item-${i}`} />
        ))}
        {data.length > 8 && (
          <p className="text-[11px] text-muted-foreground">
            +{data.length - 8} más
          </p>
        )}
      </div>
    );
  }

  // Objects: render key-value pairs
  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (entries.length === 0) {
      return <p className="text-muted-foreground text-xs">Sin datos.</p>;
    }
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {entries.slice(0, 12).map(([k, v]) => (
          <KeyValueRow key={k} label={k} value={v} />
        ))}
        {entries.length > 12 && (
          <p className="col-span-2 text-[11px] text-muted-foreground">
            +{entries.length - 12} campos más
          </p>
        )}
      </div>
    );
  }

  // Primitives
  return <p className="text-xs">{String(data)}</p>;
}

function ArrayItem({ item }: { item: unknown }) {
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    // Try to find a meaningful label — covers most tool return shapes
    const label =
      obj.fullName ??
      obj.name ??
      obj.genericName ??
      obj.substanceCode ??
      obj.originalFileName ??
      obj.documentType ??
      obj.code ??
      obj.title ??
      obj.reasonForVisit ??
      obj.type ??
      null;
    const sub =
      obj.document ??
      obj.dose ??
      obj.status ??
      obj.date ??
      obj.createdAt ??
      obj.description ??
      null;
    if (label) {
      return (
        <div className="flex items-baseline justify-between gap-2 border-b py-0.5 text-xs last:border-0">
          <span className="font-medium">{String(label)}</span>
          {sub && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {String(sub)}
            </span>
          )}
        </div>
      );
    }
    // Fallback: render primitive fields as key-value pairs
    const primitiveEntries = Object.entries(obj).filter(
      ([, v]) =>
        v !== null && v !== undefined && v !== "" && typeof v !== "object"
    );
    if (primitiveEntries.length > 0) {
      return (
        <div className="border-b py-1 last:border-0">
          {primitiveEntries.slice(0, 4).map(([k, v]) => (
            <span className="mr-3 text-xs" key={k}>
              <span className="text-muted-foreground">
                {LABEL_MAP[k] ?? k}:
              </span>{" "}
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
  }
  return (
    <div className="border-b py-0.5 text-xs last:border-0">{String(item)}</div>
  );
}

const LABEL_MAP: Record<string, string> = {
  id: "ID",
  patientId: "Paciente",
  encounterId: "Atención",
  practitionerId: "Profesional",
  genericName: "Nombre genérico",
  concentration: "Concentración",
  dosageForm: "Forma farmacéutica",
  dose: "Dosis",
  doseUnit: "Unidad",
  routeCode: "Vía",
  frequencyText: "Frecuencia",
  durationText: "Duración",
  quantityTotal: "Cantidad total",
  indications: "Indicaciones",
  status: "Estado",
  createdAt: "Creado",
  signedAt: "Firmado",
  reasonForVisit: "Motivo",
  startedAt: "Inicio",
  substanceCode: "Sustancia",
  criticality: "Criticidad",
  reactionText: "Reacción",
  code: "Código",
  name: "Nombre",
  description: "Descripción",
  type: "Tipo",
  fullName: "Nombre completo",
  birthDate: "Nacimiento",
  sexAtBirth: "Sexo",
  primaryDocumentType: "Tipo doc.",
  primaryDocumentNumber: "Número doc.",
  warnings: "Advertencias",
  message: "Mensaje",
  success: "Éxito",
};

function KeyValueRow({ label, value }: { label: string; value: unknown }) {
  const displayLabel =
    LABEL_MAP[label] ?? label.replace(/([A-Z])/g, " $1").trim();
  let displayValue: string;

  if (Array.isArray(value)) {
    displayValue = value.join(", ");
  } else if (value instanceof Date) {
    displayValue = value.toLocaleDateString("es-CO");
  } else if (typeof value === "object" && value !== null) {
    displayValue = formatToolOutput(value);
  } else {
    displayValue = String(value);
  }

  return (
    <>
      <span className="text-[11px] text-muted-foreground capitalize">
        {displayLabel}
      </span>
      <span className="truncate text-xs">{displayValue}</span>
    </>
  );
}

// ─── Medication order rich output ─────────────────────────────────────────────

function CreateMedicationOutput({ data }: { data: unknown }) {
  const result = data as {
    error?: string;
    message?: string;
    prescription?: PrescriptionPrintData;
    success: boolean;
  };
  if (result.success) {
    return (
      <div className="space-y-2">
        <p className="text-emerald-600 text-xs dark:text-emerald-400">
          {result.message}
        </p>
        {result.prescription && (
          <button
            className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] transition-colors hover:bg-muted"
            onClick={() =>
              printPrescription(result.prescription as PrescriptionPrintData)
            }
            type="button"
          >
            <Printer size={11} />
            Imprimir / guardar PDF
          </button>
        )}
      </div>
    );
  }
  return <p className="text-destructive text-xs">{result.error}</p>;
}

// ─── Collapsible ToolCallCard ─────────────────────────────────────────────────

const CATEGORY_STYLES = {
  read: "border-border/60 bg-muted/30",
  search:
    "border-sky-200/60 bg-sky-50/40 dark:border-sky-800/40 dark:bg-sky-950/20",
  write:
    "border-teal-200/60 bg-teal-50/40 dark:border-teal-800/40 dark:bg-teal-950/20",
  safety:
    "border-amber-200/60 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20",
};

const CATEGORY_ICON_STYLES = {
  read: "text-muted-foreground",
  search: "text-sky-600 dark:text-sky-400",
  write: "text-teal-600 dark:text-teal-400",
  safety: "text-amber-600 dark:text-amber-400",
};

function ToolCallCard({
  meta,
  part,
  children,
}: {
  meta: ToolMeta;
  part: { state: string };
  toolName?: string;
  children?: React.ReactNode;
}) {
  const isRunning =
    part.state === "input-streaming" || part.state === "input-available";
  const hasError =
    part.state === "output-error" || part.state === "output-denied";
  const hasOutput = part.state === "output-available" && children;

  const [expanded, setExpanded] = useState(false);

  const containerClass = hasError
    ? "border-destructive/40 bg-destructive/5"
    : CATEGORY_STYLES[meta.category];

  const iconClass = hasError
    ? "text-destructive"
    : CATEGORY_ICON_STYLES[meta.category];

  let stateLabel: string;
  if (isRunning) {
    stateLabel = "ejecutando";
  } else if (part.state === "output-available") {
    stateLabel = "completado";
  } else if (part.state === "output-error") {
    stateLabel = "error";
  } else if (part.state === "output-denied") {
    stateLabel = "denegado";
  } else {
    stateLabel = part.state;
  }

  return (
    <div className={`my-1.5 rounded-sm border text-xs ${containerClass}`}>
      <button
        aria-expanded={expanded}
        aria-label={`${meta.label} — ${stateLabel}`}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        disabled={!hasOutput}
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <span className={iconClass}>
          {isRunning ? (
            <Loader2 className="animate-spin" size={13} />
          ) : (
            meta.icon
          )}
        </span>
        <span className="flex-1 font-medium text-foreground/80">
          {meta.label}
        </span>
        <span className="text-[10px] text-muted-foreground">{stateLabel}</span>
        {hasOutput && (
          <span className="text-muted-foreground">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
      </button>

      {expanded && hasOutput && (
        <div className="border-t px-2.5 py-2">{children}</div>
      )}
    </div>
  );
}

// ─── Print prescription ───────────────────────────────────────────────────────

interface PrescriptionPrintData {
  atcCode: string | null;
  concentration: string;
  dosageForm: string;
  dose: string;
  doseUnit: string | null;
  durationText: string;
  frequencyText: string;
  genericName: string;
  id: string;
  indications: string | null;
  patientId: string;
  prescriberId: string;
  quantityTotal: string;
  routeCode: string;
  signedAt: string;
  status: string;
}

function printPrescription(prescription: PrescriptionPrintData) {
  const printWindow = window.open("", "_blank", "width=760,height=900");
  if (!printWindow) {
    return;
  }

  const issuedAt = new Date(prescription.signedAt).toLocaleString("es-CO");
  printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Receta medica ${prescription.id}</title>
    <style>
      body { color: #111; font-family: Arial, sans-serif; margin: 40px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      h2 { border-bottom: 1px solid #ddd; font-size: 14px; margin-top: 28px; padding-bottom: 6px; text-transform: uppercase; }
      .muted { color: #555; font-size: 12px; }
      .row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; margin: 8px 0; }
      .label { color: #555; font-weight: 700; }
      .signature { border-top: 1px solid #111; margin-top: 72px; padding-top: 8px; width: 320px; }
      @media print { button { display: none; } body { margin: 24px; } }
    </style>
  </head>
  <body>
    <h1>WellFit EMR - Receta medica</h1>
    <div class="muted">Generada desde asistente IA. Debe ser revisada y validada por el profesional tratante.</div>
    <h2>Orden</h2>
    <div class="row"><div class="label">ID</div><div>${escapeHtml(prescription.id)}</div></div>
    <div class="row"><div class="label">Fecha</div><div>${escapeHtml(issuedAt)}</div></div>
    <div class="row"><div class="label">Paciente ID</div><div>${escapeHtml(prescription.patientId)}</div></div>
    <div class="row"><div class="label">Prescriptor ID</div><div>${escapeHtml(prescription.prescriberId)}</div></div>
    <h2>Medicamento</h2>
    <div class="row"><div class="label">Nombre generico</div><div>${escapeHtml(prescription.genericName)}</div></div>
    <div class="row"><div class="label">Concentracion</div><div>${escapeHtml(prescription.concentration)}</div></div>
    <div class="row"><div class="label">Forma farmaceutica</div><div>${escapeHtml(prescription.dosageForm)}</div></div>
    <div class="row"><div class="label">Dosis</div><div>${escapeHtml(prescription.dose)} ${escapeHtml(prescription.doseUnit ?? "")}</div></div>
    <div class="row"><div class="label">Via</div><div>${escapeHtml(prescription.routeCode)}</div></div>
    <div class="row"><div class="label">Frecuencia</div><div>${escapeHtml(prescription.frequencyText)}</div></div>
    <div class="row"><div class="label">Duracion</div><div>${escapeHtml(prescription.durationText)}</div></div>
    <div class="row"><div class="label">Cantidad total</div><div>${escapeHtml(prescription.quantityTotal)}</div></div>
    <div class="row"><div class="label">Indicaciones</div><div>${escapeHtml(prescription.indications ?? "Sin indicaciones adicionales")}</div></div>
    <div class="signature">Firma y sello del profesional</div>
    <script>window.print();</script>
  </body>
</html>`);
  printWindow.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
