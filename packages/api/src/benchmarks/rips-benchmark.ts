import { createDb } from "@wellfit-emr/db";
import { generateRipsPayload } from "../services/rips-generator";

const db = createDb();

async function benchmark() {
  const start = performance.now();

  const result = await generateRipsPayload(db, {
    payerId: "bench-payer",
    periodFrom: new Date("2024-01-01"),
    periodTo: new Date("2024-12-31"),
    organizationTaxId: "900123456",
  });

  const end = performance.now();
  const duration = Math.round(end - start);

  console.log(`METRIC rips_batch_gen_ms=${duration}`);
  console.log(`METRIC num_users=${result.numUsers}`);
  console.log(`METRIC total_value=${result.totalValue}`);
  console.log(`METRIC num_encounters=${result.encounterIds.length}`);
  console.log(`Duration: ${duration}ms`);
}

benchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
