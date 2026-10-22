import { main } from "./run";

// CLI-only entry point. Keep execution out of run.ts so API imports are side-effect free.
const dryRunEnv = process.env.DRY_RUN;
const liveModeRequested = dryRunEnv === "false" || dryRunEnv === "0" || dryRunEnv === "no";

main({ dryRun: !liveModeRequested }).catch((err) => {
  console.error(err);
  process.exit(1);
});
