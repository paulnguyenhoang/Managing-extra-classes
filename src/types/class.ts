export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ClassScheduleItem = {
  weekday: WeekdayIndex;
  startTime: string;
  endTime: string;
};

export type ExtraClass = {
  id: string;
  academicYearId: string;
  name: string;
  schedule: string;
  monthlyFee: number;
  room: string;
  note?: string;
};
