// src/hooks.server.ts
import { processQueue } from "$lib/server/queue";
import { building } from "$app/environment";

console.log("[Hooks] Setting up server hooks...");

// This ensures the cron job only runs on the server and not during build steps.
if (!building) {
  Deno.cron(
    "Build Queue Processor", // A name for the cron job
    {
      "minute": {
        every: 1
      }
    },
    async () => {
      console.log("[Cron] Checking build queue...");
      await processQueue();
    },
  );
  console.log("[Hooks] Deno.cron for build queue initialized.");
} else {
  console.log("[Hooks] Skipping cron setup during build.");
}

// We can also add a startup task to ensure the `builder` directory exists.
try {
  await Deno.mkdir("builder/repos", { recursive: true });
  await Deno.mkdir("builder/builds", { recursive: true });
  console.log("[Hooks] Ensured builder directories exist.");
} catch (error) {
  // Ignore if the directory already exists, but log other errors.
  if (!(error instanceof Deno.errors.AlreadyExists)) {
    console.error("[Hooks] Error creating builder directories:", error);
  }
}
