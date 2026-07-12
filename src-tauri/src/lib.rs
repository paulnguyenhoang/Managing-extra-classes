mod attendance;
mod backup;
mod db;
mod excel;
mod months;
mod payments;
mod schedule;
mod school;
mod scores;
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
        .plugin(tauri_plugin_dialog::init())
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
            school::create_academic_year,
            school::update_academic_year,
            school::list_class_overviews_by_year,
            school::get_class_detail,
            school::create_class,
            school::update_class_name,
            school::update_class_monthly_fee,
            school::update_class_schedule,
            school::update_class_month_range,
            school::complete_class,
            students::list_students_by_class,
            students::create_student_for_class,
            students::update_student,
            students::update_class_membership_status,
            students::pause_student_membership,
            students::reactivate_student_membership,
            students::import_students_for_class,
            payments::list_payments_by_class_month,
            payments::set_payment_paid,
            payments::set_payment_unpaid,
            payments::set_payment_waived,
            payments::update_payment_note,
            payments::get_unpaid_months_for_membership,
            payments::list_tuition_dashboard,
            schedule::list_global_schedule_month,
            scores::list_score_sheet,
            scores::add_score_column,
            scores::rename_score_column,
            scores::delete_score_column,
            scores::save_score_values,
            scores::import_score_sheet,
            attendance::get_attendance_week,
            attendance::set_attendance_status,
            attendance::toggle_attendance_lock,
            attendance::mark_session_present,
            attendance::cancel_attendance_session,
            attendance::restore_attendance_session,
            attendance::create_class_makeup_session,
            attendance::remove_class_makeup_session,
            attendance::list_student_makeup_options,
            attendance::create_student_makeup_record,
            attendance::remove_student_makeup_record,
            attendance::set_receiving_makeup_attendance_status,
            backup::get_database_info,
            backup::create_backup,
            backup::validate_backup_file,
            backup::restore_backup,
            backup::list_backup_logs,
            backup::open_app_data_folder,
            backup::open_backup_folder,
            backup::pick_backup_file,
            excel::save_excel_file,
            excel::pick_excel_import_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
