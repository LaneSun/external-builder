// src/routes/api/repos/[uuid]/trigger/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv';
import type { Task } from '$lib/types';

/**
 * Manually triggers a build for the specified repository.
 */
export const POST: RequestHandler = async ({ params }) => {
  try {
    const { uuid } = params;

    // 1. Check if the repository exists
    const repo = await kv.getRepo(uuid);
    if (!repo) {
      throw error(404, `Repository with UUID ${uuid} not found`);
    }

    console.log(`[Manual Trigger] Triggering build for repo: ${repo.name}`);

    // 2. Create a new build task
    const newTask: Task = {
      uuid: crypto.randomUUID(),
      repoUuid: repo.uuid,
      status: 'pending',
      logs: `Task created from manual trigger at ${new Date().toISOString()}`,
      createdAt: Date.now()
    };

    // 3. Save the task to the database and add its UUID to the build queue
    await kv.createTask(newTask);
    const enqueued = await kv.enqueueTask(newTask.uuid);

    if (enqueued) {
      console.log(
        `[Manual Trigger] Successfully created and enqueued task ${newTask.uuid} for repo ${repo.name}`
      );
      return json(
        { message: 'Build task created and enqueued', taskId: newTask.uuid },
        { status: 201 }
      );
    } else {
      throw new Error('Failed to enqueue task atomically.');
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[Manual Trigger] Error triggering build:', errorMessage);
    throw error(500, `Failed to trigger build: ${errorMessage}`);
  }
};
