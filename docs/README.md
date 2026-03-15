# UE Log Parser 文档

本目录包含当前仓库的项目文档，基于现有代码实现整理而成。

## 文档目录

- [项目概览](./overview.md)
  - 项目用途
  - 核心功能
  - 运行方式
  - 目录结构
- [架构说明](./architecture.md)
  - 前端/后端分层
  - 关键模块职责
  - 数据流与大文件处理策略
- [开发说明](./development.md)
  - 环境要求
  - 常用命令
  - 构建与发布
  - 调试与验证建议
- [使用指南](./user-guide.md)
  - 打开日志
  - 搜索与过滤
  - 高亮与快捷键
  - 常见使用方式

## 项目摘要

UE Log Parser 是一个基于 Tauri v2、React 19 和 Rust 构建的桌面应用，用于查看、解析、搜索和过滤 Unreal Engine 日志文件。项目的设计重点是：

- 支持较大的日志文件
- 提供快速搜索与筛选能力
- 通过虚拟列表和按需加载减少前端内存压力
- 利用 Rust 后端完成索引、解析和文件级搜索

## 关键入口

- 前端入口：`src/App.tsx`
- 前端状态：`src/stores/logStore.ts`
- 前端查看器：`src/components/viewer/LogViewer.tsx`
- Tauri 命令桥接：`src/services/tauriApi.ts`
- 后端命令注册：`src-tauri/src/lib.rs`

## 说明

这些文档以当前仓库中的实际实现为准，不假设尚未落地的功能。
