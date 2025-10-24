<script lang="ts">
    import type { PageData } from "./$types";
    import {
        GitBranch,
        GitCommit,
        Save,
        Server,
        Trash2,
        X,
        Loader,
        CheckCircle,
        XCircle,
        AlertTriangle,
        Edit,
        ArrowLeft,
        History,
        Play,
    } from "lucide-svelte";
    import type { Repo, Template, Task } from "$lib/types";
    import { invalidateAll, goto } from "$app/navigation";

    let { data } = $props<{ data: PageData }>();

    // --- State Management with Runes ---
    const repo = $derived(data.repo);
    const tasks = $derived(data.tasks);
    const templates = $derived(data.templates);

    let isEditing = $state(false);
    let isDeleting = $state(false);
    let isSubmitting = $state(false);
    let formError = $state<string | null>(null);

    // State for the edit form, initialized from the repo data
    let editData = $state({
        name: data.repo.name,
        branch: data.repo.branch,
        templateUuid: data.repo.templateUuid,
    });

    // --- Helper Functions ---

    function getStatusClasses(status: Task["status"] | Repo["status"]) {
        switch (status) {
            case "success":
            case "idle":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "failed":
            case "error":
                return "bg-red-500/10 text-red-400 border-red-500/20";
            case "running":
            case "building":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "pending":
            case "cloning":
                return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    }

    function getStatusIcon(status: Task["status"] | Repo["status"]) {
        switch (status) {
            case "success":
            case "idle":
                return CheckCircle;
            case "failed":
            case "error":
                return XCircle;
            case "running":
            case "building":
            case "cloning":
                return Loader;
            case "pending":
                return History;
            default:
                return AlertTriangle;
        }
    }

    function formatTime(timestamp?: number) {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleString();
    }

    function startEditing() {
        editData.name = repo.name;
        editData.branch = repo.branch;
        editData.templateUuid = repo.templateUuid;
        formError = null;
        isEditing = true;
    }

    // --- API Interactions ---

    async function handleUpdate(e: Event) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        formError = null;

        try {
            const response = await fetch(`/api/repos/${repo.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "更新仓库失败。");
            }

            isEditing = false;
            await invalidateAll();
        } catch (e) {
            formError = e instanceof Error ? e.message : "发生未知错误。";
        } finally {
            isSubmitting = false;
        }
    }

    async function handleDelete() {
        if (isSubmitting) return;
        isSubmitting = true;

        try {
            const response = await fetch(`/api/repos/${repo.uuid}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "删除仓库失败。");
            }

            // On successful deletion, navigate back to the repos list
            await goto("/repos");
        } catch (e) {
            formError = e instanceof Error ? e.message : "发生未知错误。";
            isDeleting = false; // Close the modal but show the error
        } finally {
            isSubmitting = false;
        }
    }
</script>

<main
    class="p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-300 min-h-screen font-sans"
>
    <div class="max-w-7xl mx-auto">
        <div class="mb-6">
            <a
                href="/repos"
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
            >
                <ArrowLeft size={16} />
                返回仓库
            </a>
        </div>

        <!-- Header -->
        <div
            class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6"
        >
            <div>
                <h1 class="text-3xl font-bold text-white">{repo.name}</h1>
                <p class="text-gray-400 break-all">{repo.gitlabUrl}</p>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-center">
                <button
                    onclick={startEditing}
                    class="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-white bg-gray-600/50 hover:bg-gray-600 transition-colors"
                >
                    <Edit size={16} />
                    <span>编辑</span>
                </button>
                <button
                    onclick={() => (isDeleting = true)}
                    class="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-colors"
                >
                    <Trash2 size={16} />
                    <span>删除</span>
                </button>
            </div>
        </div>

        <!-- Edit Form -->
        {#if isEditing}
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8"
            >
                <h2 class="text-xl font-semibold mb-4 text-white">编辑仓库</h2>
                <form onsubmit={handleUpdate} class="space-y-4">
                    <div>
                        <label
                            for="name"
                            class="block text-sm font-medium text-gray-400 mb-1"
                            >名称</label
                        >
                        <input
                            id="name"
                            type="text"
                            bind:value={editData.name}
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                for="branch"
                                class="block text-sm font-medium text-gray-400 mb-1"
                                >分支</label
                            >
                            <input
                                id="branch"
                                type="text"
                                bind:value={editData.branch}
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label
                                for="template"
                                class="block text-sm font-medium text-gray-400 mb-1"
                                >构建模板</label
                            >
                            <select
                                id="template"
                                bind:value={editData.templateUuid}
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {#each templates as template (template.uuid)}
                                    <option value={template.uuid}
                                        >{template.name}</option
                                    >
                                {/each}
                            </select>
                        </div>
                    </div>

                    {#if formError}
                        <div
                            class="bg-red-500/10 text-red-400 p-3 rounded-md text-sm"
                        >
                            <strong>错误:</strong>
                            {formError}
                        </div>
                    {/if}

                    <div class="flex justify-end gap-4">
                        <button
                            type="button"
                            onclick={() => (isEditing = false)}
                            class="px-5 py-2.5 rounded-lg font-semibold text-gray-300 bg-gray-600/50 hover:bg-gray-600 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            class="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {#if isSubmitting}
                                <Loader class="animate-spin" size={20} />
                                <span>保存中...</span>
                            {:else}
                                <Save size={20} />
                                <span>保存更改</span>
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        <!-- Build History -->
        <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 class="text-xl font-semibold mb-4 text-white">构建历史</h2>
            <div class="space-y-4">
                {#if tasks.length > 0}
                    {#each tasks as task (task.uuid)}
                        {@const Icon = getStatusIcon(task.status)}
                        <a
                            href="/task/{task.uuid}"
                            class="block bg-gray-800 border border-gray-700 rounded-lg p-4 transition-all hover:border-gray-600"
                        >
                            <div
                                class="flex flex-col sm:flex-row justify-between sm:items-start gap-3"
                            >
                                <div
                                    class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-full self-start {getStatusClasses(
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
                                <div class="text-xs text-gray-500">
                                    任务: {task.uuid.substring(0, 8)}
                                </div>
                            </div>
                            <div
                                class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm"
                            >
                                <div
                                    class="flex items-center gap-2 text-gray-400"
                                >
                                    <History size={16} />
                                    <span
                                        >创建时间: {formatTime(
                                            task.createdAt,
                                        )}</span
                                    >
                                </div>
                                {#if task.finishedAt}
                                    <div
                                        class="flex items-center gap-2 text-gray-400"
                                    >
                                        <CheckCircle size={16} />
                                        <span
                                            >完成时间: {formatTime(
                                                task.finishedAt,
                                            )}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </a>
                    {/each}
                {:else}
                    <div
                        class="text-center py-12 px-4 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg"
                    >
                        <History class="mx-auto text-gray-600" size={40} />
                        <h3 class="mt-4 text-lg font-semibold text-white">
                            没有构建历史
                        </h3>
                        <p class="mt-1 text-gray-500">
                            此仓库还没有运行任何构建。
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</main>

<!-- Delete Confirmation Modal -->
{#if isDeleting}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
        onclick={() => (isDeleting = false)}
    >
        <div
            class="bg-gray-800 border border-red-500/30 rounded-xl p-8 max-w-md w-full"
        >
            <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                <AlertTriangle class="text-red-400" size={28} />
                确认删除
            </h2>
            <p class="text-gray-400 mt-4">
                您确定要删除仓库 <strong
                    class="text-white">{repo.name}</strong
                > 吗？这将删除其跟踪条目并从服务器删除本地克隆。此操作无法撤销。
            </p>

            {#if formError}
                <div
                    class="bg-red-500/10 text-red-400 p-3 rounded-md text-sm mt-4"
                >
                    <strong>错误:</strong>
                    {formError}
                </div>
            {/if}

            <div class="flex justify-end gap-4 mt-8">
                <button
                    onclick={() => (isDeleting = false)}
                    disabled={isSubmitting}
                    class="px-5 py-2.5 rounded-lg font-semibold text-gray-300 bg-gray-600/50 hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                    取消
                </button>
                <button
                    onclick={handleDelete}
                    disabled={isSubmitting}
                    class="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:bg-red-900 disabled:cursor-not-allowed"
                >
                    {#if isSubmitting}
                        <Loader class="animate-spin" size={20} />
                        <span>删除中...</span>
                    {:else}
                        <Trash2 size={20} />
                        <span>确认删除</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}
