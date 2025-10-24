import type { Repo, Task, Template } from "$lib/types";

// Initialize Deno KV.
// You can specify a path in your .env file, e.g., KV_PATH=./builder/kv.db
const kv = await Deno.openKv(import.meta.env.KV_PATH);

// --- Repo Functions ---

export async function getRepo(uuid: string): Promise<Repo | null> {
  const res = await kv.get<Repo>(["repos", uuid]);
  return res.value;
}

export async function listRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];
  for await (const entry of kv.list<Repo>({ prefix: ["repos"] })) {
    repos.push(entry.value);
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
