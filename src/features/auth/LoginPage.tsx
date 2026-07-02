import { FormEvent, useState } from "react";
import { BookOpenText } from "lucide-react";

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

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    onLogin();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Card className="w-full max-w-md rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="gap-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <BookOpenText className="size-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-950">
              Quản lý lớp học thêm
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Ứng dụng quản lý lớp học thêm cho giáo viên dạy Văn
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="h-11 text-base"
                placeholder="Nhập mật khẩu"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <Button type="submit" className="h-11 w-full text-base">
              Đăng nhập
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
