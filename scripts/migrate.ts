import { loadEnvConfig } from "@next/env";
import { migrate } from "../src/lib/store";
loadEnvConfig(process.cwd());
migrate()
  .then(() => console.log("Database migrations applied."))
  .catch(() => {
    console.error(
      "Migration failed. Check DATABASE_URL and database access; credentials are not logged.",
    );
    process.exitCode = 1;
  });
