import { describe, expect, it } from "bun:test";
import type { Db } from "../context";
import { validateRipsPreflight } from "./rips-preflight-validator";

describe("rips preflight validator", () => {
  it("rejects empty transaction with no users", async () => {
    const result = await validateRipsPreflight({} as Db, {
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

  it("allows nota ajuste and RIPS sin factura without numFactura", async () => {
    const notaAjuste = await validateRipsPreflight({} as Db, {
      numDocumentoIdObligado: "900123456",
      numFactura: null,
      tipoNota: "NA",
      numNota: "NA-001",
      usuarios: [],
    });

    const ripsSinFactura = await validateRipsPreflight({} as Db, {
      numDocumentoIdObligado: "900123456",
      numFactura: null,
      tipoNota: "RS",
      numNota: "RS-001",
      usuarios: [],
    });

    expect(notaAjuste.rejections.some((r) => r.field === "numFactura")).toBe(
      false
    );
    expect(
      ripsSinFactura.rejections.some((r) => r.field === "numFactura")
    ).toBe(false);
  });
});
