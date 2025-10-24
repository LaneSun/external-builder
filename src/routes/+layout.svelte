<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { page } from "$app/stores";
    import { GitFork } from "lucide-svelte";

    let { children } = $props();

    /**
     * Determines if a navigation link should be considered active based on the current URL path.
     * @param path The path of the navigation link (e.g., '/repos').
     * @returns True if the link is active, false otherwise.
     */
    function isActive(path: string) {
        const currentPath = $page.url.pathname;
        // The root path should only be active for the exact URL.
        if (path === "/") {
            return currentPath === "/";
        }
        // For other paths, check if the current URL starts with the link's path.
        return currentPath.startsWith(path);
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>External Builder</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 text-gray-300 font-sans">
    <!-- Sticky Navigation Header -->
    <header
        class="bg-gray-900/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-40"
    >
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- Logo / App Title -->
                <div class="flex items-center">
                    <a
                        href="/"
                        class="flex items-center gap-2.5 text-white font-bold text-lg"
                    >
                        <GitFork class="text-indigo-400" size={24} />
                        <span>External Builder</span>
                    </a>
                </div>

                <!-- Navigation Links -->
                <div class="flex items-center space-x-2 sm:space-x-4">
                    <a
                        href="/"
                        class={[
                            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive("/")
                                ? "text-white bg-gray-800"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                        ]}
                    >
                        Dashboard
                    </a>
                    <a
                        href="/repos"
                        class={[
                            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive("/repos")
                                ? "text-white bg-gray-800"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                        ]}
                    >
                        Repositories
                    </a>
                    <a
                        href="/templates"
                        class={[
                            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive("/templates")
                                ? "text-white bg-gray-800"
                                : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                        ]}
                    >
                        Templates
                    </a>
                </div>
            </div>
        </nav>
    </header>

    <!-- Render the current page's content -->
    {@render children?.()}
</div>
