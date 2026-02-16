//! 搜索命令

use std::sync::Mutex;

use crate::commands::file_commands::AppState;
use crate::parser::{SearchOptions, SearchResult};
use crate::search::SearchEngine;

/// 执行搜索
#[tauri::command]
pub fn search_logs(
    options: SearchOptions,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Vec<SearchResult>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;

    let file_path = state
        .current_file
        .as_ref()
        .ok_or("No file opened")?;

    let index = state
        .current_index
        .as_ref()
        .ok_or("No file index available")?;

    let engine = SearchEngine::new(&options)
        .map_err(|e| format!("Invalid search pattern: {}", e))?;

    engine
        .search_in_file(file_path, index, &options)
        .map_err(|e| e.to_string())
}

/// 搜索下一页 (增量搜索)
#[tauri::command]
pub fn search_next(
    from_line: u64,
    max_results: usize,
    options: SearchOptions,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Vec<SearchResult>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;

    let file_path = state
        .current_file
        .as_ref()
        .ok_or("No file opened")?;

    let index = state
        .current_index
        .as_ref()
        .ok_or("No file index available")?;

    let engine = SearchEngine::new(&options)
        .map_err(|e| format!("Invalid search pattern: {}", e))?;

    engine
        .search_next_page(file_path, index, from_line, max_results)
        .map_err(|e| e.to_string())
}

/// 在字符串中测试正则表达式
#[tauri::command]
pub fn test_regex(
    pattern: String,
    text: String,
    case_insensitive: bool,
) -> Result<Vec<SearchResult>, String> {
    let options = SearchOptions {
        pattern,
        use_regex: true,
        case_insensitive,
        ..Default::default()
    };

    let engine = SearchEngine::new(&options)
        .map_err(|e| format!("Invalid regex: {}", e))?;

    Ok(engine.search_in_string(&text, 0))
}
