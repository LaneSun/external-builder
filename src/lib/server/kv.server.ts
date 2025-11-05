import type { Repo, Task, Template } from "$lib/types";
import { openKv } from "rakiyu-deno-kv";

// Initialize Deno KV.
// You can specify a path in your .env file, e.g., KV_PATH=./builder/kv.db
await Deno.mkdir("./builder", { recursive: true });
const kv = await openKv("./builder/kv.db");

// --- Repo Functions ---

export async function getRepo(uuid: string): Promise<Repo | null> {
  const res = await kv.get<Repo>(["repos", uuid]);
  const repo = res.value;
  if (!repo) return null;

  // Add backward compatibility for trigger field
  if (!repo.trigger) {
    repo.trigger = "push";
  }

  return repo;
}

export async function listRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];
  for await (const entry of kv.list<Repo>({ prefix: ["repos"] })) {
    const repo = entry.value;

    // Add backward compatibility for trigger field
    if (!repo.trigger) {
      repo.trigger = "push";
    }

    repos.push(repo);
  }
  return repos.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createRepo(repo: Repo): Promise<void> {
  await kv.set(["repos", repo.uuid], repo);
}

export async function updateRepo(repo: Repo): Promise<void> {
  await kv.set(["repos", repo.uuid], repo);
}

export async function deleteRepo(uuid: string): Promise<void> {
  await kv.delete(["repos", uuid]);
}

// --- Task Functions ---

export async function getTask(uuid: string): Promise<Task | null> {
  const res = await kv.get<Task>(["tasks", uuid]);
  return res.value;
}

export async function listTasks(
  options: { repoUuid?: string; limit?: number } = {},
): Promise<Task[]> {
  const tasks: Task[] = [];
  // This is inefficient for large datasets, but Deno KV doesn't have secondary indexes yet.
  // For this project's scale, it's acceptable.
  for await (const entry of kv.list<Task>({ prefix: ["tasks"] })) {
    if (options.repoUuid && entry.value.repoUuid !== options.repoUuid) {
      continue;
    }
    tasks.push(entry.value);
  }

  const sortedTasks = tasks.sort((a, b) => b.createdAt - a.createdAt);

  if (options.limit) {
    return sortedTasks.slice(0, options.limit);
  }

  return sortedTasks;
}

export async function createTask(task: Task): Promise<void> {
  await kv.set(["tasks", task.uuid], task);
}

export async function updateTask(task: Task): Promise<void> {
  await kv.set(["tasks", task.uuid], task);
}

export async function deleteTask(uuid: string): Promise<void> {
  await kv.delete(["tasks", uuid]);
}

/**
 * Deletes all tasks associated with a specific repository UUID.
 * @param repoUuid The repository UUID.
 * @returns The number of tasks deleted.
 */
export async function deleteTasksByRepoUuid(repoUuid: string): Promise<number> {
  const tasks = await listTasks({ repoUuid });
  let deletedCount = 0;

  for (const task of tasks) {
    await deleteTask(task.uuid);
    deletedCount++;
  }

  return deletedCount;
}

// --- Template Functions ---

export async function getTemplate(uuid: string): Promise<Template | null> {
  const res = await kv.get<Template>(["templates", uuid]);
  return res.value;
}

export async function listTemplates(): Promise<Template[]> {
  const templates: Template[] = [];
  for await (const entry of kv.list<Template>({ prefix: ["templates"] })) {
    templates.push(entry.value);
  }
  return templates.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTemplate(template: Template): Promise<void> {
  await kv.set(["templates", template.uuid], template);
}

export async function updateTemplate(template: Template): Promise<void> {
  await kv.set(["templates", template.uuid], template);
}

export async function deleteTemplate(uuid: string): Promise<void> {
  await kv.delete(["templates", uuid]);
}

// --- Queue Functions ---

const QUEUE_KEY = ["queue"];

export async function getQueue(): Promise<string[]> {
  const res = await kv.get<string[]>(QUEUE_KEY);
  return res.value ?? [];
}

export async function enqueueTask(taskUuid: string): Promise<boolean> {
  let success = false;
  while (!success) {
    const res = await kv.get<string[]>(QUEUE_KEY);
    const queue = res.value ?? [];
    queue.push(taskUuid);
    // Use check to ensure atomicity
    const atomicRes = await kv
      .atomic()
      .check(res)
      .set(QUEUE_KEY, queue)
      .commit();
    success = atomicRes.ok;
  }
  return success;
}

export async function dequeueTask(): Promise<string | null> {
  let dequeuedTaskUuid: string | null = null;
  let success = false;

  while (!success) {
    const res = await kv.get<string[]>(QUEUE_KEY);
    const queue = res.value ?? [];

    if (queue.length === 0) {
      return null; // Queue is empty
    }

    dequeuedTaskUuid = queue.shift()!; // Remove the first item

    // Use check to ensure atomicity
    const atomicRes = await kv
      .atomic()
      .check(res)
      .set(QUEUE_KEY, queue)
      .commit();
    success = atomicRes.ok;
  }

  return dequeuedTaskUuid;
}

/**
 * Removes a specific task UUID from the queue.
 * @param taskUuid The UUID of the task to remove.
 * @returns True if the task was found and removed, false otherwise.
 */
export async function removeTaskFromQueue(taskUuid: string): Promise<boolean> {
  let success = false;
  let found = false;

  while (!success) {
    const res = await kv.get<string[]>(QUEUE_KEY);
    const queue = res.value ?? [];

    const index = queue.indexOf(taskUuid);
    if (index !== -1) {
      queue.splice(index, 1);
      found = true;
    } else {
      return false; // Task not found in queue
    }

    // Use check to ensure atomicity
    const atomicRes = await kv
      .atomic()
      .check(res)
      .set(QUEUE_KEY, queue)
      .commit();
    success = atomicRes.ok;
  }

  return found;
}

/**
 * Removes multiple task UUIDs from the queue.
 * @param taskUuids Array of task UUIDs to remove.
 * @returns The number of tasks successfully removed.
 */
export async function removeTasksFromQueue(taskUuids: string[]): Promise<number> {
  let success = false;
  let removedCount = 0;

  while (!success) {
    const res = await kv.get<string[]>(QUEUE_KEY);
    const queue = res.value ?? [];

    const filteredQueue = queue.filter(uuid => {
      if (taskUuids.includes(uuid)) {
        removedCount++;
        return false;
      }
      return true;
    });

    if (removedCount === 0) {
      return 0; // No tasks found in queue
    }

    // Use check to ensure atomicity
    const atomicRes = await kv
      .atomic()
      .check(res)
      .set(QUEUE_KEY, filteredQueue)
      .commit();
    success = atomicRes.ok;
  }

  return removedCount;
}
