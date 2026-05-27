import { Link } from "@tanstack/react-router";
import { Button } from "@wellfit-emr/ui/components/button";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export interface RipsGenerationIssue {
  field: string;
  message: string;
  path: string;
  sourceValue: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIssueLike(
  value: unknown
): value is Record<string, unknown> & { message: string } {
  return isRecord(value) && typeof value.message === "string";
}

function normalizeIssue(value: unknown): RipsGenerationIssue | null {
  if (!isIssueLike(value)) {
    return null;
  }

  return {
    field: typeof value.field === "string" ? value.field : "campo",
    message: value.message,
    path: typeof value.path === "string" ? value.path : "RIPS",
    sourceValue: value.sourceValue,
  };
}

export function extractRipsGenerationIssues(
  error: unknown
): RipsGenerationIssue[] {
  const seen = new Set<unknown>();

  function visit(value: unknown, depth: number): RipsGenerationIssue[] {
    if (depth > 5 || !isRecord(value) || seen.has(value)) {
      return [];
    }
    seen.add(value);

    if (Array.isArray(value.issues)) {
      const issues = value.issues
        .map((issue) => normalizeIssue(issue))
        .filter((issue): issue is RipsGenerationIssue => issue !== null);
      if (issues.length > 0) {
        return issues;
      }
    }

    for (const key of ["data", "cause", "error", "response", "body"]) {
      const issues = visit(value[key], depth + 1);
      if (issues.length > 0) {
        return issues;
      }
    }

    return [];
  }

  return visit(error, 0);
}

function formatSourceValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Sin dato";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  try {
    const formatted = JSON.stringify(value);
    return formatted.length > 180 ? `${formatted.slice(0, 177)}...` : formatted;
  } catch {
    return "Valor no serializable";
  }
}

type IssueTarget =
  | {
      anchor?: string;
      encounterId: string;
      kind: "encounter";
      tab?: string;
    }
  | {
      kind: "patient";
      patientId: string;
    };

const ENCOUNTER_SERVICE_TARGETS: Record<
  string,
  { anchorPrefix: string; tab: string }
> = {
  consultas: { tab: "procedures", anchorPrefix: "rips-procedure" },
  procedimientos: { tab: "procedures", anchorPrefix: "rips-procedure" },
  medicamentos: {
    tab: "medicationOrders",
    anchorPrefix: "rips-medication-order",
  },
  otrosServicios: {
    tab: "serviceRequests",
    anchorPrefix: "rips-service-request",
  },
};

function getIssueTarget(path: string): IssueTarget | null {
  const parts = path.split(".");
  if (parts[0] === "usuarios" && parts[1]) {
    return { kind: "patient", patientId: parts[1] };
  }

  if (parts[0] !== "encounters" || !parts[1]) {
    return null;
  }

  const encounterId = parts[1];
  const serviceTarget = parts[2]
    ? ENCOUNTER_SERVICE_TARGETS[parts[2]]
    : undefined;

  if (!(serviceTarget && parts[3])) {
    return { kind: "encounter", encounterId };
  }

  return {
    kind: "encounter",
    encounterId,
    tab: serviceTarget.tab,
    anchor: `${serviceTarget.anchorPrefix}-${parts[3]}`,
  };
}

function IssuePathLink({ issue }: { issue: RipsGenerationIssue }) {
  const target = getIssueTarget(issue.path);
  const className =
    "border border-red-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-red-900 underline-offset-2 hover:bg-red-100 hover:underline";

  if (target?.kind === "patient") {
    return (
      <Link
        className={className}
        params={{ patientId: target.patientId }}
        to="/patients/$patientId"
      >
        {issue.path}
      </Link>
    );
  }

  if (target?.kind === "encounter") {
    return (
      <Link
        className={className}
        hash={target.anchor}
        params={{ encounterId: target.encounterId }}
        search={{ tab: target.tab }}
        to="/encounters/$encounterId"
      >
        {issue.path}
      </Link>
    );
  }

  return <span className={className}>{issue.path}</span>;
}

function BillingActionLink({ issue }: { issue: RipsGenerationIssue }) {
  if (issue.field !== "billingItem") {
    return null;
  }

  const target = getIssueTarget(issue.path);
  if (target?.kind !== "encounter") {
    return null;
  }

  return (
    <Link
      className="border border-red-200 bg-white px-1.5 py-0.5 font-medium text-[10px] text-red-900 underline-offset-2 hover:bg-red-100 hover:underline"
      params={{ encounterId: target.encounterId }}
      search={{ tab: "billingItems" }}
      to="/encounters/$encounterId"
    >
      Ir a facturación
    </Link>
  );
}

export function showRipsEmptyGenerationToast(): void {
  toast.warning("RIPS generado sin usuarios", {
    description:
      "No hay atenciones finalizadas en el periodo con el pagador seleccionado, o faltan items de facturacion y datos clinicos. Amplia el periodo, finaliza atenciones y revisa cobertura y la pestana Facturacion.",
    duration: 10_000,
  });
}

export function handleRipsGenerateSuccess(numUsers: number | null | undefined) {
  if ((numUsers ?? 0) === 0) {
    showRipsEmptyGenerationToast();
    return;
  }
  toast.success("Payload RIPS generado");
}

export function showRipsGenerationIssuesToast(
  issues: RipsGenerationIssue[]
): void {
  const firstIssue = issues[0];

  toast.error(`Generación bloqueada: ${issues.length} problemas de datos`, {
    description: firstIssue
      ? `${firstIssue.path} / ${firstIssue.field}: ${firstIssue.message}`
      : "Revisa el panel de errores de generación.",
  });
}

export function RipsGenerationIssuesPanel({
  issues,
  onDismiss,
}: {
  issues: RipsGenerationIssue[];
  onDismiss: () => void;
}) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="rounded-sm border border-red-200 bg-red-50">
      <div className="flex items-start justify-between gap-3 border-red-200 border-b px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-700" size={16} />
          <div className="min-w-0">
            <h2 className="font-semibold text-red-900 text-sm">
              Generación bloqueada por {issues.length} problemas de calidad de
              datos
            </h2>
            <p className="text-red-800 text-xs">
              Corrige estos datos y vuelve a generar el payload RIPS.
            </p>
          </div>
        </div>
        <Button
          aria-label="Cerrar errores de generación"
          className="text-red-800 hover:bg-red-100"
          onClick={onDismiss}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X size={12} />
        </Button>
      </div>
      <div className="max-h-96 divide-y divide-red-100 overflow-y-auto">
        {issues.map((issue, index) => (
          <div
            className="px-3 py-2"
            key={`${issue.path}-${issue.field}-${index}`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <IssuePathLink issue={issue} />
              <span className="border border-red-200 bg-red-100 px-1.5 py-0.5 font-mono text-[10px] text-red-900">
                {issue.field}
              </span>
              <BillingActionLink issue={issue} />
            </div>
            <p className="mt-1 font-medium text-red-950 text-xs">
              {issue.message}
            </p>
            <p className="mt-1 break-words text-red-800 text-xs">
              Valor actual:{" "}
              <span className="font-mono">
                {formatSourceValue(issue.sourceValue)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
