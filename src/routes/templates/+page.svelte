<script lang="ts">
    import type { PageData } from "./$types";
    import {
        Plus,
        Save,
        X,
        Loader,
        FileText,
        Trash2,
        AlertTriangle,
    } from "lucide-svelte";
    import type { Template } from "$lib/types";
    import { invalidateAll, goto } from "$app/navigation";

    let { data } = $props<{ data: PageData }>();

    // --- State Management with Runes ---
    const templates = $derived(data.templates);

    let showAddForm = $state(false);
    let isSubmitting = $state(false);
    let formError = $state<string | null>(null);

    // Form fields state for a new template
    let newTemplate = $state({
        name: "",
        description: "",
        script: "",
        timeout: 600,
        resultPath: "",
        successPattern: "",
    });

    // --- Helper Functions ---

    function resetForm() {
        newTemplate.name = "";
        newTemplate.description = "";
        newTemplate.script = "npm install\\nnpm run build";
        newTemplate.timeout = 600;
        newTemplate.resultPath = "build/";
        newTemplate.successPattern = "build complete";
        formError = null;
        isSubmitting = false;
    }

    function openAddForm() {
        resetForm();
        showAddForm = true;
    }

    // --- Form Submission ---

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (isSubmitting) return;

        isSubmitting = true;
        formError = null;

        if (
            !newTemplate.name ||
            !newTemplate.script ||
            !newTemplate.timeout ||
            !newTemplate.resultPath ||
            !newTemplate.successPattern
        ) {
            formError =
                "Name, script, timeout, result path, and success pattern are required.";
            isSubmitting = false;
            return;
        }

        try {
            const response = await fetch("/api/templates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newTemplate),
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
            await invalidateAll();
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : "An unknown error occurred.";
            console.error("Failed to add template:", errorMessage);
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
            <h1 class="text-3xl font-bold text-white">Build Templates</h1>
            <button
                onclick={() =>
                    showAddForm ? (showAddForm = false) : openAddForm()}
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors {showAddForm
                    ? 'bg-red-500/80 hover:bg-red-500'
                    : 'bg-indigo-500 hover:bg-indigo-600'}"
            >
                {#if showAddForm}
                    <X size={18} />
                    <span>Cancel</span>
                {:else}
                    <Plus size={18} />
                    <span>Add Template</span>
                {/if}
            </button>
        </div>

        <!-- Add New Template Form -->
        {#if showAddForm}
            <div
                class="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8"
            >
                <h2 class="text-xl font-semibold mb-4 text-white">
                    Add a New Build Template
                </h2>
                <form onsubmit={handleSubmit} class="space-y-4">
                    <div>
                        <label
                            for="name"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            Template Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            bind:value={newTemplate.name}
                            placeholder="SvelteKit Static Build"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label
                            for="description"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            Description <span class="text-gray-500"
                                >(Optional)</span
                            >
                        </label>
                        <input
                            id="description"
                            type="text"
                            bind:value={newTemplate.description}
                            placeholder="Builds a SvelteKit project for a static adapter"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label
                            for="script"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            Build Script (Windows CMD)
                        </label>
                        <textarea
                            id="script"
                            rows="4"
                            bind:value={newTemplate.script}
                            placeholder="npm install&#10;npm run build"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        ></textarea>
                        <p class="text-xs text-gray-500 mt-1">
                            Enter commands as they would be run in `cmd.exe`.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                for="resultPath"
                                class="block text-sm font-medium text-gray-400 mb-1"
                            >
                                Artifact Path
                            </label>
                            <input
                                id="resultPath"
                                type="text"
                                bind:value={newTemplate.resultPath}
                                placeholder="build/"
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                                Path to file/folder to be zipped, relative to
                                repo root.
                            </p>
                        </div>
                        <div>
                            <label
                                for="timeout"
                                class="block text-sm font-medium text-gray-400 mb-1"
                            >
                                Timeout (seconds)
                            </label>
                            <input
                                id="timeout"
                                type="number"
                                bind:value={newTemplate.timeout}
                                class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            for="successPattern"
                            class="block text-sm font-medium text-gray-400 mb-1"
                        >
                            Success Pattern (Regex)
                        </label>
                        <input
                            id="successPattern"
                            type="text"
                            bind:value={newTemplate.successPattern}
                            placeholder="build complete|done in"
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p class="text-xs text-gray-500 mt-1">
                            A case-insensitive regex pattern to match in the
                            build logs to confirm success.
                        </p>
                    </div>

                    {#if formError}
                        <div
                            class="bg-red-500/10 text-red-400 p-3 rounded-md text-sm"
                        >
                            <strong>Error:</strong>
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
                                <span>Saving...</span>
                            {:else}
                                <Save size={20} />
                                <span>Save Template</span>
                            {/if}
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        <!-- Template List -->
        <div class="space-y-4">
            {#if templates.length > 0}
                {#each templates as template (template.uuid)}
                    <a
                        href="/templates/{template.uuid}"
                        class="block bg-gray-800 border border-gray-700 rounded-lg p-4 transition-all hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/5"
                    >
                        <div
                            class="flex flex-col sm:flex-row justify-between sm:items-start gap-3"
                        >
                            <div class="grow">
                                <p class="font-bold text-lg text-white">
                                    {template.name}
                                </p>
                                <p class="text-sm text-gray-400">
                                    {template.description || "No description"}
                                </p>
                            </div>
                            <div
                                class="text-xs text-gray-500 self-start sm:self-center"
                            >
                                ID: {template.uuid.substring(0, 8)}
                            </div>
                        </div>
                        <div class="mt-4 border-t border-gray-700 pt-3">
                            <p
                                class="font-mono text-xs bg-black/30 p-2 rounded-md text-gray-300 whitespace-pre-wrap"
                            >
                                {template.script}
                            </p>
                        </div>
                    </a>
                {/each}
            {:else}
                <div
                    class="text-center py-12 px-4 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg"
                >
                    <FileText class="mx-auto text-gray-600" size={40} />
                    <h3 class="mt-4 text-lg font-semibold text-white">
                        No Build Templates
                    </h3>
                    <p class="mt-1 text-gray-500">
                        Click "Add Template" to create your first build process.
                    </p>
                </div>
            {/if}
        </div>
    </div>
</main>
