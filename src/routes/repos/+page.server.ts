// external-builder/src/routes/repos/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv';
import type { PageServerLoad } from './$types';

/**
 * Loads the list of all tracked repositories and available build templates.
 * The templates are needed for the "Add New Repository" form.
 */
export const load: PageServerLoad = async () => {
	try {
		// Fetch repos and templates in parallel
		const [repos, templates] = await Promise.all([
			kv.listRepos(),
			kv.listTemplates()
		]);

		return {
			repos,
			templates
		};
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error('[Repos Load] Failed to load repository list data:', errorMessage);
		throw error(500, 'Could not load repository data. Please check server logs.');
	}
};
