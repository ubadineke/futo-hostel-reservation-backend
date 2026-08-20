-- Roost production schema reset
--
-- Purpose:
--   Preserve the existing `public."Student"` accounts, discard the old
--   admin/hostel/room/bed/reservation/payment data, and install the schema in
--   prisma/schema.prisma.
--
-- This script is deliberately atomic. If the current Student table does not
-- meet the application's authentication requirements, it raises an error
-- before any disposable table is dropped.
--
-- After this script, `prisma migrate deploy` is safe: this script records the
-- current migration as applied in `_prisma_migrations`.

BEGIN;

-- Preserve existing accounts only when their credentials and identifiers are
-- compatible with AuthService: string id, bcrypt passwordHash, and a usable
-- registration number or email for every row.
DO $$
BEGIN
  IF to_regclass('public."Student"') IS NULL THEN
    CREATE TABLE "Student" (
      "id" TEXT NOT NULL,
      "regNo" TEXT,
      "email" TEXT,
      "name" TEXT,
      "dept" TEXT,
      "level" TEXT,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
    );
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Student'
        AND column_name = 'id' AND data_type = 'text'
    ) THEN
      RAISE EXCEPTION 'Student table must contain a text "id" column; no changes were made.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Student'
        AND column_name = 'passwordHash' AND data_type = 'text'
    ) THEN
      RAISE EXCEPTION 'Student table must contain a text "passwordHash" column with the existing bcrypt hashes; no changes were made.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public."Student"'::regclass
        AND contype = 'p'
        AND cardinality(conkey) = 1
        AND conkey[1] = (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public."Student"'::regclass
            AND attname = 'id' AND NOT attisdropped
        )
    ) THEN
      RAISE EXCEPTION 'Student table must have PRIMARY KEY ("id"); no changes were made.';
    END IF;
  END IF;
END $$;

-- These profile fields are nullable in the current application. Adding them
-- does not alter account identities or password hashes.
ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "regNo" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "dept" TEXT,
  ADD COLUMN IF NOT EXISTS "level" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Student"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "passwordHash" SET NOT NULL;

UPDATE "Student"
SET
  "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "Student"
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Student" WHERE "passwordHash" IS NULL OR "passwordHash" = '') THEN
    RAISE EXCEPTION 'Student table has an account without passwordHash; no disposable data was removed.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Student" WHERE "regNo" IS NULL AND "email" IS NULL) THEN
    RAISE EXCEPTION 'Student table has an account without regNo or email; map its legacy identifier first.';
  END IF;
END $$;

-- Uniqueness is required by student registration/login. Duplicate legacy data
-- will make the statement fail and roll back the transaction safely.
CREATE UNIQUE INDEX IF NOT EXISTS "Student_regNo_key" ON "Student"("regNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_email_key" ON "Student"("email");

-- The user confirmed that all non-student operational data may be replaced.
DROP TABLE IF EXISTS "Payment", "Reservation", "Bed", "Room", "Hostel", "Admin" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "ReservationStatus";
DROP TYPE IF EXISTS "Gender";

CREATE TYPE "Gender" AS ENUM ('male', 'female', 'mixed', 'postgrad');
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'reserved', 'paid', 'cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

CREATE TABLE "Admin" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Hostel" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "funder" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "price" INTEGER NOT NULL,
  "capacity" INTEGER NOT NULL,
  "blurb" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "coverA" BIGINT NOT NULL,
  "coverB" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "hostelId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bed" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "rrr" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "hostelId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "roomIndex" INTEGER NOT NULL,
  "bedId" TEXT NOT NULL,
  "bedNumber" INTEGER NOT NULL,
  "fee" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "rrr" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "authorizationUrl" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE INDEX "Room_hostelId_idx" ON "Room"("hostelId");
CREATE UNIQUE INDEX "Room_hostelId_index_key" ON "Room"("hostelId", "index");
CREATE UNIQUE INDEX "Bed_roomId_number_key" ON "Bed"("roomId", "number");
CREATE UNIQUE INDEX "Reservation_reference_key" ON "Reservation"("reference");
CREATE UNIQUE INDEX "Reservation_rrr_key" ON "Reservation"("rrr");
CREATE INDEX "Reservation_studentId_idx" ON "Reservation"("studentId");
CREATE INDEX "Reservation_hostelId_idx" ON "Reservation"("hostelId");
CREATE INDEX "Reservation_bedId_idx" ON "Reservation"("bedId");
CREATE UNIQUE INDEX "Payment_rrr_key" ON "Payment"("rrr");
CREATE UNIQUE INDEX "Payment_reservationId_key" ON "Payment"("reservationId");

ALTER TABLE "Room"
  ADD CONSTRAINT "Room_hostelId_fkey"
  FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bed"
  ADD CONSTRAINT "Bed_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Reservation_hostelId_fkey"
  FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Reservation_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Reservation_bedId_fkey"
  FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mark exactly the schema migration in this repository as already applied.
-- This prevents Render's `prisma migrate deploy` startup command from trying
-- to create the same tables a second time.
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

DELETE FROM "_prisma_migrations";
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count"
) VALUES (
  'b8cc7f38-8f15-45b5-83f2-6557896d4eea',
  '0006c07ac9b59b01c428bfbc53f5bf9e3aa2cf4223bfb2a169c3968d98536639',
  now(),
  '20260819080922_single_room_size_per_hostel',
  now(),
  1
);

COMMIT;
