import { Card, CardContent } from "@/components/ui/card";

const settingSections = [
  {
    title: "Đổi mật khẩu",
    description: "Thiết lập mật khẩu đăng nhập cho ứng dụng.",
  },
  {
    title: "Năm học hiện tại",
    description: "Chọn năm học mặc định khi mở ứng dụng.",
  },
  {
    title: "Thông tin ứng dụng",
    description: "Phiên bản thử nghiệm dùng dữ liệu mẫu.",
  },
];

export function SettingsPage() {
  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Cài đặt</h2>
        <p className="mt-2 text-muted-foreground">
          Các thiết lập ứng dụng sẽ được phát triển sau.
        </p>
      </section>

      <section className="grid gap-3">
        {settingSections.map((section) => (
          <Card key={section.title} className="rounded-lg border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-950">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
