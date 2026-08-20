-- Permanently delete exactly these two students and all booking/payment data
-- attached to them.
--
-- Target registration numbers:
--   20211266632
--   20211275432
--
-- PostgreSQL / Prisma schema order matters because the foreign keys use
-- ON DELETE RESTRICT:
--   Payment -> Reservation -> Student
--
-- The transaction aborts without deleting anything unless both students are
-- present. Review the SELECT output before running this script in production.

BEGIN;

CREATE TEMP TABLE deletion_targets (
  student_id TEXT PRIMARY KEY,
  reg_no TEXT NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO deletion_targets (student_id, reg_no)
SELECT "id", "regNo"
FROM "Student"
WHERE "regNo" IN ('20211266632', '20211275432');

-- Safety check: require an exact match for both requested students.
DO $$
DECLARE
  target_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO target_count FROM deletion_targets;

  IF target_count <> 2 THEN
    RAISE EXCEPTION
      'Deletion cancelled: expected exactly 2 matching students, found %',
      target_count;
  END IF;
END $$;

-- Preview the exact students and number of dependent records to be removed.
SELECT
  t.reg_no,
  s."email",
  s."name",
  COUNT(DISTINCT r."id") AS reservation_count,
  COUNT(DISTINCT p."id") AS payment_count
FROM deletion_targets t
JOIN "Student" s ON s."id" = t.student_id
LEFT JOIN "Reservation" r ON r."studentId" = t.student_id
LEFT JOIN "Payment" p ON p."reservationId" = r."id"
GROUP BY t.reg_no, s."email", s."name"
ORDER BY t.reg_no;

-- Delete deepest dependent records first.
DELETE FROM "Payment" p
USING "Reservation" r, deletion_targets t
WHERE p."reservationId" = r."id"
  AND r."studentId" = t.student_id;

DELETE FROM "Reservation" r
USING deletion_targets t
WHERE r."studentId" = t.student_id;

DELETE FROM "Student" s
USING deletion_targets t
WHERE s."id" = t.student_id;

COMMIT;
