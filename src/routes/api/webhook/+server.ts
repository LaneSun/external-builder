// src/routes/api/webhook/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as kv from '$lib/server/kv.server';
import type { Task } from '$lib/types';

/**
 * A simplified interface for the relevant parts of a GitLab push event payload.
 */
interface GitLabPushEvent {
  object_kind: string;
  ref: string; // e.g., "refs/heads/main" or "refs/tags/v1.0.0"
  project: {
    git_http_url: string;
  };
}

/**
 * Handles incoming webhook requests from GitLab.
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = (await request.json()) as GitLabPushEvent;

    // 1. We only care about push events (which includes tag pushes in GitLab).
    if (payload.object_kind !== 'push') {
      return json({ message: 'Ignoring event: not a push' }, { status: 200 });
    }

    const gitlabUrl = payload.project.git_http_url;
    const isTag = payload.ref.startsWith('refs/tags/');
    const refName = isTag ? payload.ref.replace('refs/tags/', '') : payload.ref.replace('refs/heads/', '');

    // 2. Find if we are tracking this repository.
    // This is inefficient for a large number of repos, but for the expected scale of this
    // project, it's perfectly acceptable. A more optimized approach would require
    // a secondary index on `gitlabUrl`, which Deno KV doesn't support directly.
    const repos = await kv.listRepos();
    const repo = repos.find((r) => r.gitlabUrl === gitlabUrl);

    if (!repo) {
      console.log(`[Webhook] Ignoring push from untracked repository: ${gitlabUrl}`);
      return json({ message: 'Repository not tracked' }, { status: 200 });
    }

    // 3. Check trigger configuration
    if (repo.trigger === 'manual') {
      console.log(
        `[Webhook] Ignoring push for repo ${repo.name} - trigger is set to manual only`
      );
      return json({ message: 'Repository is configured for manual builds only' }, { status: 200 });
    }

    // 4. Check if the event matches the trigger configuration
    if (repo.trigger === 'push' && isTag) {
      console.log(
        `[Webhook] Ignoring tag push for repo ${repo.name} - trigger is set to push only`
      );
      return json({ message: 'Repository is configured for push events only' }, { status: 200 });
    }

    if (repo.trigger === 'tag' && !isTag) {
      console.log(
        `[Webhook] Ignoring branch push for repo ${repo.name} - trigger is set to tag only`
      );
      return json({ message: 'Repository is configured for tag events only' }, { status: 200 });
    }

    // 5. For push triggers, check if the push was to the specific branch we are tracking.
    if (repo.trigger === 'push' && repo.branch !== refName) {
      console.log(
        `[Webhook] Ignoring push to non-tracked branch '${refName}' for repo: ${repo.name}`
      );
      return json({ message: `Ignoring push to non-tracked branch: ${refName}` }, { status: 200 });
    }

    console.log(
      `[Webhook] Received valid ${isTag ? 'tag' : 'push'} event for tracked repo: ${repo.name} (${isTag ? `Tag: ${refName}` : `Branch: ${refName}`})`
    );

    // 4. Create a new build task.
    const newTask: Task = {
      uuid: crypto.randomUUID(),
      repoUuid: repo.uuid,
      status: 'pending',
      logs: `Task created from GitLab webhook push event at ${new Date().toISOString()}`,
      createdAt: Date.now()
    };

    // 5. Save the task to the database and add its UUID to the build queue.
    await kv.createTask(newTask);
    const enqueued = await kv.enqueueTask(newTask.uuid);

    if (enqueued) {
      console.log(
        `[Webhook] Successfully created and enqueued task ${newTask.uuid} for repo ${repo.name}`
      );
      return json(
        { message: 'Build task created and enqueued', taskId: newTask.uuid },
        { status: 201 }
      );
    } else {
      // This should be rare due to the atomic operations in kv.ts
      throw new Error('Failed to enqueue task atomically.');
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[Webhook] Error processing webhook:', errorMessage);
    // Use SvelteKit's error helper to generate a standard error response.
    throw error(500, `Failed to process webhook: ${errorMessage}`);
  }
};
