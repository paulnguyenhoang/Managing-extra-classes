import { invoke } from "@tauri-apps/api/core";
import { FormEvent, useEffect, useState } from "react";
import { BookOpenText, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  onLogin: () => void;
};

type LoginMode = "loading" | "setup" | "login";

type PasswordInputProps = {
  id: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  isVisible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : String(error || fallback);
}

function PasswordInput({
  id,
  value,
  placeholder,
  disabled,
  isVisible,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        id={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 pr-12 text-base"
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        disabled={disabled}
        className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
        aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        <VisibilityIcon className="size-4" />
      </button>
    </div>
  );
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<LoginMode>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPasswordStatus() {
      try {
        const passwordIsSet = await invoke<boolean>("is_password_set");

        if (isMounted) {
          setMode(passwordIsSet ? "login" : "setup");
        }
      } catch (loadError) {
        if (isMounted) {
          setMode("login");
          setError(
            getErrorMessage(
              loadError,
              "Không kiểm tra được trạng thái mật khẩu.",
            ),
          );
        }
      }
    }

    loadPasswordStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    if (mode === "setup" && password !== confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "setup") {
        await invoke("set_initial_password", { password });
        onLogin();
        return;
      }

      const isValidPassword = await invoke<boolean>("verify_password", {
        password,
      });

      if (!isValidPassword) {
        setError("Mật khẩu không đúng.");
        return;
      }

      onLogin();
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Không thể xử lý mật khẩu lúc này."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSetupMode = mode === "setup";
  const title = isSetupMode ? "Tạo mật khẩu" : "Quản lý lớp học thêm";
  const description = isSetupMode
    ? "Thiết lập mật khẩu để bảo vệ dữ liệu trên máy tính này."
    : "Ứng dụng quản lý lớp học thêm cho giáo viên dạy Văn";
  const submitLabel = isSetupMode ? "Lưu mật khẩu" : "Đăng nhập";
  const isLoading = mode === "loading";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Card className="w-full max-w-md rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="gap-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <BookOpenText className="size-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-950">
              {title}
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setError("");
                }}
                placeholder="Nhập mật khẩu"
                disabled={isLoading || isSubmitting}
                isVisible={showPassword}
                onToggleVisibility={() => setShowPassword((current) => !current)}
              />
            </div>
            {isSetupMode ? (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Nhập lại mật khẩu</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    setError("");
                  }}
                  placeholder="Nhập lại mật khẩu"
                  disabled={isSubmitting}
                  isVisible={showConfirmPassword}
                  onToggleVisibility={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={isLoading || isSubmitting}
            >
              {isLoading
                ? "Đang kiểm tra mật khẩu..."
                : isSubmitting
                  ? "Đang xử lý..."
                  : submitLabel}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Bản thử nghiệm dùng dữ liệu mẫu.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
