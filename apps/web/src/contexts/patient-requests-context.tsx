import { createContext, useCallback, useContext, useState } from "react";

/* ─── types ─── */

type RequestStatus = "Recibida" | "En preparación" | "Entregada" | "Vencida";

interface PatientCopyRequest {
  createdAt: Date;
  deadline: Date;
  deliveryChannel: string;
  id: string;
  legalBasis: string;
  notes: string;
  patientId: string;
  patientName: string;
  requester: string;
  scope: string;
  status: RequestStatus;
}

interface PatientRequestsContextValue {
  addRequest: (request: PatientCopyRequest) => void;
  expandedId: string | null;
  requests: PatientCopyRequest[];
  setExpandedId: (id: string | null) => void;
  updateRequestStatus: (
    id: string,
    status: "Recibida" | "En preparación" | "Entregada"
  ) => void;
}

/* ─── helpers ─── */

let globalRequestId = 1;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function createRequest(data: {
  patientId: string;
  patientName: string;
  scope: string;
  deliveryChannel: string;
  requester: string;
  legalBasis: string;
  notes: string;
}): PatientCopyRequest {
  const createdAt = new Date();
  return {
    id: `patreq-${globalRequestId++}`,
    patientId: data.patientId,
    patientName: data.patientName,
    scope: data.scope,
    deliveryChannel: data.deliveryChannel,
    requester: data.requester,
    legalBasis: data.legalBasis,
    notes: data.notes,
    createdAt,
    deadline: addDays(createdAt, 5),
    status: "Recibida",
  };
}

export function computeStatus(
  request: PatientCopyRequest,
  now = new Date()
): RequestStatus {
  if (request.status === "Entregada") {
    return "Entregada";
  }
  if (request.deadline < now) {
    return "Vencida";
  }
  return request.status;
}

/* ─── context ─── */

const PatientRequestsContext =
  createContext<PatientRequestsContextValue | null>(null);

export function PatientRequestsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [requests, setRequests] = useState<PatientCopyRequest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addRequest = useCallback((request: PatientCopyRequest) => {
    setRequests((prev) => [request, ...prev]);
  }, []);

  const updateRequestStatus = useCallback(
    (id: string, status: "Recibida" | "En preparación" | "Entregada") => {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    },
    []
  );

  return (
    <PatientRequestsContext.Provider
      value={{
        addRequest,
        expandedId,
        requests,
        setExpandedId,
        updateRequestStatus,
      }}
    >
      {children}
    </PatientRequestsContext.Provider>
  );
}

export function usePatientRequests(): PatientRequestsContextValue {
  const ctx = useContext(PatientRequestsContext);
  if (!ctx) {
    throw new Error(
      "usePatientRequests must be used within a PatientRequestsProvider"
    );
  }
  return ctx;
}

export type { PatientCopyRequest, RequestStatus };
