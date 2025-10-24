// external-builder/src/routes/+page.server.ts

import { error } from '@sveltejs/kit';
import * as kv from '$lib/server/kv.server';
import type { PageServerLoad } from './$types';
import type { Repo, Task } from '$lib/types';

// Define an enriched task type for the frontend
type EnrichedTask = Task & { repoName: string };

/**
 * Loads the necessary data for the main dashboard page from the server.
 */
export const load: PageServerLoad = async () => {
	try {
		// Fetch all necessary data from DenoKV in parallel for efficiency
		const [allTasks, allRepos, queueUuids] = await Promise.all([
			kv.listTasks(),
			kv.listRepos(),
			kv.getQueue()
		]);

		// Create maps for efficient lookups, which is better than nested loops.
		const repoMap = new Map<string, Repo>(allRepos.map((repo) => [repo.uuid, repo]));
		const taskMap = new Map<string, Task>(allTasks.map((task) => [task.uuid, task]));

		/**
		 * Helper function to enrich a task object with its corresponding repository name.
		 * @param task The task to enrich.
		 * @returns An enriched task or null if the repo is not found.
		 */
		const enrichTask = (task: Task | undefined): EnrichedTask | null => {
			if (!task) return null;
			const repoName = repoMap.get(task.repoUuid)?.name || 'Unknown Repo';
			return { ...task, repoName };
		};

		// Filter tasks that are currently running
		const runningTasks = allTasks.filter((t) => t.status === 'running').map(enrichTask).filter(Boolean) as EnrichedTask[];

		// Get the full task objects for tasks that are pending in the queue
		const pendingTasks = queueUuids.map((uuid) => taskMap.get(uuid)).map(enrichTask).filter(Boolean) as EnrichedTask[];

		// Get the 10 most recently completed (success or failed) tasks
		const recentCompletedTasks = allTasks
			.filter((t) => t.status === 'success' || t.status === 'failed')
			.sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)) // Sort by finish time, descending
			.slice(0, 10)
			.map(enrichTask)
			.filter(Boolean) as EnrichedTask[];

		return {
			// Return the data structured for easy consumption by the dashboard page.
			summary: {
				trackedReposCount: allRepos.length,
				runningTasksCount: runningTasks.length,
				pendingTasksCount: pendingTasks.length
			},
			runningTasks,
			pendingTasks,
			recentCompletedTasks
		};
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error('[Dashboard Load] Failed to load dashboard data:', errorMessage);
		// Throw a standard SvelteKit error to render the nearest +error.svelte page
		throw error(500, 'Could not load dashboard data. Please check server logs.');
	}
};
