// src/lib/server/git.ts
import type { Repo } from "$lib/types";
import { join } from "node:path"; // Using node:path for cross-platform compatibility

// Use Deno.cwd() to ensure the path is relative to the project's execution directory.
const REPOS_DIR = join(Deno.cwd(), "builder", "repos");

/**
 * Returns the local file system path for a given repository UUID.
 * @param repoUuid The UUID of the repository.
 * @returns The absolute path to the repository's directory.
 */
export function getRepoPath(repoUuid: string): string {
  return join(REPOS_DIR, repoUuid);
}

/**
 * Checks if a repository has already been cloned locally.
 * @param repoUuid The UUID of the repository.
 * @returns A promise that resolves to true if the repo exists, false otherwise.
 */
export async function isRepoCloned(repoUuid: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(getRepoPath(repoUuid));
    return stat.isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Injects the GitLab token into the repository URL for authentication.
 * @param url The original GitLab repository URL (e.g., https://gitlab.com/user/repo.git).
 * @returns The authenticated URL.
 * @throws {Error} if GITLAB_TOKEN is not set.
 */
function getAuthenticatedUrl(url: string): string {
  const token = import.meta.env.GITLAB_TOKEN;
  if (!token) {
    throw new Error("GITLAB_TOKEN environment variable is not set.");
  }
  // Use the URL constructor to safely insert credentials
  const urlObj = new URL(url);
  urlObj.username = "oauth2";
  urlObj.password = token;
  return urlObj.toString();
}

/**
 * Clones a GitLab repository to the local file system.
 * @param repo The repository object containing URL and UUID.
 * @returns A promise that resolves with the success status and command output.
 */
export async function cloneRepo(
  repo: Repo,
): Promise<{ success: boolean; output: string }> {
  const repoPath = getRepoPath(repo.uuid);
  const authUrl = getAuthenticatedUrl(repo.gitlabUrl);

  console.log(`[Git] Cloning ${repo.gitlabUrl} into ${repoPath}...`);

  const command = new Deno.Command("git", {
    args: [
      "clone",
      "--branch",
      repo.branch,
      "--depth",
      "1", // Shallow clone for efficiency
      authUrl,
      repoPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const output =
    new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

  if (code === 0) {
    console.log(`[Git] Successfully cloned ${repo.name}.`);
    return { success: true, output };
  } else {
    console.error(`[Git] Failed to clone ${repo.name}. Output:\n${output}`);
    // Clean up the failed clone attempt to prevent partial directories
    await Deno.remove(repoPath, { recursive: true }).catch(() => {});
    return { success: false, output };
  }
}

/**
 * Pulls the latest changes for an already cloned repository.
 * This function temporarily sets the remote URL with an auth token for the pull operation
 * and then reverts it to avoid storing credentials in the .git/config file.
 * @param repo The repository object.
 * @returns A promise that resolves with the success status and command output.
 */
export async function pullRepo(
  repo: Repo,
): Promise<{ success: boolean; output: string }> {
  const repoPath = getRepoPath(repo.uuid);
  console.log(`[Git] Pulling latest changes for ${repo.name}...`);

  const authUrl = getAuthenticatedUrl(repo.gitlabUrl);

  // 1. Temporarily set the remote URL to include the auth token
  const setUrlCmd = new Deno.Command("git", {
    args: ["remote", "set-url", "origin", authUrl],
    cwd: repoPath,
  });
  const setUrlResult = await setUrlCmd.output();
  if (setUrlResult.code !== 0) {
    return {
      success: false,
      output: new TextDecoder().decode(setUrlResult.stderr),
    };
  }

  // 2. Pull the latest changes
  const pullCmd = new Deno.Command("git", {
    args: ["pull", "origin", repo.branch],
    cwd: repoPath,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await pullCmd.output();
  const output =
    new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

  // 3. Revert the remote URL to the original one to remove the token
  const unsetUrlCmd = new Deno.Command("git", {
    args: ["remote", "set-url", "origin", repo.gitlabUrl],
    cwd: repoPath,
  });
  await unsetUrlCmd.output();

  if (code === 0) {
    console.log(`[Git] Successfully pulled changes for ${repo.name}.`);
    return { success: true, output };
  } else {
    console.error(
      `[Git] Failed to pull changes for ${repo.name}. Output:\n${output}`,
    );
    return { success: false, output };
  }
}
