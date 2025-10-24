<script lang="ts">
    import type { PageData } from "./$types";
    // For icons, you might need to run: npm install lucide-svelte
    import {
        CheckCircle,
        GitBranch,
        Loader,
        Server,
        XCircle,
        Clock,
        History,
    } from "lucide-svelte";

    let { data } = $props();

    /**
     * Formats a Unix timestamp into a human-readable local date and time string.
     */
    function formatTime(timestamp?: number) {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleString();
    }

    /**
     * Returns Tailwind CSS classes for a given task status to color-code badges.
     */
    function getStatusClasses(status: Task["status"]) {
        switch (status) {
            case "success":
                return "bg-green-500/10 text-green-400 border border-green-500/20";
            case "failed":
                return "bg-red-500/10 text-red-400 border border-red-500/20";
            case "running":
                return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            case "pending":
                return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
        }
    }

    /**
     * Returns the appropriate icon component for a given task status.
     */
    function getStatusIcon(status: Task["status"]) {
        switch (status) {
            case "success":
                return CheckCircle;
            case "failed":
                return XCircle;
            case "running":
                return Loader;
            case "pending":
                return Clock;
            default:
                return History;
        }
    }

    // Reactive declarations with Svelte 5 Runes
    const summary = $derived(data.summary);
    const runningTasks = $derived(data.runningTasks);
    const pendingTasks = $derived(data.pendingTasks);
    const recentCompletedTasks = $derived(data.recentCompletedTasks);

    type Task = (typeof data.runningTasks)[number];
</script>

<main
    class="p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-300 min-h-screen font-sans"
>
    <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold mb-6 text-white">仪表板</h1>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex items-center gap-4"
            >
                <div
                    class="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20"
                >
                    <GitBranch class="text-indigo-400" size={24} />
                </div>
                <div>
                    <h2 class="text-sm font-medium text-gray-400">
                        跟踪的仓库
                    </h2>
                    <p class="text-3xl font-semibold text-white mt-1">
                        {summary.trackedReposCount}
                    </p>
                </div>
            </div>
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex items-center gap-4"
            >
                <div
                    class="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20"
                >
                    <Loader class="text-blue-400" size={24} />
                </div>
                <div>
                    <h2 class="text-sm font-medium text-gray-400">
                        运行中的任务
                    </h2>
                    <p class="text-3xl font-semibold text-blue-400 mt-1">
                        {summary.runningTasksCount}
                    </p>
                </div>
            </div>
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex items-center gap-4"
            >
                <div
                    class="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20"
                >
                    <Clock class="text-yellow-400" size={24} />
                </div>
                <div>
                    <h2 class="text-sm font-medium text-gray-400">构建队列</h2>
                    <p class="text-3xl font-semibold text-yellow-400 mt-1">
                        {summary.pendingTasksCount}
                    </p>
                </div>
            </div>
        </div>

        <!-- Task Lists -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left Column: Active & Queued -->
            <div class="space-y-8">
                <section>
                    <h2 class="text-xl font-semibold mb-4 text-white">
                        活跃的构建
                    </h2>
                    <div class="space-y-4">
                        {#if runningTasks.length > 0}
                            {#each runningTasks as task (task.uuid)}
                                {@const Icon = getStatusIcon(task.status)}
                                <div
                                    class="bg-gray-800 border border-gray-700 rounded-lg p-4 transition hover:border-blue-500/50"
                                >
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <div>
                                            <p class="font-semibold text-white">
                                                {task.repoName}
                                            </p>
                                            <a
                                                href="/task/{task.uuid}"
                                                class="text-xs text-gray-500 hover:text-gray-300 transition"
                                            >
                                                任务: {task.uuid.substring(
                                                    0,
                                                    8,
                                                )}
                                            </a>
                                        </div>
                                        <div
                                            class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-full {getStatusClasses(
                                                task.status,
                                            )}"
                                        >
                                            <Icon
                                                size={14}
                                                class={task.status === "running"
                                                    ? "animate-spin"
                                                    : ""}
                                            />
                                            <span class="capitalize font-medium"
                                                >{task.status}</span
                                            >
                                        </div>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-3">
                                        开始时间: {formatTime(task.startedAt)}
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            <div
                                class="text-center py-8 px-4 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg"
                            >
                                <Server
                                    class="mx-auto text-gray-600"
                                    size={32}
                                />
                                <p class="mt-2 text-gray-500">
                                    当前没有任务运行。
                                </p>
                            </div>
                        {/if}
                    </div>
                </section>

                <section>
                    <h2 class="text-xl font-semibold mb-4 text-white">
                        构建队列
                    </h2>
                    <div class="space-y-4">
                        {#if pendingTasks.length > 0}
                            {#each pendingTasks as task (task.uuid)}
                                {@const Icon = getStatusIcon(task.status)}
                                <div
                                    class="bg-gray-800 border border-gray-700 rounded-lg p-4 transition hover:border-yellow-500/50"
                                >
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <div>
                                            <p class="font-semibold text-white">
                                                {task.repoName}
                                            </p>
                                            <a
                                                href="/task/{task.uuid}"
                                                class="text-xs text-gray-500 hover:text-gray-300 transition"
                                            >
                                                任务: {task.uuid.substring(
                                                    0,
                                                    8,
                                                )}
                                            </a>
                                        </div>
                                        <div
                                            class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-full {getStatusClasses(
                                                task.status,
                                            )}"
                                        >
                                            <Icon size={14} />
                                            <span class="capitalize font-medium"
                                                >{task.status}</span
                                            >
                                        </div>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-3">
                                        创建时间: {formatTime(task.createdAt)}
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            <div
                                class="text-center py-8 px-4 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg"
                            >
                                <CheckCircle
                                    class="mx-auto text-gray-600"
                                    size={32}
                                />
                                <p class="mt-2 text-gray-500">构建队列为空。</p>
                            </div>
                        {/if}
                    </div>
                </section>
            </div>

            <!-- Right Column: Recent History -->
            <section>
                <h2 class="text-xl font-semibold mb-4 text-white">
                    最近构建历史
                </h2>
                <div class="space-y-4">
                    {#if recentCompletedTasks.length > 0}
                        {#each recentCompletedTasks as task (task.uuid)}
                            {@const Icon = getStatusIcon(task.status)}
                            <div
                                class="bg-gray-800 border border-gray-700 rounded-lg p-4 transition hover:border-gray-600"
                            >
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold text-white">
                                            {task.repoName}
                                        </p>
                                        <a
                                            href="/task/{task.uuid}"
                                            class="text-xs text-gray-500 hover:text-gray-300 transition"
                                        >
                                            任务: {task.uuid.substring(0, 8)}
                                        </a>
                                    </div>
                                    <div
                                        class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-full {getStatusClasses(
                                            task.status,
                                        )}"
                                    >
                                        <Icon size={14} />
                                        <span class="capitalize font-medium"
                                            >{task.status}</span
                                        >
                                    </div>
                                </div>
                                <div class="text-xs text-gray-400 mt-3">
                                    完成时间: {formatTime(task.finishedAt)}
                                </div>
                            </div>
                        {/each}
                    {:else}
                        <div
                            class="text-center py-8 px-4 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg"
                        >
                            <History class="mx-auto text-gray-600" size={32} />
                            <p class="mt-2 text-gray-500">
                                没有最近的构建历史。
                            </p>
                        </div>
                    {/if}
                </div>
            </section>
        </div>
    </div>
</main>
