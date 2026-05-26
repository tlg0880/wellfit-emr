import { and, eq } from "drizzle-orm";
import type { Db } from "../context";
import { ripsReferenceEntry } from "@wellfit-emr/db/schema/rips-reference";
import type { RipsTransaction, RipsUsuario, RipsServicios } from "./rips-generator";

export interface ValidationFinding {
  ruleCode: string;
  severity: "RECHAZO" | "NOTIFICACION";
  path: string;
  field: string;
  message: string;
  sourceValue: unknown;
  expectedConstraint: string;
}

export interface PreflightValidationResult {
  passed: boolean;
  rejections: ValidationFinding[];
  notifications: ValidationFinding[];
  checkedRules: string[];
}

const CUPS_CONSULTA_PREFIXES = ["89", "87"];

function isConsultaCups(code: string): boolean {
  return CUPS_CONSULTA_PREFIXES.some((p) => code.startsWith(p));
}

async function catalogExists(
  db: Db,
  tableName: string,
  code: string
): Promise<boolean> {
  const [entry] = await db
    .select({ code: ripsReferenceEntry.code })
    .from(ripsReferenceEntry)
    .where(
      and(
        eq(ripsReferenceEntry.tableName, tableName),
        eq(ripsReferenceEntry.code, code),
        eq(ripsReferenceEntry.enabled, true)
      )
    )
    .limit(1);

  return !!entry;
}

function addFinding(
  result: PreflightValidationResult,
  ruleCode: string,
  severity: "RECHAZO" | "NOTIFICACION",
  path: string,
  field: string,
  message: string,
  sourceValue: unknown,
  expectedConstraint: string
): void {
  const finding: ValidationFinding = {
    ruleCode,
    severity,
    path,
    field,
    message,
    sourceValue,
    expectedConstraint,
  };

  if (severity === "RECHAZO") {
    result.rejections.push(finding);
  } else {
    result.notifications.push(finding);
  }

  if (!result.checkedRules.includes(ruleCode)) {
    result.checkedRules.push(ruleCode);
  }
}

export async function validateRipsPreflight(
  db: Db,
  transaction: RipsTransaction
): Promise<PreflightValidationResult> {
  const result: PreflightValidationResult = {
    passed: true,
    rejections: [],
    notifications: [],
    checkedRules: [],
  };

  await validateStructure(result, transaction);
  await validateTransaction(db, result, transaction);

  for (let uIdx = 0; uIdx < transaction.usuarios.length; uIdx++) {
    const usuario = transaction.usuarios[uIdx];
    if (!usuario) { continue; }
    await validateUsuario(db, result, usuario, uIdx);
    await validateServicios(db, result, usuario.servicios, uIdx);
  }

  validateCoherence(result, transaction);

  result.passed = result.rejections.length === 0;
  return result;
}

function validateStructure(
  result: PreflightValidationResult,
  tx: RipsTransaction
): void {
  // RVG01: JSON structure
  if (!tx.numDocumentoIdObligado || tx.numDocumentoIdObligado.length < 4) {
    addFinding(
      result,
      "RVG01",
      "RECHAZO",
      "transaccion",
      "numDocumentoIdObligado",
      "NIT obligado debe tener entre 4 y 12 caracteres",
      tx.numDocumentoIdObligado,
      "length 4-12"
    );
  }

  if (!Array.isArray(tx.usuarios)) {
    addFinding(
      result,
      "RVG01",
      "RECHAZO",
      "transaccion",
      "usuarios",
      "usuarios debe ser un array",
      tx.usuarios,
      "array"
    );
    return;
  }

  if (tx.usuarios.length === 0) {
    addFinding(
      result,
      "RVG03",
      "RECHAZO",
      "transaccion",
      "usuarios",
      "RIPS debe incluir al menos un usuario con servicios",
      tx.usuarios.length,
      "usuarios.length > 0"
    );
  }
}

function validateTransaction(
  _db: Db,
  result: PreflightValidationResult,
  tx: RipsTransaction
): void {
  // T01: NIT validation placeholder (would check against provider catalog)
  if (tx.numFactura === null && tx.tipoNota !== "RS") {
    addFinding(
      result,
      "T01",
      "RECHAZO",
      "transaccion",
      "numFactura",
      "numFactura es requerido para operaciones con factura",
      tx.numFactura,
      "non-null cuando tipoNota != RS"
    );
  }

  if (tx.tipoNota && !["NC", "ND", "NA", "RS"].includes(tx.tipoNota)) {
    addFinding(
      result,
      "T02",
      "RECHAZO",
      "transaccion",
      "tipoNota",
      "tipoNota debe ser NC, ND, NA o RS",
      tx.tipoNota,
      "NC | ND | NA | RS"
    );
  }
}

async function validateUsuario(
  db: Db,
  result: PreflightValidationResult,
  usuario: RipsUsuario,
  uIdx: number
): Promise<void> {
  const path = `usuarios[${uIdx}]`;

  // Document type
  const docTypeValid = await catalogExists(
    db,
    "TipoIdPISIS",
    usuario.tipoDocumentoIdentificacion
  );
  if (!docTypeValid) {
    addFinding(
      result,
      "RVC01",
      "RECHAZO",
      path,
      "tipoDocumentoIdentificacion",
      "Tipo de documento no encontrado en catalogo SISPRO",
      usuario.tipoDocumentoIdentificacion,
      "TipoIdPISIS valid code"
    );
  }

  // User type
  const userTypeValid = await catalogExists(
    db,
    "RIPSTipoUsuarioVersion2",
    usuario.tipoUsuario
  );
  if (!userTypeValid) {
    addFinding(
      result,
      "RVC02",
      "RECHAZO",
      path,
      "tipoUsuario",
      "Tipo de usuario no encontrado en catalogo SISPRO",
      usuario.tipoUsuario,
      "RIPSTipoUsuarioVersion2 valid code"
    );
  }

  // Sex
  const sexValid = await catalogExists(db, "Sexo", usuario.codSexo);
  if (!sexValid) {
    addFinding(
      result,
      "RVC03",
      "RECHAZO",
      path,
      "codSexo",
      "Sexo no encontrado en catalogo SISPRO",
      usuario.codSexo,
      "Sexo valid code (M, F, I)"
    );
  }

  // Country
  const countryValid = await catalogExists(
    db,
    "Pais",
    usuario.codPaisResidencia
  );
  if (!countryValid) {
    addFinding(
      result,
      "RVC04",
      "RECHAZO",
      path,
      "codPaisResidencia",
      "Pais de residencia no encontrado en catalogo SISPRO",
      usuario.codPaisResidencia,
      "Pais valid code"
    );
  }

  // Municipality required for Colombia
  if (usuario.codPaisResidencia === "170" && !usuario.codMunicipioResidencia) {
    addFinding(
      result,
      "RVC05",
      "RECHAZO",
      path,
      "codMunicipioResidencia",
      "Municipio de residencia es obligatorio para Colombia",
      usuario.codMunicipioResidencia,
      "non-null when codPaisResidencia = 170"
    );
  }

  if (usuario.codMunicipioResidencia) {
    const munValid = await catalogExists(
      db,
      "Municipio",
      usuario.codMunicipioResidencia
    );
    if (!munValid) {
      addFinding(
        result,
        "RVC05",
        "RECHAZO",
        path,
        "codMunicipioResidencia",
        "Municipio no encontrado en catalogo SISPRO",
        usuario.codMunicipioResidencia,
        "Municipio valid code"
      );
    }
  }

  // Zone
  if (usuario.codZonaTerritorialResidencia) {
    const zoneValid = await catalogExists(
      db,
      "ZonaVersion2",
      usuario.codZonaTerritorialResidencia
    );
    if (!zoneValid) {
      addFinding(
        result,
        "RVC06",
        "NOTIFICACION",
        path,
        "codZonaTerritorialResidencia",
        "Zona territorial no encontrada en catalogo SISPRO",
        usuario.codZonaTerritorialResidencia,
        "ZonaVersion2 valid code"
      );
    }
  }

  // Incapacidad
  if (!["SI", "NO"].includes(usuario.incapacidad)) {
    addFinding(
      result,
      "RVC07",
      "RECHAZO",
      path,
      "incapacidad",
      "Incapacidad debe ser SI o NO",
      usuario.incapacidad,
      "SI | NO"
    );
  }

  // Check that user has at least one service
  const hasServices = Object.values(usuario.servicios).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );
  if (!hasServices) {
    addFinding(
      result,
      "RVG07",
      "RECHAZO",
      path,
      "servicios",
      "Usuario debe tener al menos un servicio reportado",
      null,
      "at least one service array with items"
    );
  }
}

async function validateConsultas(
  db: Db,
  result: PreflightValidationResult,
  consultas: import("./rips-generator").RipsConsulta[],
  basePath: string
): Promise<void> {
  for (let i = 0; i < consultas.length; i++) {
    const c = consultas[i];
    if (!c) { continue; }
    const path = `${basePath}.consultas[${i}]`;

    if (!isConsultaCups(c.codConsulta)) {
      addFinding(result, "RVC20", "NOTIFICACION", path, "codConsulta", "Codigo de consulta no parece ser CUPS de consulta", c.codConsulta, "CUPS consulta prefix 89/87");
    }

    const finalidadValid = await catalogExists(db, "RIPSFinalidadConsultaVersion2", c.finalidadTecnologiaSalud);
    if (!finalidadValid) {
      addFinding(result, "RVC21", "RECHAZO", path, "finalidadTecnologiaSalud", "Finalidad no encontrada en catalogo SISPRO", c.finalidadTecnologiaSalud, "RIPSFinalidadConsultaVersion2 valid code");
    }

    if (c.causaMotivoAtencion) {
      const causaValid = await catalogExists(db, "RIPSCausaExternaVersion2", c.causaMotivoAtencion);
      if (!causaValid) {
        addFinding(result, "RVC22", "NOTIFICACION", path, "causaMotivoAtencion", "Causa externa no encontrada en catalogo SISPRO", c.causaMotivoAtencion, "RIPSCausaExternaVersion2 valid code");
      }
    }

    const value = Number.parseFloat(c.vrServicio);
    if (value <= 0) {
      addFinding(result, "RVC30", "RECHAZO", path, "vrServicio", "Valor de servicio debe ser mayor a cero para modalidad de evento", c.vrServicio, "> 0");
    }
  }
}

async function validateProcedimientos(
  db: Db,
  result: PreflightValidationResult,
  procedimientos: import("./rips-generator").RipsProcedimiento[],
  basePath: string
): Promise<void> {
  for (let i = 0; i < procedimientos.length; i++) {
    const p = procedimientos[i];
    if (!p) { continue; }
    const path = `${basePath}.procedimientos[${i}]`;

    const cupsValid = await catalogExists(db, "CUPSRips", p.codProcedimiento);
    if (!cupsValid) {
      addFinding(result, "RVC23", "RECHAZO", path, "codProcedimiento", "Codigo CUPS no encontrado en catalogo SISPRO", p.codProcedimiento, "CUPSRips valid code");
    }

    const viaValid = await catalogExists(db, "ViaIngresoUsuario", p.viaIngresoServicioSalud);
    if (!viaValid) {
      addFinding(result, "RVC24", "NOTIFICACION", path, "viaIngresoServicioSalud", "Via de ingreso no encontrada en catalogo SISPRO", p.viaIngresoServicioSalud, "ViaIngresoUsuario valid code");
    }

    const value = Number.parseFloat(p.vrServicio);
    if (value <= 0) {
      addFinding(result, "RVC30", "RECHAZO", path, "vrServicio", "Valor de servicio debe ser mayor a cero para modalidad de evento", p.vrServicio, "> 0");
    }
  }
}

async function validateMedicamentos(
  db: Db,
  result: PreflightValidationResult,
  medicamentos: import("./rips-generator").RipsMedicamento[],
  basePath: string
): Promise<void> {
  for (let i = 0; i < medicamentos.length; i++) {
    const m = medicamentos[i];
    if (!m) { continue; }
    const path = `${basePath}.medicamentos[${i}]`;

    const tipoMedValid = await catalogExists(db, "TipoMedicamentoPOSVersion2", m.tipoMedicamento);
    if (!tipoMedValid) {
      addFinding(result, "RVC25", "RECHAZO", path, "tipoMedicamento", "Tipo de medicamento no encontrado en catalogo SISPRO", m.tipoMedicamento, "TipoMedicamentoPOSVersion2 valid code");
    }

    if (m.cantidadMedicamento <= 0) {
      addFinding(result, "RVC26", "RECHAZO", path, "cantidadMedicamento", "Cantidad de medicamento debe ser mayor a cero", m.cantidadMedicamento, "> 0");
    }

    if (m.diasTratamiento <= 0) {
      addFinding(result, "RVC27", "RECHAZO", path, "diasTratamiento", "Dias de tratamiento debe ser mayor a cero", m.diasTratamiento, "> 0");
    }
  }
}

async function validateOtrosServicios(
  db: Db,
  result: PreflightValidationResult,
  otros: import("./rips-generator").RipsOtroServicio[],
  basePath: string
): Promise<void> {
  for (let i = 0; i < otros.length; i++) {
    const o = otros[i];
    if (!o) { continue; }
    const path = `${basePath}.otrosServicios[${i}]`;

    const tipoOsValid = await catalogExists(db, "TipoOtrosServicios", o.tipoOtrosServicios);
    if (!tipoOsValid) {
      addFinding(result, "RVC28", "NOTIFICACION", path, "tipoOtrosServicios", "Tipo de otros servicios no encontrado en catalogo SISPRO", o.tipoOtrosServicios, "TipoOtrosServicios valid code");
    }
  }
}

async function validateServicios(
  db: Db,
  result: PreflightValidationResult,
  servicios: RipsServicios,
  uIdx: number
): Promise<void> {
  const basePath = `usuarios[${uIdx}].servicios`;
  await validateConsultas(db, result, servicios.consultas ?? [], basePath);
  await validateProcedimientos(db, result, servicios.procedimientos ?? [], basePath);
  await validateMedicamentos(db, result, servicios.medicamentos ?? [], basePath);
  await validateOtrosServicios(db, result, servicios.otrosServicios ?? [], basePath);
}

function validateCoherence(
  result: PreflightValidationResult,
  tx: RipsTransaction
): void {
  // RVG12: duplicate users
  const userKeys = new Set<string>();
  for (let i = 0; i < tx.usuarios.length; i++) {
    const u = tx.usuarios[i];
    if (!u) { continue; }
    const key = `${u.tipoDocumentoIdentificacion}-${u.numDocumentoIdentificacion}`;
    if (userKeys.has(key)) {
      addFinding(
        result,
        "RVG12",
        "RECHAZO",
        `usuarios[${i}]`,
        "tipoDocumentoIdentificacion+numDocumentoIdentificacion",
        "Usuario duplicado en el RIPS",
        key,
        "unique per transaction"
      );
    }
    userKeys.add(key);
  }

  // RVG13: duplicate medications for same user
  for (let uIdx = 0; uIdx < tx.usuarios.length; uIdx++) {
    const u = tx.usuarios[uIdx];
    if (!u) { continue; }
    const meds = u.servicios.medicamentos ?? [];
    const medKeys = new Set<string>();
    for (let mIdx = 0; mIdx < meds.length; mIdx++) {
      const m = meds[mIdx];
      if (!m) { continue; }
      const key = `${m.codTecnologiaSalud}-${m.concentracionMedicamento}-${m.formaFarmaceutica}`;
      if (medKeys.has(key)) {
        addFinding(
          result,
          "RVG13",
          "NOTIFICACION",
          `usuarios[${uIdx}].servicios.medicamentos[${mIdx}]`,
          "codTecnologiaSalud",
          "Medicamento duplicado para el mismo usuario",
          key,
          "unique per user"
        );
      }
      medKeys.add(key);
    }
  }
}
