import type { AcademicYear } from "@/types/academic-year";
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
} from "@/types/attendance";
import type { ExtraClass } from "@/types/class";
import type { Payment } from "@/types/payment";
import type { ScoreColumn, ScoreRecord } from "@/types/score";
import type { Student } from "@/types/student";

export const currentPaymentMonth = "2026-07";

export const paymentMonths = ["2026-05", "2026-06", "2026-07", "2026-08"];

export const academicYears: AcademicYear[] = [
  {
    id: "2025-2026",
    label: "Năm học 2025 - 2026",
    startsAt: "2025-08-01",
    endsAt: "2026-05-31",
    isCurrent: true,
  },
  {
    id: "2024-2025",
    label: "Năm học 2024 - 2025",
    startsAt: "2024-08-01",
    endsAt: "2025-05-31",
    isCurrent: false,
  },
  {
    id: "2026-2027",
    label: "Năm học 2026 - 2027",
    startsAt: "2026-08-01",
    endsAt: "2027-05-31",
    isCurrent: false,
  },
];

export const classes: ExtraClass[] = [
  {
    id: "van-9a",
    academicYearId: "2025-2026",
    name: "Văn 9 - Ôn thi vào 10",
    schedule: "Thứ 3, Thứ 6 - 18:00",
    monthlyFee: 700000,
    room: "Phòng học nhà thầy",
  },
  {
    id: "van-8a",
    academicYearId: "2025-2026",
    name: "Văn 8 - Nâng cao",
    schedule: "Thứ 2, Thứ 5 - 17:30",
    monthlyFee: 600000,
    room: "Phòng học nhà thầy",
  },
  {
    id: "van-7a",
    academicYearId: "2025-2026",
    name: "Văn 7 - Cơ bản",
    schedule: "Thứ 4, Chủ nhật - 19:00",
    monthlyFee: 550000,
    room: "Phòng học nhà thầy",
  },
  {
    id: "van-9-old",
    academicYearId: "2024-2025",
    name: "Văn 9 - Khóa trước",
    schedule: "Thứ 3, Thứ 6 - 18:00",
    monthlyFee: 650000,
    room: "Phòng học nhà thầy",
  },
];

export const students: Student[] = [
  {
    id: "s1",
    classId: "van-9a",
    fullName: "Nguyễn Minh Anh",
    schoolClass: "9A1",
    school: "THCS Nguyễn Du",
    parentPhone: "0901 234 567",
    status: "active",
    note: "Viết văn tốt",
  },
  {
    id: "s2",
    classId: "van-9a",
    fullName: "Trần Quốc Bảo",
    schoolClass: "9A3",
    school: "THCS Lê Quý Đôn",
    parentPhone: "0912 345 678",
    status: "active",
    note: "Cần luyện mở bài",
  },
  {
    id: "s3",
    classId: "van-9a",
    fullName: "Phạm Gia Hân",
    schoolClass: "9A2",
    school: "THCS Nguyễn Du",
    parentPhone: "0988 222 111",
    status: "active",
  },
  {
    id: "s4",
    classId: "van-9a",
    fullName: "Lê Hoàng Nam",
    schoolClass: "9A4",
    school: "THCS Trần Phú",
    parentPhone: "0934 555 666",
    status: "paused",
    note: "Nghỉ tạm 2 tuần",
  },
  {
    id: "s5",
    classId: "van-8a",
    fullName: "Đỗ Khánh Linh",
    schoolClass: "8B1",
    school: "THCS Nguyễn Du",
    parentPhone: "0909 888 777",
    status: "active",
  },
  {
    id: "s6",
    classId: "van-8a",
    fullName: "Vũ Đức Minh",
    schoolClass: "8B2",
    school: "THCS Lý Thường Kiệt",
    parentPhone: "0977 123 456",
    status: "active",
  },
  {
    id: "s7",
    classId: "van-7a",
    fullName: "Bùi Ngọc Mai",
    schoolClass: "7C1",
    school: "THCS Trần Phú",
    parentPhone: "0966 321 123",
    status: "active",
  },
  {
    id: "s8",
    classId: "van-7a",
    fullName: "Hoàng Tuấn Kiệt",
    schoolClass: "7C2",
    school: "THCS Nguyễn Du",
    parentPhone: "0922 444 555",
    status: "active",
  },
  {
    id: "s9",
    classId: "van-9-old",
    fullName: "Nguyễn Hải Long",
    schoolClass: "10A1",
    school: "THPT Chuyên Lê Hồng Phong",
    parentPhone: "0903 222 333",
    status: "active",
  },
];

export const payments: Payment[] = [
  {
    id: "p1",
    studentId: "s1",
    classId: "van-9a",
    month: currentPaymentMonth,
    status: "paid",
    amount: 700000,
    paidAt: "2026-07-02",
  },
  {
    id: "p2",
    studentId: "s2",
    classId: "van-9a",
    month: currentPaymentMonth,
    status: "unpaid",
    amount: 700000,
    note: "Nhắc phụ huynh cuối tuần",
  },
  {
    id: "p3",
    studentId: "s3",
    classId: "van-9a",
    month: currentPaymentMonth,
    status: "paid",
    amount: 700000,
    paidAt: "2026-07-01",
  },
  {
    id: "p4",
    studentId: "s4",
    classId: "van-9a",
    month: currentPaymentMonth,
    status: "waived",
    amount: 350000,
    paidAt: "2026-07-05",
    note: "Giảm còn 350.000 đ",
  },
  {
    id: "p5",
    studentId: "s5",
    classId: "van-8a",
    month: currentPaymentMonth,
    status: "paid",
    amount: 600000,
    paidAt: "2026-07-03",
  },
  {
    id: "p6",
    studentId: "s6",
    classId: "van-8a",
    month: currentPaymentMonth,
    status: "waived",
    amount: 0,
    note: "Miễn giảm tháng này",
  },
  {
    id: "p7",
    studentId: "s7",
    classId: "van-7a",
    month: currentPaymentMonth,
    status: "paid",
    amount: 550000,
    paidAt: "2026-07-04",
  },
  {
    id: "p8",
    studentId: "s8",
    classId: "van-7a",
    month: currentPaymentMonth,
    status: "paid",
    amount: 550000,
    paidAt: "2026-07-04",
  },
  {
    id: "p9",
    studentId: "s1",
    classId: "van-9a",
    month: "2026-06",
    status: "paid",
    amount: 700000,
    paidAt: "2026-06-03",
  },
  {
    id: "p10",
    studentId: "s2",
    classId: "van-9a",
    month: "2026-06",
    status: "paid",
    amount: 700000,
    paidAt: "2026-06-04",
  },
  {
    id: "p11",
    studentId: "s3",
    classId: "van-9a",
    month: "2026-06",
    status: "waived",
    amount: 300000,
    paidAt: "2026-06-05",
    note: "Giảm còn 300.000 đ",
  },
  {
    id: "p12",
    studentId: "s4",
    classId: "van-9a",
    month: "2026-06",
    status: "unpaid",
    amount: 0,
    note: "Hẹn đóng cuối tuần",
  },
  {
    id: "p13",
    studentId: "s1",
    classId: "van-9a",
    month: "2026-05",
    status: "paid",
    amount: 700000,
    paidAt: "2026-05-03",
  },
  {
    id: "p14",
    studentId: "s2",
    classId: "van-9a",
    month: "2026-05",
    status: "waived",
    amount: 0,
    note: "Con người quen, miễn học phí",
  },
  {
    id: "p15",
    studentId: "s3",
    classId: "van-9a",
    month: "2026-05",
    status: "paid",
    amount: 700000,
    paidAt: "2026-05-02",
  },
  {
    id: "p16",
    studentId: "s4",
    classId: "van-9a",
    month: "2026-05",
    status: "paid",
    amount: 700000,
    paidAt: "2026-05-06",
  },
  {
    id: "p17",
    studentId: "s1",
    classId: "van-9a",
    month: "2026-08",
    status: "unpaid",
    amount: 0,
  },
  {
    id: "p18",
    studentId: "s2",
    classId: "van-9a",
    month: "2026-08",
    status: "unpaid",
    amount: 0,
  },
];

export const attendanceSessions: AttendanceSession[] = [
  { id: "a1", classId: "van-9a", date: "2026-07-01" },
  { id: "a2", classId: "van-9a", date: "2026-07-04" },
  { id: "a3", classId: "van-9a", date: "2026-07-08" },
  { id: "a4", classId: "van-8a", date: "2026-07-02" },
  { id: "a5", classId: "van-8a", date: "2026-07-06" },
  { id: "a6", classId: "van-7a", date: "2026-07-03" },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "ar1", sessionId: "a1", studentId: "s1", status: "present" },
  { id: "ar2", sessionId: "a1", studentId: "s2", status: "makeup" },
  { id: "ar3", sessionId: "a1", studentId: "s3", status: "present" },
  { id: "ar4", sessionId: "a1", studentId: "s4", status: "absent" },
  { id: "ar5", sessionId: "a2", studentId: "s1", status: "present" },
  { id: "ar6", sessionId: "a2", studentId: "s2", status: "present" },
  { id: "ar7", sessionId: "a2", studentId: "s3", status: "absent" },
  { id: "ar8", sessionId: "a2", studentId: "s4", status: "absent" },
  { id: "ar9", sessionId: "a3", studentId: "s1", status: "present" },
  { id: "ar10", sessionId: "a3", studentId: "s2", status: "present" },
  { id: "ar11", sessionId: "a3", studentId: "s3", status: "present" },
  { id: "ar12", sessionId: "a3", studentId: "s4", status: "absent" },
  { id: "ar13", sessionId: "a4", studentId: "s5", status: "present" },
  { id: "ar14", sessionId: "a4", studentId: "s6", status: "makeup" },
  { id: "ar15", sessionId: "a5", studentId: "s5", status: "present" },
  { id: "ar16", sessionId: "a5", studentId: "s6", status: "present" },
  { id: "ar17", sessionId: "a6", studentId: "s7", status: "present" },
  { id: "ar18", sessionId: "a6", studentId: "s8", status: "absent" },
];

export const scoreColumns: ScoreColumn[] = [
  { id: "sc1", classId: "van-9a", label: "Bài viết số 1" },
  { id: "sc2", classId: "van-9a", label: "15 phút" },
  { id: "sc3", classId: "van-9a", label: "Giữa kỳ" },
  { id: "sc4", classId: "van-8a", label: "Bài viết số 1" },
  { id: "sc5", classId: "van-8a", label: "15 phút" },
  { id: "sc6", classId: "van-8a", label: "Giữa kỳ" },
  { id: "sc7", classId: "van-7a", label: "Bài viết số 1" },
  { id: "sc8", classId: "van-7a", label: "15 phút" },
  { id: "sc9", classId: "van-7a", label: "Giữa kỳ" },
];

export const scoreRecords: ScoreRecord[] = [
  { id: "sr1", columnId: "sc1", studentId: "s1", value: 8.5 },
  { id: "sr2", columnId: "sc2", studentId: "s1", value: 9 },
  { id: "sr3", columnId: "sc3", studentId: "s1", value: 8 },
  { id: "sr4", columnId: "sc1", studentId: "s2", value: 7 },
  { id: "sr5", columnId: "sc2", studentId: "s2", value: 7.5 },
  { id: "sr6", columnId: "sc3", studentId: "s2", value: 7 },
  { id: "sr7", columnId: "sc1", studentId: "s3", value: 8 },
  { id: "sr8", columnId: "sc2", studentId: "s3", value: 8.5 },
  { id: "sr9", columnId: "sc3", studentId: "s3", value: 8.5 },
  { id: "sr10", columnId: "sc1", studentId: "s4", value: null, note: "Chưa nộp bài" },
  { id: "sr11", columnId: "sc4", studentId: "s5", value: 8 },
  { id: "sr12", columnId: "sc5", studentId: "s5", value: 8.5 },
  { id: "sr13", columnId: "sc6", studentId: "s5", value: 8 },
  { id: "sr14", columnId: "sc4", studentId: "s6", value: 7.5 },
  { id: "sr15", columnId: "sc5", studentId: "s6", value: 7 },
  { id: "sr16", columnId: "sc6", studentId: "s6", value: 7.5 },
  { id: "sr17", columnId: "sc7", studentId: "s7", value: 8 },
  { id: "sr18", columnId: "sc8", studentId: "s7", value: 8 },
  { id: "sr19", columnId: "sc9", studentId: "s7", value: 8.5 },
  { id: "sr20", columnId: "sc7", studentId: "s8", value: 7 },
  { id: "sr21", columnId: "sc8", studentId: "s8", value: 7.5 },
  { id: "sr22", columnId: "sc9", studentId: "s8", value: 7 },
];

export type ClassOverview = ExtraClass & {
  studentCount: number;
  unpaidCount: number;
};

export type HomeSummary = {
  totalClasses: number;
  totalStudents: number;
  unpaidThisMonth: number;
};

export type AttendanceRow = {
  student: Student;
  note?: string;
  statusesBySessionId: Record<string, AttendanceStatus | undefined>;
};

export type ScoreRow = {
  student: Student;
  note?: string;
  valuesByColumnId: Record<string, number | null | undefined>;
};

export function getCurrentAcademicYearId() {
  return academicYears.find((year) => year.isCurrent)?.id ?? academicYears[0]?.id ?? "";
}

export function getClassById(classId: string) {
  return classes.find((item) => item.id === classId);
}

export function getStudentsByClassId(classId: string) {
  return students.filter((student) => student.classId === classId);
}

export function getPaymentsForClassMonth(classId: string, month = currentPaymentMonth) {
  return payments.filter((payment) => payment.classId === classId && payment.month === month);
}

export function getUnpaidCountForClass(classId: string, month = currentPaymentMonth) {
  return getPaymentsForClassMonth(classId, month).filter(
    (payment) => payment.status === "unpaid",
  ).length;
}

export function getClassOverviewsByYear(academicYearId: string): ClassOverview[] {
  return getAllClassOverviews()
    .filter((item) => item.academicYearId === academicYearId)
}

export function getAllClassOverviews(): ClassOverview[] {
  return classes.map((item) => ({
    ...item,
    studentCount: getStudentsByClassId(item.id).length,
    unpaidCount: getUnpaidCountForClass(item.id),
  }));
}

export function getHomeSummary(academicYearId: string): HomeSummary {
  const visibleClasses = getClassOverviewsByYear(academicYearId);
  const classIds = new Set(visibleClasses.map((item) => item.id));
  const visibleStudents = students.filter((student) => classIds.has(student.classId));

  return {
    totalClasses: visibleClasses.length,
    totalStudents: visibleStudents.length,
    unpaidThisMonth: visibleClasses.reduce((total, item) => total + item.unpaidCount, 0),
  };
}

export function getAttendanceSessionsByClassId(classId: string) {
  return attendanceSessions.filter((session) => session.classId === classId);
}

export function getAttendanceRowsByClassId(classId: string): AttendanceRow[] {
  const sessions = getAttendanceSessionsByClassId(classId);
  const classStudents = getStudentsByClassId(classId);

  return classStudents.map((student) => {
    const statusesBySessionId = sessions.reduce<AttendanceRow["statusesBySessionId"]>(
      (result, session) => {
        result[session.id] = attendanceRecords.find(
          (record) => record.sessionId === session.id && record.studentId === student.id,
        )?.status;

        return result;
      },
      {},
    );

    return {
      student,
      statusesBySessionId,
      note: student.note,
    };
  });
}

export function getScoreColumnsByClassId(classId: string) {
  return scoreColumns.filter((column) => column.classId === classId);
}

export function getScoreRowsByClassId(classId: string): ScoreRow[] {
  const columns = getScoreColumnsByClassId(classId);
  const classStudents = getStudentsByClassId(classId);

  return classStudents.map((student) => {
    const valuesByColumnId = columns.reduce<ScoreRow["valuesByColumnId"]>((result, column) => {
      result[column.id] = scoreRecords.find(
        (record) => record.columnId === column.id && record.studentId === student.id,
      )?.value;

      return result;
    }, {});

    return {
      student,
      valuesByColumnId,
      note: scoreRecords.find((record) => record.studentId === student.id && record.note)?.note,
    };
  });
}
