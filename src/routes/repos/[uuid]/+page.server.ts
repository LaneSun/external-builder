// external-builder/src/routes/repos/[uuid]/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv.server';
import type { PageServerLoad } from './$types';

/**
 * Loads the details for a specific repository, its build history,
 * and the list of available templates for editing.
 */
export const load: PageServerLoad = async ({ params }) => {
	try {
		const { uuid } = params;

		// Fetch the repository, its tasks, and all templates in parallel
		const [repo, tasks, templates] = await Promise.all([
			kv.getRepo(uuid),
			kv.listTasks({ repoUuid: uuid }), // Get tasks filtered by this repo's UUID
			kv.listTemplates()
		]);

		// If the repo doesn't exist, it's a 404
		if (!repo) {
			throw error(404, `Repository with UUID ${uuid} not found.`);
		}

		return {
			repo,
			tasks,
			templates
		};
	} catch (e) {
		// Re-throw SvelteKit's error object if it's one of ours
		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`[Repo Page Load] Failed to load data for repo ${params.uuid}:`, errorMessage);
		throw error(500, `Could not load repository data. Please check server logs.`);
	}
};
