// src/routes/api/repos/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import * as git from '$lib/server/git.server';
import type { Repo } from '$lib/types';

/**
 * GET /api/repos
 * Retrieves a list of all tracked repositories.
 */
export const GET: RequestHandler = async () => {
  try {
    const repos = await kv.listRepos();
    return json(repos);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API /api/repos] Error listing repos:', errorMessage);
    throw error(500, `Failed to list repositories: ${errorMessage}`);
  }
};

/**
 * POST /api/repos
 * Adds a new repository to track and initiates a clone.
 *
 * Expected JSON body:
 * {
 *   "name": "My Project",
 *   "gitlabUrl": "https://gitlab.com/user/project.git",
 *   "branch": "main",
 *   "templateUuid": "..."
 * }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, gitlabUrl, branch, templateUuid } = await request.json();

    // Basic validation
    if (!name || !gitlabUrl || !branch || !templateUuid) {
      throw error(400, 'Missing required fields: name, gitlabUrl, branch, templateUuid');
    }

    // Check if template exists
    const template = await kv.getTemplate(templateUuid);
    if (!template) {
      throw error(400, `Invalid templateUuid: ${templateUuid} not found.`);
    }

    // Check for duplicates
    const existingRepos = await kv.listRepos();
    if (existingRepos.some((r) => r.gitlabUrl === gitlabUrl)) {
      throw error(409, `Repository with URL ${gitlabUrl} is already being tracked.`);
    }

    const newRepo: Repo = {
      uuid: crypto.randomUUID(),
      name,
      gitlabUrl,
      branch,
      templateUuid,
      status: 'cloning', // Initial status
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Save to database first
    await kv.createRepo(newRepo);
    console.log(`[API /api/repos] Created new repo entry: ${newRepo.name} (${newRepo.uuid})`);

    // --- Trigger clone in the background ---
    // We don't await this. The UI can poll for status updates.
    (async () => {
      try {
        console.log(`[API /api/repos] Starting background clone for ${newRepo.name}`);
        const cloneResult = await git.cloneRepo(newRepo);

        const repoToUpdate = await kv.getRepo(newRepo.uuid);
        if (!repoToUpdate) return; // Repo was deleted in the meantime

        if (cloneResult.success) {
          repoToUpdate.status = 'idle';
          console.log(`[API /api/repos] Background clone successful for ${newRepo.name}`);
        } else {
          repoToUpdate.status = 'error';
          console.error(`[API /api/repos] Background clone failed for ${newRepo.name}`);
        }
        repoToUpdate.updatedAt = Date.now();
        await kv.updateRepo(repoToUpdate);
      } catch (e) {
        console.error(`[API /api/repos] Critical error during background clone for ${newRepo.uuid}:`, e);
        const repoToUpdate = await kv.getRepo(newRepo.uuid);
        if (repoToUpdate) {
          repoToUpdate.status = 'error';
          await kv.updateRepo(repoToUpdate);
        }
      }
    })();

    // Respond immediately
    return json(newRepo, { status: 201 });

  } catch (e) {
    // Handle errors thrown by the `error()` helper or other exceptions
    if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
      // This is likely a SvelteKit error object, re-throw it
      throw e;
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[API /api/repos] Error creating repo:', errorMessage);
    throw error(500, `Failed to create repository: ${errorMessage}`);
  }
};
