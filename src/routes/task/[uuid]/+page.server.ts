// external-builder/src/routes/task/[uuid]/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv';
import type { PageServerLoad } from './$types';
import type { Repo } from '$lib/types';

/**
 * Loads the details for a specific build task and enriches it with
 * information about its parent repository.
 */
export const load: PageServerLoad = async ({ params }) => {
	try {
		const { uuid } = params;

		// Fetch the task and its repository in parallel
		const task = await kv.getTask(uuid);

		if (!task) {
			throw error(404, `Task with UUID ${uuid} not found.`);
		}

		// Fetch the associated repository to get its name
		const repo = await kv.getRepo(task.repoUuid);

		return {
			task,
			// Pass the repo name and UUID to the page for context and linking
			repo: {
				name: repo?.name || 'Unknown Repository',
				uuid: repo?.uuid
			} as Pick<Repo, 'name' | 'uuid'>
		};
	} catch (e) {
		// Re-throw SvelteKit's error object if it's one of ours
		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`[Task Page Load] Failed to load data for task ${params.uuid}:`, errorMessage);
		throw error(500, `Could not load task data. Please check server logs.`);
	}
};
