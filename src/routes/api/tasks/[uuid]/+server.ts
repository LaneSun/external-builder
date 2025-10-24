// src/routes/api/tasks/[uuid]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';

/**
 * GET /api/tasks/[uuid]
 * Retrieves details for a specific build task.
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const task = await kv.getTask(params.uuid);
    if (!task) {
      throw error(404, `Task with UUID ${params.uuid} not found.`);
    }
    return json(task);
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/tasks/${params.uuid}] Error getting task:`, errorMessage);
    throw error(500, `Failed to retrieve task: ${errorMessage}`);
  }
};
