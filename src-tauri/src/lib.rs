mod db;
mod payments;
mod school;
mod settings;
mod students;

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

            school::seed_academic_class_data(&database)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            students::seed_student_data(&database)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;

            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            db::check_database_ready,
            settings::is_password_set,
            settings::set_initial_password,
            settings::verify_password,
            settings::change_password,
            school::list_academic_years,
            school::get_current_academic_year_id,
            school::set_current_academic_year,
            school::list_class_overviews_by_year,
            school::get_class_detail,
            school::create_class,
            school::update_class_name,
            school::update_class_monthly_fee,
            school::update_class_schedule,
            students::list_students_by_class,
            students::create_student_for_class,
            students::update_student,
            students::update_class_membership_status,
            payments::list_payments_by_class_month,
            payments::set_payment_paid,
            payments::set_payment_unpaid,
            payments::set_payment_waived,
            payments::update_payment_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
