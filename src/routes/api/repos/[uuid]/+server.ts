// src/routes/api/repos/[uuid]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import { getRepoPath } from '$lib/server/git.server';
import type { Repo } from '$lib/types';

/**
 * GET /api/repos/[uuid]
 * Retrieves details for a specific repository.
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const repo = await kv.getRepo(params.uuid);
    if (!repo) {
      throw error(404, `Repository with UUID ${params.uuid} not found.`);
    }
    return json(repo);
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/repos/${params.uuid}] Error getting repo:`, errorMessage);
    throw error(500, `Failed to retrieve repository: ${errorMessage}`);
  }
};

/**
 * PUT /api/repos/[uuid]
 * Updates an existing repository.
 *
 * Expected JSON body (partial):
 * {
 *   "name": "New Name",
 *   "branch": "develop",
 *   "templateUuid": "..."
 * }
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const repo = await kv.getRepo(params.uuid);
    if (!repo) {
      throw error(404, `Repository with UUID ${params.uuid} not found.`);
    }

    const updates = await request.json();

    // Validate template if provided
    if (updates.templateUuid) {
      const template = await kv.getTemplate(updates.templateUuid);
      if (!template) {
        throw error(400, `Invalid templateUuid: ${updates.templateUuid} not found.`);
      }
    }

    const updatedRepo: Repo = {
      ...repo,
      ...updates,
      uuid: repo.uuid, // Ensure UUID cannot be changed
      updatedAt: Date.now()
    };

    await kv.updateRepo(updatedRepo);
    console.log(`[API /api/repos/${params.uuid}] Updated repo: ${updatedRepo.name}`);

    return json(updatedRepo);
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/repos/${params.uuid}] Error updating repo:`, errorMessage);
    throw error(500, `Failed to update repository: ${errorMessage}`);
  }
};

/**
 * DELETE /api/repos/[uuid]
 * Deletes a tracked repository and its local clone.
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const repo = await kv.getRepo(params.uuid);
    if (!repo) {
      // If it doesn't exist, that's fine for a DELETE request (idempotent)
      return new Response(null, { status: 204 });
    }

    // --- Delete all tasks associated with this repo ---
    console.log(`[API /api/repos/${params.uuid}] Deleting tasks for repo: ${repo.name}`);
    const tasks = await kv.listTasks({ repoUuid: params.uuid });

    // Remove pending tasks from the queue
    const taskUuids = tasks.map(task => task.uuid);
    if (taskUuids.length > 0) {
      const removedFromQueue = await kv.removeTasksFromQueue(taskUuids);
      console.log(`[API /api/repos/${params.uuid}] Removed ${removedFromQueue} tasks from queue`);
    }

    // Delete all tasks from database
    const deletedCount = await kv.deleteTasksByRepoUuid(params.uuid);
    console.log(`[API /api/repos/${params.uuid}] Deleted ${deletedCount} tasks`);

    // Delete from database
    await kv.deleteRepo(params.uuid);
    console.log(`[API /api/repos/${params.uuid}] Deleted repo entry: ${repo.name}`);

    // --- Delete local directory in the background ---
    (async () => {
      try {
        const repoPath = getRepoPath(params.uuid);
        console.log(`[API /api/repos/${params.uuid}] Deleting local directory: ${repoPath}`);
        await Deno.remove(repoPath, { recursive: true });
        console.log(`[API /api/repos/${params.uuid}] Successfully deleted local directory.`);
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
          console.error(
            `[API /api/repos/${params.uuid}] Failed to delete local directory:`,
            e
          );
        }
      }
    })();

    return new Response(null, { status: 204 });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/repos/${params.uuid}] Error deleting repo:`, errorMessage);
    throw error(500, `Failed to delete repository: ${errorMessage}`);
  }
};
