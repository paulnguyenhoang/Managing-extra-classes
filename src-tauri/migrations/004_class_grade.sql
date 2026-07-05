ALTER TABLE classes ADD COLUMN grade INTEGER;

UPDATE classes SET grade = 8 WHERE grade IS NULL AND name LIKE '%8%';
UPDATE classes SET grade = 9 WHERE grade IS NULL AND name LIKE '%9%';
UPDATE classes SET grade = 9 WHERE grade IS NULL;
