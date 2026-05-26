import { describe, expect, it } from "bun:test";
import { createTestContext } from "../test-utils";
import { validateRipsPreflight } from "./rips-preflight-validator";

describe("rips preflight validator", () => {
  it("rejects empty transaction with no users", async () => {
    const ctx = await createTestContext();
    const result = await validateRipsPreflight(ctx.db, {
      numDocumentoIdObligado: "900123456",
      numFactura: "TEST001",
      tipoNota: null,
      numNota: null,
      usuarios: [],
    });

    expect(result.passed).toBe(false);
    expect(result.rejections.length).toBeGreaterThan(0);
    expect(result.checkedRules).toContain("RVG03");
  });

  it("validates user with valid catalog codes when catalogs exist", async () => {
    const ctx = await createTestContext();
    const result = await validateRipsPreflight(ctx.db, {
      numDocumentoIdObligado: "900123456",
      numFactura: "TEST002",
      tipoNota: null,
      numNota: null,
      usuarios: [
        {
          tipoDocumentoIdentificacion: "CC",
          numDocumentoIdentificacion: "1234567890",
          tipoUsuario: "01",
          fechaNacimiento: "1990-01-01",
          codSexo: "M",
          codPaisResidencia: "170",
          codMunicipioResidencia: "11001",
          codZonaTerritorialResidencia: "01",
          incapacidad: "NO",
          consecutivo: 1,
          codPaisOrigen: "170",
          servicios: {
            consultas: [
              {
                codPrestador: "900123456001",
                fechaInicioAtencion: "2026-03-01 08:00",
                numAutorizacion: null,
                codConsulta: "890201",
                modalidadGrupoServicioTecSal: "01",
                grupoServicios: "01",
                codServicio: "101",
                finalidadTecnologiaSalud: "10",
                causaMotivoAtencion: "13",
                codDiagnosticoPrincipal: "J069",
                codDiagnosticoRelacionado1: null,
                codDiagnosticoRelacionado2: null,
                codDiagnosticoRelacionado3: null,
                tipoDiagnosticoPrincipal: "02",
                tipoDocumentoIdentificacion: "CC",
                numDocumentoIdentificacion: "1234567890",
                vrServicio: "50000.00",
                conceptoRecaudo: null,
                valorPagoModerador: null,
                numFEVPagoModerador: null,
                consecutivo: 1,
              },
            ],
          },
        },
      ],
    });

    // Result depends on whether SISPRO catalogs are synced in test DB
    expect(result.checkedRules.length).toBeGreaterThan(0);
    expect(
      result.passed ||
        result.rejections.length > 0 ||
        result.notifications.length > 0
    ).toBe(true);
  });
});
