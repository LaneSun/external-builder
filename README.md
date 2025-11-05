# Offline GitLab Webhook Build Server

一个用于离线 GitLab 实例的构建服务器，通过接收 Webhook 事件自动触发构建任务。

## 功能特性

- 接收 GitLab Webhook 事件（Push 和 Tag）
- 可配置的触发条件：Push 事件、新 Tag 时、仅手动触发
- 使用 GitLab Token 自动拉取代码
- 可配置的构建模板系统
- 构建任务队列管理
- 构建日志记录和查看
- 构建产物自动打包和下载
- 基于 Deno 2、SvelteKit (Svelte 5) 和 Tailwind 4

## 快速开始

1. 设置环境变量：
   ```
   GITLAB_TOKEN=your_gitlab_token
   MAX_CONCURRENT_TASKS=2
   ```

2. 启动开发服务器：
   ```bash
   deno task dev
   ```

3. 访问 http://localhost:5173 开始配置

## 使用说明

1. 在 `/templates` 页面创建构建模板
2. 在 `/repos` 页面添加要跟踪的仓库
3. 配置 GitLab 项目的 Webhook 指向 `http://your-server:5173/api/webhook`
4. 根据需要选择触发条件并推送代码或创建 Tag