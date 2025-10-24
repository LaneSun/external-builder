// src/lib/server/queue.ts

import * as kv from "$lib/server/kv";
import { executeBuild } from "$lib/server/build";

/**
 * Counts the number of tasks currently in the 'running' state.
 * This is used to determine if there are available slots for new builds.
 * @returns A promise that resolves to the number of running tasks.
 */
async function getRunningTasksCount(): Promise<number> {
  const allTasks = await kv.listTasks();
  return allTasks.filter((task) => task.status === "running").length;
}

/**
 * Processes the build queue. This function is intended to be called by a cron job.
 * It checks for available build slots based on MAX_CONCURRENT_TASKS and starts
 * new builds from the queue if slots are available.
 */
export async function processQueue(): Promise<void> {
  const maxConcurrentTasks = parseInt(
    import.meta.env.MAX_CONCURRENT_TASKS || "2",
    10,
  );

  const runningTasksCount = await getRunningTasksCount();

  let availableSlots = maxConcurrentTasks - runningTasksCount;

  if (availableSlots <= 0) {
    if (runningTasksCount > 0) {
      console.log(
        `[Queue] No available build slots. Running: ${runningTasksCount}, Max: ${maxConcurrentTasks}`,
      );
    }
    return;
  }

  const queue = await kv.getQueue();
  if (queue.length === 0) {
    // This is a normal state, no need to log every time.
    return;
  }

  console.log(
    `[Queue] Processing... Available slots: ${availableSlots}. Pending tasks: ${queue.length}.`,
  );

  // Process tasks for the number of available slots
  for (let i = 0; i < availableSlots; i++) {
    const taskUuid = await kv.dequeueTask();

    if (taskUuid) {
      console.log(`[Queue] Starting build for task: ${taskUuid}`);

      // Intentionally not awaiting this.
      // The build process runs in the background. The `executeBuild` function
      // is responsible for the entire lifecycle of the build, including
      // updating the task status in the database.
      executeBuild(taskUuid).catch((err) => {
        // This catch block is a safeguard against unhandled exceptions in the build process.
        // `executeBuild` should handle its own errors, but this prevents the cron from crashing.
        console.error(
          `[Queue] Critical error during executeBuild for task ${taskUuid}:`,
          err,
        );
      });
    } else {
      // The queue is now empty, no more tasks to process.
      break;
    }
  }
}
