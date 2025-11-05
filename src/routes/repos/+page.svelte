<script lang="ts">
    import type { PageData } from "./$types";
    import {
        GitBranch,
        GitCommit,
        Plus,
        Save,
        Server,
        Trash2,
        X,
        Loader,
        CheckCircle,
        XCircle,
        AlertTriangle,
        Zap,
    } from "lucide-svelte";
    import type { Repo, Template } from "$lib/types";
    import { invalidateAll } from "$app/navigation";

    let { data } = $props<{ data: PageData }>();

    // --- State Management with Runes ---
    const repos = $derived(data.repos);
    const templates = $derived(data.templates);

    let showAddForm = $state(false);
    let isSubmitting = $state(false);
    let formError = $state<string | null>(null);

    // Form fields state
    let newRepo = $state({
        name: "",
        gitlabUrl: "",
        branch: "main",
        templateUuid: data.templates.length > 0 ? data.templates[0].uuid : "",
        trigger: "push",
    });

    // --- Helper Functions ---

    function getStatusClasses(status: Repo["status"]) {
        switch (status) {
            case "idle":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "error":
                return "bg-red-500/10 text-red-400 border-red-500/20";
            case "building":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "cloning":
                return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    }

    function getStatusIcon(status: Repo["status"]) {
        switch (status) {
            case "idle":
                return CheckCircle;
            case "error":
                return XCircle;
            case "building":
                return Loader;
            case "cloning":
                return Loader;
            default:
                return AlertTriangle;
        }
    }

    function formatTime(timestamp?: number) {
        if (!timestamp) return "N/A";
        return new Date(timestamp).toLocaleString();
    }

    function formatTrigger(trigger: Repo["trigger"]) {
        switch (trigger) {
            case "push":
                return "Push 事件";
            case "tag":
                return "新 Tag 时";
            case "manual":
                return "仅手动";
            default:
                return trigger;
        }
    }

    function resetForm() {
        newRepo.name = "";
        newRepo.gitlabUrl = "";
        newRepo.branch = "main";
        newRepo.templateUuid = templates.length > 0 ? templates[0].uuid : "";
        newRepo.trigger = "push";
        formError = null;
        isSubmitting = false;
    }

    // --- Form Submission ---

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (isSubmitting) return;

        isSubmitting = true;
        formError = null;

        if (
            !newRepo.name ||
            !newRepo.gitlabUrl ||
            !newRepo.branch ||
            !newRepo.templateUuid
        ) {
            formError = "所有字段都是必需的。";
            isSubmitting = false;
            return;
        }

        try {
            const response = await fetch("/api/repos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newRepo),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message ||
                        `HTTP error! status: ${response.status}`,
                );
            }

            // Success
            resetForm();
            showAddForm = false;
            // Invalidate all server-side data to refresh the list
            await invalidateAll();
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : "发生未知错误。";
            console.error("添加仓库失败:", errorMessage);
            formError = errorMessage;
        } finally {
            isSubmitting = false;
        }
    }
</script>

<main
    class="p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-300 min-h-screen font-sans"
>
    <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-white">跟踪的仓库</h1>
            <button
                onclick={() => (showAddForm = !showAddForm)}
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-black dark:text-white transition-colors {showAddForm
                    ? 'bg-red-500/80 hover:bg-red-500'
                    : 'bg-indigo-500 hover:bg-indigo-600'}"
            >
                {#if showAddForm}
                    <X size={18} />
                    <span>取消</span>
                {:else}
                    <Plus size={18} />
                    <span>添加仓库</span>
                {/if}
            </button>
        </div>

        <!-- Add New Repository Form -->
        {#if showAddForm}
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8"
            >
                <h2 class="text-xl font-semibold mb-4 text-white">
                    添加新仓库
                </h2>
                <form onsubmit={handleSubmit} class="space-y-4">
                    <div>
                        <label
                            for="name"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            仓库名称
                        </label>
                        <input
                            id="name"
                            type="text"
                            bind:value={newRepo.name}
                            placeholder="我的项目"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label
                            for="gitlabUrl"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            GitLab 克隆 URL (HTTPS)
                        </label>
                        <input
                            id="gitlabUrl"
                            type="url"
                            bind:value={newRepo.gitlabUrl}
                            placeholder="https://gitlab.com/user/repo.git"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                for="branch"
                                class="block text-sm font-medium text-gray-400 mb-1"
                            >
                                要构建的分支
                            </label>
                            <input
                                id="branch"
                                type="text"
                                bind:value={newRepo.branch}
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label
                                for="template"
                                class="block text-sm font-medium text-gray-400 mb-1"
                            >
                                构建模板
                            </label>
                            <select
                                id="template"
                                bind:value={newRepo.templateUuid}
                                disabled={templates.length === 0}
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                            >
                                {#if templates.length === 0}
                                    <option value="">没有可用的模板</option>
                                {:else}
                                    {#each templates as template (template.uuid)}
                                        <option value={template.uuid}
                                            >{template.name}</option
                                        >
                                    {/each}
                                {/if}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label
                            for="trigger"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            触发条件
                        </label>
                        <select
                            id="trigger"
                            bind:value={newRepo.trigger}
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="push">Push 事件</option>
                            <option value="tag">新 Tag 时</option>
                            <option value="manual">仅手动触发</option>
                        </select>
                    </div>

                    {#if formError}
                        <div
                            class="bg-red-500/10 text-red-400 p-3 rounded-md text-sm"
                        >
                            <strong>错误:</strong>
                            {formError}
                        </div>
                    {/if}

                    <div class="flex justify-end">
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
                                <span>保存仓库</span>
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        <!-- Repository List -->
        <div class="space-y-4">
            {#if repos.length > 0}
                {#each repos as repo (repo.uuid)}
                    {@const Icon = getStatusIcon(repo.status)}
                    <a
                        href="/repos/{repo.uuid}"
                        class="block bg-gray-800 border border-gray-700 rounded-lg p-4 transition-all hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/5"
                    >
                        <div
                            class="flex flex-col sm:flex-row justify-between sm:items-start gap-3"
                        >
                            <div class="grow">
                                <p class="font-bold text-lg text-white">
                                    {repo.name}
                                </p>
                                <p class="text-sm text-gray-400 break-all">
                                    {repo.gitlabUrl}
                                </p>
                            </div>
                            <div
                                class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-full self-start {getStatusClasses(
                                    repo.status,
                                )}"
                            >
                                <Icon
                                    size={14}
                                    class={repo.status === "building" ||
                                    repo.status === "cloning"
                                        ? "animate-spin"
                                        : ""}
                                />
                                <span class="capitalize font-medium"
                                    >{repo.status === "idle"
                                        ? "空闲"
                                        : repo.status === "error"
                                          ? "错误"
                                          : repo.status === "building"
                                            ? "构建中"
                                            : repo.status === "cloning"
                                              ? "克隆中"
                                              : repo.status}</span
                                >
                            </div>
                        </div>
                        <div
                            class="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm"
                        >
                            <div class="flex items-center gap-2 text-gray-400">
                                <GitBranch size={16} class="text-indigo-400" />
                                <span
                                    >分支: <span
                                        class="font-semibold text-gray-300"
                                        >{repo.branch}</span
                                    ></span
                                >
                            </div>
                            <div class="flex items-center gap-2 text-gray-400">
                                <GitCommit size={16} class="text-gray-500" />
                                <span
                                    >最后更新:
                                    <span class="font-semibold text-gray-300"
                                        >{formatTime(repo.updatedAt)}</span
                                    ></span
                                >
                            </div>
                            <div class="flex items-center gap-2 text-gray-400">
                                <Zap size={16} class="text-yellow-500" />
                                <span
                                    >触发: <span
                                        class="font-semibold text-gray-300"
                                        >{formatTrigger(repo.trigger)}</span
                                    ></span
                                >
                            </div>
                        </div>
                    </a>
                {/each}
            {:else}
                <div
                    class="text-center py-12 px-4 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg"
                >
                    <Server class="mx-auto text-gray-600" size={40} />
                    <h3 class="mt-4 text-lg font-semibold text-white">
                        没有跟踪的仓库
                    </h3>
                    <p class="mt-1 text-gray-500">
                        点击"添加仓库"以开始跟踪新项目。
                    </p>
                </div>
            {/if}
        </div>
    </div>
</main>
