ALTER TABLE classes ADD COLUMN start_month TEXT NOT NULL DEFAULT '';
ALTER TABLE classes ADD COLUMN end_month TEXT NOT NULL DEFAULT '';
ALTER TABLE classes ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

UPDATE classes
SET start_month = COALESCE(
      (SELECT substr(ay.starts_at, 1, 7) FROM academic_years ay WHERE ay.id = classes.academic_year_id),
      strftime('%Y-%m', 'now', 'localtime')
    )
WHERE start_month = '';

UPDATE classes
SET end_month = COALESCE(
      (SELECT substr(ay.ends_at, 1, 7) FROM academic_years ay WHERE ay.id = classes.academic_year_id),
      strftime('%Y-%m', 'now', 'localtime')
    )
WHERE end_month = '';

ALTER TABLE class_memberships ADD COLUMN joined_month TEXT NOT NULL DEFAULT '';
ALTER TABLE class_memberships ADD COLUMN left_month TEXT;

UPDATE class_memberships
SET joined_month = COALESCE(
      (SELECT c.start_month FROM classes c WHERE c.id = class_memberships.class_id),
      strftime('%Y-%m', 'now', 'localtime')
    )
WHERE joined_month = '';

-- Membership đã paused từ trước migration chưa có tháng nghỉ; gán tạm bằng joined_month
-- (nghĩa là không học tháng nào). Dev nên reset data.sqlite để có dữ liệu seed sạch.
UPDATE class_memberships
SET left_month = joined_month
WHERE status = 'paused' AND left_month IS NULL;
