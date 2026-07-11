use std::{fs, path::Path};

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelSaveResultDto {
    file_path: String,
    file_name: String,
}

#[tauri::command]
pub async fn save_excel_file(
    app: AppHandle,
    suggested_file_name: String,
    bytes: Vec<u8>,
) -> Result<Option<ExcelSaveResultDto>, String> {
    if bytes.is_empty() {
        return Err("File Excel không có dữ liệu để lưu.".to_string());
    }

    let picked = app
        .dialog()
        .file()
        .add_filter("Excel workbook", &["xlsx"])
        .set_file_name(&suggested_file_name)
        .blocking_save_file();

    let Some(file_path) = picked else {
        return Ok(None);
    };

    let path = file_path
        .into_path()
        .map_err(|error| format!("Không đọc được đường dẫn file Excel: {error}"))?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Không tạo được thư mục lưu Excel: {error}"))?;
    }

    fs::write(&path, bytes).map_err(|error| format!("Không lưu được file Excel: {error}"))?;

    Ok(Some(ExcelSaveResultDto {
        file_name: path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| suggested_file_name),
        file_path: path_to_string(&path),
    }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelImportFileDto {
    file_name: String,
    bytes: Vec<u8>,
}

#[tauri::command]
pub async fn pick_excel_import_file(app: AppHandle) -> Result<Option<ExcelImportFileDto>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Excel workbook", &["xlsx"])
        .blocking_pick_file();

    let Some(file_path) = picked else {
        return Ok(None);
    };

    let path = file_path
        .into_path()
        .map_err(|error| format!("Không đọc được đường dẫn file Excel: {error}"))?;

    let bytes = fs::read(&path)
        .map_err(|_| "Không thể đọc file Excel. Vui lòng kiểm tra lại file.".to_string())?;

    if bytes.is_empty() {
        return Err("Không thể đọc file Excel. Vui lòng kiểm tra lại file.".to_string());
    }

    Ok(Some(ExcelImportFileDto {
        file_name: path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| "file.xlsx".to_string()),
        bytes,
    }))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
