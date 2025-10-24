// src/routes/api/templates/[uuid]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import type { Template } from '$lib/types';

/**
 * GET /api/templates/[uuid]
 * Retrieves details for a specific build template.
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const template = await kv.getTemplate(params.uuid);
    if (!template) {
      throw error(404, `Template with UUID ${params.uuid} not found.`);
    }
    return json(template);
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/templates/${params.uuid}] Error getting template:`, errorMessage);
    throw error(500, `Failed to retrieve template: ${errorMessage}`);
  }
};

/**
 * PUT /api/templates/[uuid]
 * Updates an existing build template.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const template = await kv.getTemplate(params.uuid);
    if (!template) {
      throw error(404, `Template with UUID ${params.uuid} not found.`);
    }

    const updates = await request.json();

    // Validate executor if it's being updated
    if (updates.executor && updates.executor !== 'cmd' && updates.executor !== 'bash') {
      throw error(400, 'Invalid executor: must be "cmd" or "bash"');
    }

    const updatedTemplate: Template = {
      ...template,
      ...updates,
      uuid: template.uuid, // Ensure UUID cannot be changed
      updatedAt: Date.now()
    };

    await kv.updateTemplate(updatedTemplate);
    console.log(`[API /api/templates/${params.uuid}] Updated template: ${updatedTemplate.name}`);

    return json(updatedTemplate);
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/templates/${params.uuid}] Error updating template:`, errorMessage);
    throw error(500, `Failed to update template: ${errorMessage}`);
  }
};

/**
 * DELETE /api/templates/[uuid]
 * Deletes a build template, only if it's not in use by any repository.
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const template = await kv.getTemplate(params.uuid);
    if (!template) {
      return new Response(null, { status: 204 });
    }

    // Check if any repository is using this template
    const repos = await kv.listRepos();
    const usingRepos = repos.filter((r) => r.templateUuid === params.uuid);
    if (usingRepos.length > 0) {
      const repoNames = usingRepos.map((r) => r.name).join(', ');
      throw error(
        409,
        `Template is in use by the following repositories and cannot be deleted: ${repoNames}`
      );
    }

    await kv.deleteTemplate(params.uuid);
    console.log(`[API /api/templates/${params.uuid}] Deleted template: ${template.name}`);

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) throw e;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[API /api/templates/${params.uuid}] Error deleting template:`, errorMessage);
    throw error(500, `Failed to delete template: ${errorMessage}`);
  }
};
