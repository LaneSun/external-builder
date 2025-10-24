// src/routes/api/templates/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import type { Template } from '$lib/types';

/**
 * GET /api/templates
 * Retrieves a list of all build templates.
 */
export const GET: RequestHandler = async () => {
  try {
    const templates = await kv.listTemplates();
    return json(templates);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API /api/templates] Error listing templates:', errorMessage);
    throw error(500, `Failed to list templates: ${errorMessage}`);
  }
};

/**
 * POST /api/templates
 * Creates a new build template.
 *
 * Expected JSON body:
 * {
 *   "name": "SvelteKit Build",
 *   "description": "Builds a standard SvelteKit project.",
 *   "script": "npm install && npm run build",
 *   "timeout": 600, // in seconds
 *   "resultPath": "build/",
 *   "successPattern": "✓ built in"
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, description, executor, script, timeout, resultPath, successPattern } =
      await request.json();

    // Basic validation
    if (!name || !executor || !script || !timeout || !resultPath || !successPattern) {
      throw error(
        400,
        'Missing required fields: name, executor, script, timeout, resultPath, successPattern'
      );
    }

    // Validate executor
    if (executor !== 'cmd' && executor !== 'bash') {
      throw error(400, 'Invalid executor: must be "cmd" or "bash"');
    }

    const newTemplate: Template = {
      uuid: crypto.randomUUID(),
      name,
      description: description || '',
      executor: executor as 'cmd' | 'bash',
      script,
      timeout: Number(timeout),
      resultPath,
      successPattern,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await kv.createTemplate(newTemplate);
    console.log(`[API /api/templates] Created new template: ${newTemplate.name}`);

    return json(newTemplate, { status: 201 });
  } catch (e) {
    if (e && typeof e === 'object' && 'status' in e) {
      throw e; // Re-throw SvelteKit's error object
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API /api/templates] Error creating template:', errorMessage);
    throw error(500, `Failed to create template: ${errorMessage}`);
  }
};
