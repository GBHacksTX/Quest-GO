// Starts the website and the board-event worker together; Ctrl+C stops both.
// Usage: npm run dev:all  (extra args go to next dev, e.g. -- --port 3001)
import { spawn, type ChildProcess } from "node:child_process";

const children: ChildProcess[] = [];
let stopping = false;
function run(name: string, command: string, args: string[]) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    if (stopping) return;
    console.error(
      `${name} stopped (exit ${code}); stopping the other process.`,
    );
    stop(code ?? 1);
  });
  children.push(child);
}
function stop(code = 0) {
  stopping = true;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

run("Website", "npx", ["next", "dev", "--webpack", ...process.argv.slice(2)]);
run("Board worker", "npx", [
  "tsx",
  "--env-file=.env",
  "scripts/notifications-worker.ts",
]);
