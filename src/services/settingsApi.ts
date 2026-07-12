import { invoke } from "@tauri-apps/api/core";

export function changePassword(currentPassword: string, newPassword: string) {
  return invoke<void>("change_password", {
    oldPassword: currentPassword,
    newPassword,
  });
}
