// external-builder/src/routes/templates/[uuid]/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv';
import type { PageServerLoad } from './$types';

/**
 * Loads the details for a specific build template and checks if it's in use.
 */
export const load: PageServerLoad = async ({ params }) => {
	try {
		const { uuid } = params;

		const template = await kv.getTemplate(uuid);

		if (!template) {
			throw error(404, `Template with UUID ${uuid} not found.`);
		}

		// Find out if this template is currently in use to inform the UI.
		const allRepos = await kv.listRepos();
		const usedByRepos = allRepos.filter((repo) => repo.templateUuid === uuid);

		return {
			template,
			// Pass information about usage to the client
			usage: {
				isDeletable: usedByRepos.length === 0,
				usedBy: usedByRepos.map((repo) => ({ uuid: repo.uuid, name: repo.name }))
			}
		};
	} catch (e) {
		// Re-throw SvelteKit's error object if it's one of ours
		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error(`[Template Page Load] Failed to load data for template ${params.uuid}:`, errorMessage);
		throw error(500, `Could not load template data. Please check server logs.`);
	}
};
