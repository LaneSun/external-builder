// src/lib/types.ts

/**
 * Represents a tracked GitLab project.
 */
export interface Repo {
  uuid: string;
  name: string;
  gitlabUrl: string; // GitLab repository URL
  branch: string; // Default branch to build
  templateUuid: string; // Associated build template
  trigger: "push" | "tag" | "manual"; // When to trigger builds
  status: "idle" | "cloning" | "building" | "error";
  lastBuildTaskUuid?: string; // UUID of the last build task
  createdAt: number; // Timestamp of creation
  updatedAt: number; // Timestamp of last update
}

/**
 * Represents a single build job for a repository.
 */
export interface Task {
  uuid: string;
  repoUuid: string;
  status: "pending" | "running" | "success" | "failed";
  startedAt?: number; // Timestamp when the task started
  finishedAt?: number; // Timestamp when the task finished
  logs: string; // Build output logs
  resultPath?: string; // Path to the compressed build artifact
  error?: string; // Error message if the build failed
  createdAt: number; // Timestamp of creation
}

/**
 * Represents a build template with script and configuration.
 */
export interface Template {
  uuid: string;
  name: string;
  description: string;
  executor: "cmd" | "bash"; // Build script executor: cmd.exe or bash
  script: string; // Build script (e.g., for Windows cmd/PowerShell)
  timeout: number; // Build timeout in seconds
  resultPath: string; // Path to the build artifact (relative to repo root)
  successPattern: string; // Regex to match in logs for success
  createdAt: number; // Timestamp of creation
  updatedAt: number; // Timestamp of last update
}

/**
 * Represents the server configuration.
 */
export interface Config {
  maxConcurrentTasks: number;
}
