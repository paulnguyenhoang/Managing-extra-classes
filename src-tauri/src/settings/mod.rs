use argon2::{
    password_hash::{
        Error as PasswordHashError, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Argon2,
};
use rand_core::OsRng;

use crate::db::AppDatabase;

const PASSWORD_HASH_KEY: &str = "password_hash";
const PASSWORD_SALT_KEY: &str = "password_salt";

pub fn password_is_set(database: &AppDatabase) -> Result<bool, String> {
    let password_hash = database.get_setting(PASSWORD_HASH_KEY)?;
    let password_salt = database.get_setting(PASSWORD_SALT_KEY)?;

    Ok(password_hash.is_some() && password_salt.is_some())
}

pub fn create_initial_password(database: &AppDatabase, password: &str) -> Result<(), String> {
    validate_password(password)?;

    if password_is_set(database)? {
        return Err(
            "Ứng dụng đã có mật khẩu. Vui lòng đăng nhập hoặc đổi mật khẩu trong cài đặt."
                .to_string(),
        );
    }

    let hashed_password = hash_password(password)?;
    save_password(database, &hashed_password)
}

pub fn verify_local_password(database: &AppDatabase, password: &str) -> Result<bool, String> {
    validate_password(password)?;

    let stored_hash = database
        .get_setting(PASSWORD_HASH_KEY)?
        .ok_or_else(|| "Ứng dụng chưa có mật khẩu. Vui lòng tạo mật khẩu trước.".to_string())?;

    verify_password_hash(password, &stored_hash)
}

pub fn update_password(
    database: &AppDatabase,
    old_password: &str,
    new_password: &str,
) -> Result<(), String> {
    validate_password(old_password)?;
    validate_new_password(new_password)?;

    if !verify_local_password(database, old_password)? {
        return Err("Mật khẩu hiện tại không đúng.".to_string());
    }

    let hashed_password = hash_password(new_password)?;
    save_password(database, &hashed_password)
}

fn validate_new_password(password: &str) -> Result<(), String> {
    validate_password(password)?;

    if password.trim().chars().count() < 6 {
        return Err("Mật khẩu mới phải có ít nhất 6 ký tự.".to_string());
    }

    Ok(())
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.trim().is_empty() {
        return Err("Mật khẩu không được để trống.".to_string());
    }

    Ok(())
}

fn hash_password(password: &str) -> Result<HashedPassword, String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| "Không thể tạo mã bảo vệ mật khẩu.".to_string())?
        .to_string();

    Ok(HashedPassword {
        hash,
        salt: salt.as_str().to_string(),
    })
}

fn verify_password_hash(password: &str, stored_hash: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|_| "Dữ liệu mật khẩu trong database không hợp lệ.".to_string())?;

    match Argon2::default().verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(PasswordHashError::Password) => Ok(false),
        Err(_) => Err("Không thể kiểm tra mật khẩu.".to_string()),
    }
}

fn save_password(database: &AppDatabase, hashed_password: &HashedPassword) -> Result<(), String> {
    database.set_settings(&[
        (PASSWORD_HASH_KEY, hashed_password.hash.as_str()),
        (PASSWORD_SALT_KEY, hashed_password.salt.as_str()),
    ])
}

struct HashedPassword {
    hash: String,
    salt: String,
}

#[tauri::command]
pub fn is_password_set(database: tauri::State<'_, AppDatabase>) -> Result<bool, String> {
    password_is_set(&database)
}

#[tauri::command]
pub fn set_initial_password(
    database: tauri::State<'_, AppDatabase>,
    password: String,
) -> Result<(), String> {
    create_initial_password(&database, &password)
}

#[tauri::command]
pub fn verify_password(
    database: tauri::State<'_, AppDatabase>,
    password: String,
) -> Result<bool, String> {
    verify_local_password(&database, &password)
}

#[tauri::command]
pub fn change_password(
    database: tauri::State<'_, AppDatabase>,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    update_password(&database, &old_password, &new_password)
}
