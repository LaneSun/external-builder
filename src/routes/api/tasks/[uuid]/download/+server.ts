// src/routes/api/tasks/[uuid]/download/+server.ts

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import { join } from 'node:path';

const BUILDS_DIR = join(Deno.cwd(), 'builder', 'builds');

/**
 * GET /api/tasks/[uuid]/download
 * Serves the build artifact for a specific task.
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const task = await kv.getTask(params.uuid);
		if (!task) {
			throw error(404, `Task with UUID ${params.uuid} not found.`);
		}

		if (task.status !== 'success' || !task.resultPath) {
			throw error(404, `No successful build artifact found for task ${params.uuid}.`);
		}

		const artifactPath = join(BUILDS_DIR, task.resultPath);

		// Use Deno.readFile to get the file content as a Uint8Array
		const fileBytes = await Deno.readFile(artifactPath);

		// Create a response with the file content
		return new Response(fileBytes, {
			status: 200,
			headers: {
				'Content-Type': 'application/zip',
				// Suggest a filename to the browser
				'Content-Disposition': `attachment; filename="build-${task.repoUuid.substring(0, 8)}-${task.createdAt}.zip"`
			}
		});
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) {
			throw error(404, 'Artifact file not found on disk.');
		}
		if (e && typeof e === 'object' && 'status' in e) {
			throw e; // Re-throw SvelteKit's error object
		}
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`[API /api/tasks/${params.uuid}/download] Error serving artifact:`, errorMessage);
		throw error(500, `Failed to serve artifact: ${errorMessage}`);
	}
};
