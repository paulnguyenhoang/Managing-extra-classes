import { useState } from "react";
import { CalendarPlus, Eye, EyeOff, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/common/DateInput";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import {
  createAcademicYear,
  setCurrentAcademicYear,
  updateAcademicYear,
} from "@/services/academicYearApi";
import { changePassword } from "@/services/settingsApi";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassOverview } from "@/types/class";

type SettingsPageProps = {
  academicYears: AcademicYear[];
  classOverviews: ClassOverview[];
  onYearsChanged: (nextCurrentYearId?: number) => Promise<void>;
};

type YearFormState = {
  label: string;
  startsAt: string;
  endsAt: string;
  makeCurrent: boolean;
};

type SettingsPasswordInputProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  isVisible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

export function SettingsPage({ academicYears, classOverviews, onYearsChanged }: SettingsPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createForm, setCreateForm] = useState<YearFormState | null>(null);
  const [editForm, setEditForm] = useState<(YearFormState & { id: number }) | null>(null);
  const [pendingCurrentYear, setPendingCurrentYear] = useState<AcademicYear | null>(null);

  const currentYear = academicYears.find((year) => year.isCurrent) ?? null;
  const editingYear = editForm
    ? (academicYears.find((year) => year.id === editForm.id) ?? null)
    : null;

  function openCreateDialog() {
    setErrorMessage("");
    setSuccessMessage("");
    setCreateForm(suggestNextYearForm(academicYears));
  }

  function openEditDialog(year: AcademicYear) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditForm({
      id: year.id,
      label: year.label,
      startsAt: year.startsAt,
      endsAt: year.endsAt,
      makeCurrent: false,
    });
  }

  function validateForm(form: YearFormState) {
    if (!form.label.trim()) {
      return "Tên năm học không được để trống.";
    }
    if (!form.startsAt || !form.endsAt) {
      return "Vui lòng chọn ngày bắt đầu và ngày kết thúc.";
    }
    if (form.endsAt <= form.startsAt) {
      return "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    return "";
  }

  async function confirmCreateYear() {
    if (!createForm) {
      return;
    }

    const validationError = validateForm(createForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const created = await createAcademicYear({
        label: createForm.label.trim(),
        startsAt: createForm.startsAt,
        endsAt: createForm.endsAt,
        makeCurrent: createForm.makeCurrent,
      });
      setCreateForm(null);
      await onYearsChanged(createForm.makeCurrent ? created.id : undefined);
      setSuccessMessage("Đã tạo năm học mới.");
    } catch (error) {
      console.warn("[settings] create year failed", error);
      setErrorMessage(typeof error === "string" ? error : "Không tạo được năm học mới.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmEditYear() {
    if (!editForm) {
      return;
    }

    const validationError = validateForm(editForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateAcademicYear({
        id: editForm.id,
        label: editForm.label.trim(),
        startsAt: editForm.startsAt,
        endsAt: editForm.endsAt,
      });
      setEditForm(null);
      await onYearsChanged();
      setSuccessMessage("Đã cập nhật năm học.");
    } catch (error) {
      console.warn("[settings] update year failed", error);
      setErrorMessage(typeof error === "string" ? error : "Không cập nhật được năm học.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmSetCurrentYear() {
    if (!pendingCurrentYear) {
      return;
    }

    const year = pendingCurrentYear;
    setIsSaving(true);
    setErrorMessage("");

    try {
      await setCurrentAcademicYear(year.id);
      setPendingCurrentYear(null);
      await onYearsChanged(year.id);
      setSuccessMessage("Đã đổi năm học hiện tại.");
    } catch (error) {
      console.warn("[settings] set current year failed", error);
      setPendingCurrentYear(null);
      setErrorMessage(typeof error === "string" ? error : "Không đổi được năm học hiện tại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-full min-w-0 space-y-8 pb-0">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Cài đặt</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground">Quản lý thiết lập ứng dụng.</p>
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage && !errorMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <Card className="rounded-lg border-slate-200 shadow-sm" data-size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Năm học</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tạo năm học mới và chọn năm học đang sử dụng.
          </p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Năm học hiện tại:{" "}
              <span className="font-semibold text-slate-950">
                {currentYear?.label ?? "Chưa chọn"}
              </span>
            </p>
            <Button type="button" className="gap-2" onClick={openCreateDialog} disabled={isSaving}>
              <CalendarPlus className="size-4" />
              Tạo năm học mới
            </Button>
          </div>

          {academicYears.length > 0 ? (
            <div className="min-w-0 rounded-lg border">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">STT</TableHead>
                    <TableHead>Năm học</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-56">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicYears.map((year, index) => (
                    <TableRow key={year.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium text-slate-950">{year.label}</TableCell>
                      <TableCell className="text-slate-700">
                        {formatDate(year.startsAt)} - {formatDate(year.endsAt)}
                      </TableCell>
                      <TableCell>
                        {year.isCurrent ? (
                          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                            Đang sử dụng
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!year.isCurrent ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => {
                                setErrorMessage("");
                                setSuccessMessage("");
                                setPendingCurrentYear(year);
                              }}
                            >
                              Đặt làm hiện tại
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={isSaving}
                            onClick={() => openEditDialog(year)}
                          >
                            <Pencil className="size-4" />
                            Sửa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
              Chưa có năm học nào.
            </p>
          )}
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <AppInfoCard />

      <YearFormDialog
        title="Tạo năm học mới"
        confirmLabel="Tạo năm học"
        form={createForm}
        academicYears={academicYears}
        excludeYearId={null}
        showMakeCurrent
        isSaving={isSaving}
        onChange={setCreateForm}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setCreateForm(null);
          }
        }}
        onConfirm={confirmCreateYear}
      />

      <YearFormDialog
        title="Cập nhật năm học"
        confirmLabel="Lưu thay đổi"
        form={editForm}
        academicYears={academicYears}
        excludeYearId={editForm?.id ?? null}
        showMakeCurrent={false}
        isSaving={isSaving}
        classCountWarning={
          editingYear && editingYear.classCount > 0
            ? "Năm học này đã có lớp. Việc sửa ngày bắt đầu/kết thúc không tự động thay đổi thời gian học của các lớp."
            : ""
        }
        onChange={(next) => {
          if (next && editForm) {
            setEditForm({ ...next, id: editForm.id });
          } else {
            setEditForm(null);
          }
        }}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setEditForm(null);
          }
        }}
        onConfirm={confirmEditYear}
      />

      <Dialog
        open={Boolean(pendingCurrentYear)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setPendingCurrentYear(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi năm học hiện tại?</DialogTitle>
            <DialogDescription>
              Ứng dụng sẽ chuyển về năm học {pendingCurrentYear?.label}. Danh sách lớp ở trang Tổng
              quan sẽ hiển thị theo năm học này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmSetCurrentYear} disabled={isSaving}>
              {isSaving ? "Đang đổi..." : "Đổi năm học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AppInfoCard() {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm" data-size="sm">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))] md:items-center">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">Thông tin ứng dụng</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ứng dụng quản lý lớp học thêm, dữ liệu lưu SQLite trên máy tính này.
          </p>
        </div>
        <AppInfoItem label="Kiểu dữ liệu" value="Lưu cục bộ" />
        <AppInfoItem label="Sao lưu" value="Có thể sao lưu/khôi phục" />
      </CardContent>
    </Card>
  );
}

function AppInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function submitChangePassword() {
    setPasswordSuccess("");

    if (!currentPassword.trim()) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Nhập lại mật khẩu mới chưa khớp.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Đã đổi mật khẩu.");
    } catch (error) {
      console.warn("[settings] change password failed", error);
      setPasswordError(
        typeof error === "string" ? error : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 shadow-sm" data-size="sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Bảo mật</CardTitle>
        <p className="text-sm text-muted-foreground">Đổi mật khẩu đăng nhập ứng dụng.</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {passwordError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </p>
        ) : null}
        {passwordSuccess && !passwordError ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {passwordSuccess}
          </p>
        ) : null}

        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <SettingsPasswordInput
            id="current-password"
            label="Mật khẩu hiện tại"
            value={currentPassword}
            autoComplete="current-password"
            isVisible={showCurrentPassword}
            onChange={setCurrentPassword}
            onToggleVisibility={() => setShowCurrentPassword((current) => !current)}
          />
          <SettingsPasswordInput
            id="new-password"
            label="Mật khẩu mới"
            value={newPassword}
            autoComplete="new-password"
            isVisible={showNewPassword}
            onChange={setNewPassword}
            onToggleVisibility={() => setShowNewPassword((current) => !current)}
          />
          <SettingsPasswordInput
            id="confirm-password"
            label="Nhập lại mật khẩu mới"
            value={confirmPassword}
            autoComplete="new-password"
            isVisible={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
          />
          <div className="lg:pb-px">
            <Button type="button" onClick={submitChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPasswordInput({
  id,
  label,
  value,
  autoComplete,
  isVisible,
  onChange,
  onToggleVisibility,
}: SettingsPasswordInputProps) {
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          <VisibilityIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function YearFormDialog({
  title,
  confirmLabel,
  form,
  academicYears,
  excludeYearId,
  showMakeCurrent,
  isSaving,
  classCountWarning,
  onChange,
  onOpenChange,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  form: YearFormState | null;
  academicYears: AcademicYear[];
  excludeYearId: number | null;
  showMakeCurrent: boolean;
  isSaving: boolean;
  classCountWarning?: string;
  onChange: (form: YearFormState | null) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const overlapWarning =
    form && form.startsAt && form.endsAt && form.endsAt > form.startsAt
      ? academicYears.some(
          (year) =>
            year.id !== excludeYearId &&
            form.startsAt <= year.endsAt &&
            year.startsAt <= form.endsAt,
        )
      : false;

  return (
    <Dialog open={Boolean(form)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {form ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="year-label">Tên năm học</Label>
              <Input
                id="year-label"
                value={form.label}
                placeholder="Ví dụ: Năm học 2027 - 2028"
                onChange={(event) => onChange({ ...form, label: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="year-starts">Ngày bắt đầu</Label>
                <DateInput
                  id="year-starts"
                  value={form.startsAt}
                  onValueChange={(value) => onChange({ ...form, startsAt: value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year-ends">Ngày kết thúc</Label>
                <DateInput
                  id="year-ends"
                  value={form.endsAt}
                  onValueChange={(value) => onChange({ ...form, endsAt: value })}
                />
              </div>
            </div>
            {showMakeCurrent ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.makeCurrent}
                  onChange={(event) => onChange({ ...form, makeCurrent: event.target.checked })}
                  className="size-4 accent-emerald-600"
                />
                Đặt làm năm học hiện tại
              </label>
            ) : null}
            {classCountWarning ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {classCountWarning}
              </p>
            ) : null}
            {overlapWarning ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Khoảng thời gian này có thể trùng với năm học khác.
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/// Gợi ý năm học kế tiếp từ năm mới nhất: label +1 và khoảng 01/08 - 31/07.
function suggestNextYearForm(academicYears: AcademicYear[]): YearFormState {
  const latestYear = [...academicYears].sort((first, second) =>
    second.startsAt.localeCompare(first.startsAt),
  )[0];

  const latestStartYear = latestYear
    ? Number(latestYear.startsAt.slice(0, 4))
    : new Date().getFullYear();
  const nextStartYear = latestStartYear + 1;

  return {
    label: `Năm học ${nextStartYear} - ${nextStartYear + 1}`,
    startsAt: `${nextStartYear}-08-01`,
    endsAt: `${nextStartYear + 1}-07-31`,
    makeCurrent: false,
  };
}
