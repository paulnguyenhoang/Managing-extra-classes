mod db;
mod settings;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let database = db::AppDatabase::initialize(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            let database_status = database
                .status()
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;

            println!(
                "[database] DB ready: path={}, migrations={}",
                database_status.database_path,
                database_status.applied_migrations.join(", ")
            );

            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            db::check_database_ready,
            settings::is_password_set,
            settings::set_initial_password,
            settings::verify_password,
            settings::change_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
