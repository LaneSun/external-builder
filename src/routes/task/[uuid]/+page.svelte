<script lang="ts">
    import type { PageData } from "./$types";
    import {
        ArrowLeft,
        CheckCircle,
        Clock,
        Download,
        GitBranch,
        Hash,
        Loader,
        PlayCircle,
        StopCircle,
        Timer,
        XCircle,
    } from "lucide-svelte";
    import type { Task } from "$lib/types";

    let { data } = $props<{ data: PageData }>();

    // --- State Management with Runes ---
    const task = $derived(data.task);
    const repo = $derived(data.repo);
    const Icon = $derived(getStatusIcon(task.status));

    // --- Helper Functions ---

    function getStatusClasses(status: Task["status"]) {
        switch (status) {
            case "success":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "failed":
                return "bg-red-500/10 text-red-400 border-red-500/20";
            case "running":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "pending":
                return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    }

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
                return Clock;
        }
    }

    function formatTime(timestamp?: number) {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleString();
    }

    function calculateDuration(start?: number, end?: number) {
        if (!start || !end) {
            return "N/A";
        }
        const durationSeconds = Math.round((end - start) / 1000);
        if (durationSeconds < 60) {
            return `${durationSeconds}秒`;
        }
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}分 ${seconds}秒`;
    }

    const duration = $derived(
        calculateDuration(task.startedAt, task.finishedAt),
    );
</script>

<main
    class="p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-300 min-h-screen font-sans"
>
    <div class="max-w-7xl mx-auto">
        <div class="mb-6">
            {#if repo.uuid}
                <a
                    href="/repos/{repo.uuid}"
                    class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft size={16} />
                    返回仓库: {repo.name}
                </a>
            {:else}
                <a
                    href="/"
                    class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft size={16} />
                    返回仪表板
                </a>
            {/if}
        </div>

        <!-- Header -->
        <div
            class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6"
        >
            <div>
                <h1 class="text-3xl font-bold text-white">构建任务详情</h1>
                <p class="text-gray-500 flex items-center gap-2 mt-1">
                    <Hash size={16} />
                    {task.uuid}
                </p>
            </div>
            {#if task.status === "success" && task.resultPath}
                <a
                    href="/api/tasks/{task.uuid}/download"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors self-start sm:self-center"
                    download
                >
                    <Download size={18} />
                    <span>下载构件</span>
                </a>
            {/if}
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h2
                    class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"
                >
                    <CheckCircle size={16} />
                    状态
                </h2>
                <div
                    class="flex items-center gap-2 text-lg px-3 py-1 rounded-full {getStatusClasses(
                        task.status,
                    )} w-fit"
                >
                    <Icon
                        size={18}
                        class={task.status === "running" ? "animate-spin" : ""}
                    />
                    <span class="capitalize font-semibold"
                        >{task.status === "success"
                            ? "成功"
                            : task.status === "failed"
                              ? "失败"
                              : task.status === "running"
                                ? "运行中"
                                : task.status === "pending"
                                  ? "待处理"
                                  : task.status}</span
                    >
                </div>
            </div>
            <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h2
                    class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"
                >
                    <PlayCircle size={16} />
                    创建时间
                </h2>
                <p class="text-lg font-semibold text-white">
                    {formatTime(task.createdAt)}
                </p>
            </div>
            <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h2
                    class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"
                >
                    <StopCircle size={16} />
                    完成时间
                </h2>
                <p class="text-lg font-semibold text-white">
                    {formatTime(task.finishedAt)}
                </p>
            </div>
            <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h2
                    class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"
                >
                    <Timer size={16} />
                    持续时间
                </h2>
                <p class="text-lg font-semibold text-white">{duration}</p>
            </div>
        </div>

        <!-- Error Message -->
        {#if task.status === "failed" && task.error}
            <div
                class="bg-red-900/50 border border-red-500/30 rounded-xl p-6 mb-8"
            >
                <h2
                    class="text-xl font-semibold text-red-300 flex items-center gap-3"
                >
                    <XCircle size={24} />
                    构建失败
                </h2>
                <p
                    class="font-mono bg-black/20 p-3 rounded-md mt-3 text-red-300"
                >
                    {task.error}
                </p>
            </div>
        {/if}

        <!-- Build Logs -->
        <div class="bg-gray-800/50 border border-gray-700 rounded-xl">
            <h2
                class="text-xl font-semibold text-white p-6 border-b border-gray-700"
            >
                构建日志
            </h2>
            <div class="p-6">
                <pre
                    class="bg-black/50 p-4 rounded-lg text-sm text-gray-300 font-mono whitespace-pre-wrap wrap-break-word max-h-[600px] overflow-y-auto">{task.logs}</pre>
            </div>
        </div>
    </div>
</main>
