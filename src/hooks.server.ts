// src/hooks.server.ts
import { processQueue } from "$lib/server/queue";
import { building } from "$app/environment";
import * as kv from "$lib/server/kv";

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

// Clean up orphaned tasks (tasks with no corresponding repository)
try {
  console.log("[Hooks] Cleaning up orphaned tasks...");
  const allTasks = await kv.listTasks();
  const allRepos = await kv.listRepos();
  const repoUuids = new Set(allRepos.map(repo => repo.uuid));

  const orphanedTasks = allTasks.filter(task => !repoUuids.has(task.repoUuid));

  if (orphanedTasks.length > 0) {
    console.log(`[Hooks] Found ${orphanedTasks.length} orphaned tasks, removing...`);

    // Remove from queue
    const orphanedTaskUuids = orphanedTasks.map(task => task.uuid);
    const removedFromQueue = await kv.removeTasksFromQueue(orphanedTaskUuids);
    console.log(`[Hooks] Removed ${removedFromQueue} orphaned tasks from queue`);

    // Delete from database
    let deletedCount = 0;
    for (const task of orphanedTasks) {
      await kv.deleteTask(task.uuid);
      deletedCount++;
    }
    console.log(`[Hooks] Deleted ${deletedCount} orphaned tasks from database`);
  } else {
    console.log("[Hooks] No orphaned tasks found.");
  }
} catch (error) {
  console.error("[Hooks] Error cleaning up orphaned tasks:", error);
}
