// src/lib/server/build.ts

import * as kv from "$lib/server/kv";
import * as git from "$lib/server/git";
import type { Repo, Task, Template } from "$lib/types";
import { join } from "node:path";

const BUILDS_DIR = join(Deno.cwd(), "builder", "builds");

/**
 * A helper function to update a task to a 'failed' state.
 * @param task The task object to update.
 * @param error The error message.
 * @param logs The accumulated logs.
 */
async function failTask(
  task: Task,
  error: string,
  logs: string,
): Promise<void> {
  console.error(`[Build] Task ${task.uuid} failed: ${error}`);
  await kv.updateTask({
    ...task,
    status: "failed",
    finishedAt: Date.now(),
    error,
    logs: `${logs}\n\n--- ERROR ---\n${error}`,
  });
}

/**
 * Executes a build for a given task. This function handles the entire lifecycle
 * of a build, from pulling code to packaging artifacts. It's designed to be
 * called in the background and not awaited.
 * @param taskUuid The UUID of the task to execute.
 */
export async function executeBuild(taskUuid: string): Promise<void> {
  // 1. Fetch all necessary data from KV
  const task = await kv.getTask(taskUuid);
  if (!task) {
    console.error(`[Build] CRITICAL: Task ${taskUuid} not found.`);
    return;
  }

  const repo = await kv.getRepo(task.repoUuid);
  if (!repo) {
    await failTask(
      task,
      `Repository with UUID ${task.repoUuid} not found.`,
      "",
    );
    return;
  }

  const template = await kv.getTemplate(repo.templateUuid);
  if (!template) {
    await failTask(
      task,
      `Template with UUID ${repo.templateUuid} not found.`,
      "",
    );
    return;
  }

  // 2. Initial state update: Mark task and repo as 'running'/'building'
  let logs = "Build process initiated...\n";
  task.status = "running";
  task.startedAt = Date.now();
  task.logs = logs;
  await kv.updateTask(task);

  repo.status = "building";
  repo.lastBuildTaskUuid = task.uuid;
  await kv.updateRepo(repo);

  try {
    // 3. Pull latest code
    logs += "\n--- Git Pull ---\n";
    console.log(`[Build] Pulling repository for task ${task.uuid}`);
    const pullResult = await git.pullRepo(repo);
    logs += pullResult.output + "\n";
    await kv.updateTask({ ...task, logs });

    if (!pullResult.success) {
      throw new Error("Failed to pull repository.");
    }

    // 4. Execute the build script
    logs += "\n--- Build Script ---\n";
    console.log(`[Build] Executing script for task ${task.uuid}`);
    const repoPath = git.getRepoPath(repo.uuid);

    const scriptCommand = new Deno.Command("cmd.exe", {
      args: ["/c", template.script],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `Build script timed out after ${template.timeout} seconds.`,
            ),
          ),
        template.timeout * 1000,
      );
    });

    const scriptOutput = await Promise.race([
      scriptCommand.output(),
      timeoutPromise,
    ]);
    const scriptLogs =
      new TextDecoder().decode(scriptOutput.stdout) +
      new TextDecoder().decode(scriptOutput.stderr);
    logs += scriptLogs + "\n";
    await kv.updateTask({ ...task, logs });

    if (scriptOutput.code !== 0) {
      throw new Error(
        `Build script failed with exit code ${scriptOutput.code}.`,
      );
    }

    // 5. Check for success pattern in logs
    logs += "\n--- Success Pattern Check ---\n";
    const successRegex = new RegExp(template.successPattern, "i");
    if (!successRegex.test(scriptLogs)) {
      logs += `Failed: Output did not match the success pattern: /${template.successPattern}/i\n`;
      await kv.updateTask({ ...task, logs });
      throw new Error("Build output did not match success pattern.");
    }
    logs += "Success pattern matched.\n";
    await kv.updateTask({ ...task, logs });

    // 6. Package build artifacts
    logs += "\n--- Packaging Artifacts ---\n";
    console.log(`[Build] Packaging artifacts for task ${task.uuid}`);
    const artifactSourcePath = join(repoPath, template.resultPath);
    const taskBuildDir = join(BUILDS_DIR, task.uuid);
    const artifactDestPath = join(taskBuildDir, "result.zip");

    await Deno.mkdir(taskBuildDir, { recursive: true });

    // Using PowerShell for robust, built-in compression on Windows
    const packageCommand = new Deno.Command("powershell.exe", {
      args: [
        "-Command",
        `Compress-Archive -Path "${artifactSourcePath}" -DestinationPath "${artifactDestPath}" -Force`,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const packageOutput = await packageCommand.output();
    const packageLogs =
      new TextDecoder().decode(packageOutput.stdout) +
      new TextDecoder().decode(packageOutput.stderr);
    logs += packageLogs + "\n";
    await kv.updateTask({ ...task, logs });

    if (packageOutput.code !== 0) {
      throw new Error("Failed to package build artifacts.");
    }

    // 7. Final Success Update
    console.log(`[Build] Task ${task.uuid} completed successfully.`);
    await kv.updateTask({
      ...task,
      status: "success",
      finishedAt: Date.now(),
      logs,
      resultPath: join(task.uuid, "result.zip"), // Relative path for download
    });
  } catch (error) {
    // Centralized error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    await failTask(task, errorMessage, logs);
  } finally {
    // 8. Reset repo status
    const finalRepo = await kv.getRepo(repo.uuid);
    if (finalRepo) {
      finalRepo.status = "idle";
      await kv.updateRepo(finalRepo);
      console.log(`[Build] Repository ${repo.name} status reset to idle.`);
    }
  }
}
