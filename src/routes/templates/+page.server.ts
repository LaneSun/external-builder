// external-builder/src/routes/templates/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv';
import type { PageServerLoad } from './$types';

/**
 * Loads the list of all build templates.
 */
export const load: PageServerLoad = async () => {
	try {
		const templates = await kv.listTemplates();
		return {
			templates
		};
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error('[Templates Load] Failed to load template list data:', errorMessage);
		throw error(500, 'Could not load template data. Please check server logs.');
	}
};
