<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { page } from "$app/stores";
    import { GitFork } from "lucide-svelte";

    let { children } = $props();

    /**
     * 根据当前URL路径确定导航链接是否应该被认为是活跃的。
     * @param path 导航链接的路径（例如，'/repos'）。
     * @returns 如果链接是活跃的则返回true，否则返回false。
     */
    function isActive(path: string) {
        const currentPath = $page.url.pathname;
        // 根路径应该只对确切的URL是活跃的。
        if (path === "/") {
            return currentPath === "/";
        }
        // 对于其他路径，检查当前URL是否以链接的路径开头。
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
                        仪表板
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
                        仓库
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
                        模板
                    </a>
                </div>
            </div>
        </nav>
    </header>

    <!-- Render the current page's content -->
    {@render children?.()}
</div>
