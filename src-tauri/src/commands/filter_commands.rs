//! Filter commands

use std::sync::Mutex;

use crate::commands::file_commands::AppState;
use crate::parser::{FileIndex, LogLevel};

/// Result for filtered lines query
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FilteredLinesResult {
    /// Matching line numbers
    pub line_numbers: Vec<u64>,
    /// Total count of matching lines
    pub total_count: u64,
}

/// Get line numbers that match the given filter criteria
#[tauri::command]
pub fn get_filtered_lines(
    levels: Vec<String>,
    categories: Vec<String>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<FilteredLinesResult, String> {
    let state = state.lock().map_err(|e| e.to_string())?;

    let file_path = state.current_file.as_ref().ok_or("No file opened")?;

    let index = state
        .current_index
        .as_ref()
        .ok_or("No file index available")?;

    // Convert string levels to LogLevel
    let level_set: Vec<LogLevel> = levels.iter().map(|l| LogLevel::from_str(l)).collect();

    // Build category set for faster lookup
    let category_set: std::collections::HashSet<String> = categories.iter().cloned().collect();

    // Scan file for matching lines
    let line_numbers = scan_file_for_filter(file_path, index, &level_set, &category_set)
        .map_err(|e| format!("Failed to scan file: {}", e))?;

    let total_count = line_numbers.len() as u64;

    Ok(FilteredLinesResult {
        line_numbers,
        total_count,
    })
}

/// Scan file and find lines matching the filter
fn scan_file_for_filter(
    file_path: &std::path::Path,
    index: &FileIndex,
    levels: &[LogLevel],
    categories: &std::collections::HashSet<String>,
) -> std::io::Result<Vec<u64>> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    let mut matching_lines = Vec::new();

    // Determine filter modes
    let filter_by_level = !levels.is_empty();
    let filter_by_category = !categories.is_empty();

    // If no filters, return empty (meaning show all)
    if !filter_by_level && !filter_by_category {
        return Ok(Vec::new());
    }

    for (line_num, line_result) in reader.lines().enumerate() {
        let line_number = (line_num + 1) as u64;
        let line = line_result?;

        // Extract level and category from the line
        // If level cannot be extracted, treat it as Unknown
        let line_level = crate::parser::LogParser::extract_level(&line)
            .unwrap_or(LogLevel::Unknown);
        let line_category = crate::parser::LogParser::extract_category(&line);

        // Check if line matches filter
        let level_match = if filter_by_level {
            levels.contains(&line_level)
        } else {
            true
        };

        let category_match = if filter_by_category {
            line_category
                .as_ref()
                .map(|c| categories.contains(c))
                .unwrap_or(false)
        } else {
            true
        };

        if level_match && category_match {
            matching_lines.push(line_number);
        }

        // Limit to reasonable amount to avoid memory issues
        if matching_lines.len() >= 1_000_000 {
            break;
        }
    }

    Ok(matching_lines)
}
