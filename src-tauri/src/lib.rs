//! UE Log Parser - Tauri 后端
//!
//! 高性能 Unreal Engine 日志解析器

mod parser;
mod streaming;
mod search;
mod commands;

use std::sync::Mutex;
use tauri::Manager;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 初始化全局状态
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 文件命令
            commands::file_commands::open_log_file,
            commands::file_commands::load_chunk,
            commands::file_commands::get_file_index,
            commands::file_commands::close_file,
            // 搜索命令
            commands::search_commands::search_logs,
            commands::search_commands::search_next,
            commands::search_commands::test_regex,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
