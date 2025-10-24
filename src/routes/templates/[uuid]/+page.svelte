<script lang="ts">
    import type { PageData } from "./$types";
    import {
        ArrowLeft,
        Save,
        Trash2,
        Loader,
        AlertTriangle,
        Info,
        CheckCircle,
        X,
    } from "lucide-svelte";
    import { invalidateAll, goto } from "$app/navigation";

    let { data } = $props<{ data: PageData }>();

    // --- State Management with Runes ---
    const template = $derived(data.template);
    const usage = $derived(data.usage);

    let isDeleting = $state(false);
    let isSubmitting = $state(false);
    let formError = $state<string | null>(null);

    // Form data state, initialized from the loaded template data.
    // Using $state makes the form fields reactive.
    let editData = $state({
        name: data.template.name,
        description: data.template.description,
        script: data.template.script,
        timeout: data.template.timeout,
        resultPath: data.template.resultPath,
        successPattern: data.template.successPattern,
    });

    // --- API Interactions ---

    async function handleUpdate(e: Event) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        formError = null;

        try {
            const response = await fetch(`/api/templates/${template.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editData,
                    timeout: Number(editData.timeout), // Ensure timeout is a number
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Failed to update template.",
                );
            }

            // On success, refresh the data to show the updates
            await invalidateAll();
            // Optionally, show a success message or animation
        } catch (e) {
            formError =
                e instanceof Error ? e.message : "An unknown error occurred.";
        } finally {
            isSubmitting = false;
        }
    }

    async function handleDelete() {
        if (isSubmitting || !usage.isDeletable) return;
        isSubmitting = true;
        formError = null;

        try {
            const response = await fetch(`/api/templates/${template.uuid}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Failed to delete template.",
                );
            }

            // On successful deletion, navigate back to the templates list
            await goto("/templates");
        } catch (e) {
            formError =
                e instanceof Error ? e.message : "An unknown error occurred.";
            isDeleting = false; // Close the modal but show the error on the main page
        } finally {
            isSubmitting = false;
        }
    }
</script>

<main
    class="p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-300 min-h-screen font-sans"
>
    <div class="max-w-4xl mx-auto">
        <div class="mb-6">
            <a
                href="/templates"
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
            >
                <ArrowLeft size={16} />
                Back to Templates
            </a>
        </div>

        <!-- Header -->
        <div
            class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8"
        >
            <h1 class="text-3xl font-bold text-white">Edit Template</h1>
            <div class="flex items-center gap-2 self-start sm:self-center">
                <button
                    onclick={() => (isDeleting = true)}
                    class="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    disabled={!usage.isDeletable}
                    title={!usage.isDeletable
                        ? "This template is in use and cannot be deleted."
                        : "Delete template"}
                >
                    <Trash2 size={16} />
                    <span>Delete</span>
                </button>
            </div>
        </div>

        <!-- Edit Form -->
        <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <form onsubmit={handleUpdate} class="space-y-6">
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
                        bind:value={editData.name}
                        class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label
                        for="description"
                        class="block text-sm font-medium text-gray-400 mb-1"
                    >
                        Description <span class="text-gray-500">(Optional)</span
                        >
                    </label>
                    <input
                        id="description"
                        type="text"
                        bind:value={editData.description}
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
                        rows="6"
                        bind:value={editData.script}
                        class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                            bind:value={editData.resultPath}
                            class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p class="text-xs text-gray-500 mt-1">
                            Path to file/folder to be zipped, relative to repo
                            root.
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
                            bind:value={editData.timeout}
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
                        bind:value={editData.successPattern}
                        class="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                        A case-insensitive regex pattern to match in logs to
                        confirm success.
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

                {#if !usage.isDeletable}
                    <div
                        class="bg-yellow-500/10 text-yellow-300 p-4 rounded-md text-sm flex gap-3"
                    >
                        <Info size={20} class="shrink-0 mt-0.5" />
                        <div>
                            <h3 class="font-semibold">Template in Use</h3>
                            <p class="mt-1">
                                This template is currently used by {usage.usedBy
                                    .length}
                                {usage.usedBy.length === 1
                                    ? "repository"
                                    : "repositories"} and cannot be deleted. You
                                must assign these repositories to a different template
                                before deletion.
                            </p>
                            <ul class="list-disc pl-5 mt-2">
                                {#each usage.usedBy as repo}
                                    <li>
                                        <a
                                            href="/repos/{repo.uuid}"
                                            class="font-medium hover:underline"
                                            >{repo.name}</a
                                        >
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                {/if}

                <div class="flex justify-end pt-4">
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
                            <span>Save Changes</span>
                        {/if}
                    </button>
                </div>
            </form>
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
                Confirm Deletion
            </h2>
            <p class="text-gray-400 mt-4">
                Are you sure you want to delete the template <strong
                    class="text-white">{template.name}</strong
                >? This action cannot be undone.
            </p>

            <div class="flex justify-end gap-4 mt-8">
                <button
                    onclick={() => (isDeleting = false)}
                    disabled={isSubmitting}
                    class="px-5 py-2.5 rounded-lg font-semibold text-gray-300 bg-gray-600/50 hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onclick={handleDelete}
                    disabled={isSubmitting}
                    class="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:bg-red-900 disabled:cursor-not-allowed"
                >
                    {#if isSubmitting}
                        <Loader class="animate-spin" size={20} />
                        <span>Deleting...</span>
                    {:else}
                        <Trash2 size={20} />
                        <span>Confirm Delete</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}
