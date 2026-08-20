import { Gender, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Each hostel has one room size, uniform across every physical room in it.
type HostelSeed = {
  id: string;
  name: string;
  code: string;
  funder: string;
  gender: Gender;
  price: number;
  capacity: number;
  roomCount: number;
  lat: number;
  lng: number;
  coverA: bigint;
  coverB: bigint;
  blurb: string;
};

// Catalog data only — no fake occupancy, every bed starts available.
// REQUIREMENTS.md §9 notes gender/price/blurb are representative, not
// officially published by FUTO — confirm with the real Hostel Officer and
// adjust via the admin API (PATCH /admin/hostels/:id, /admin/rooms) once
// real figures are known.
const HOSTELS: HostelSeed[] = [
  {
    id: 'A', name: 'Hostel A', code: 'A', funder: 'School', gender: Gender.male,
    price: 100, capacity: 8, roomCount: 11, lat: 5.3869, lng: 7.0341,
    coverA: 0xff1e3a8an, coverB: 0xff2563ebn,
    blurb: 'A male school block close to the lecture halls. Dense, lively, and the cheapest way to stay on campus.',
  },
  {
    id: 'B', name: 'Hostel B', code: 'B', funder: 'School', gender: Gender.male,
    price: 42000, capacity: 8, roomCount: 12, lat: 5.3872, lng: 7.0347,
    coverA: 0xff312e81n, coverB: 0xff4f46e5n,
    blurb: 'Male school block beside Hostel A. Filling fast for the session.',
  },
  {
    id: 'C', name: 'Hostel C', code: 'C', funder: 'School', gender: Gender.female,
    price: 45000, capacity: 8, roomCount: 10, lat: 5.3858, lng: 7.0359,
    coverA: 0xff0f766en, coverB: 0xff0ea5a4n,
    blurb: 'A female block near TETFund. Calmer rooms with a little more space.',
  },
  {
    id: 'D', name: 'Hostel D', code: 'D', funder: 'School', gender: Gender.female,
    price: 45000, capacity: 8, roomCount: 8, lat: 5.3855, lng: 7.0364,
    coverA: 0xff155e75n, coverB: 0xff0891b2n,
    blurb: 'Female school block.',
  },
  {
    id: 'E', name: 'Hostel E', code: 'E', funder: 'School', gender: Gender.male,
    price: 42000, capacity: 8, roomCount: 8, lat: 5.3877, lng: 7.0338,
    coverA: 0xff1e293bn, coverB: 0xff334155n,
    blurb: 'Male school block on the far side.',
  },
  {
    id: 'TETFUND', name: 'TETFund Hostel', code: 'TF', funder: 'TETFund', gender: Gender.mixed,
    price: 90000, capacity: 4, roomCount: 20, lat: 5.3851, lng: 7.0366,
    coverA: 0xff1d4ed8n, coverB: 0xff3b82f6n,
    blurb: 'The newest, most comfortable block — four to a room, en-suite, mixed and floor-segregated.',
  },
  {
    id: 'NDDC', name: 'NDDC Hostel', code: 'ND', funder: 'NDDC', gender: Gender.mixed,
    price: 62500, capacity: 4, roomCount: 25, lat: 5.3848, lng: 7.0371,
    coverA: 0xff134e4an, coverB: 0xff0d9488n,
    blurb: 'Lower-density, two-storey block housing both genders by floor. Premium comfort for the price.',
  },
  {
    id: 'PG', name: 'PG Hostel', code: 'PG', funder: 'Postgraduate', gender: Gender.postgrad,
    price: 75000, capacity: 6, roomCount: 9, lat: 5.3845, lng: 7.0331,
    coverA: 0xff4c1d95n, coverB: 0xff6d28d9n,
    blurb: 'Quiet quarters for postgraduate students, six to a room.',
  },
];

async function main() {
  // Guard against ever wiping a live database: this script never deletes
  // anything. Catalog seeding runs once (skipped if hostels already exist);
  // the admin is upserted by email so re-running is always safe.
  const existingHostels = await prisma.hostel.count();
  if (existingHostels > 0) {
    console.log(`Skipping hostel/room/bed seed — ${existingHostels} hostel(s) already exist.`);
  } else {
    for (const h of HOSTELS) {
      await prisma.hostel.create({
        data: {
          id: h.id, name: h.name, code: h.code, funder: h.funder, gender: h.gender,
          price: h.price, capacity: h.capacity, blurb: h.blurb, lat: h.lat, lng: h.lng,
          coverA: h.coverA, coverB: h.coverB,
        },
      });
      for (let index = 1; index <= h.roomCount; index++) {
        const room = await prisma.room.create({ data: { hostelId: h.id, index } });
        await prisma.bed.createMany({
          data: Array.from({ length: h.capacity }, (_, i) => ({ roomId: room.id, number: i + 1 })),
        });
      }
    }
    console.log(`Seeded ${HOSTELS.length} hostels with their rooms and beds (all available).`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Hostel Officer';
  if (!adminEmail || !adminPassword) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running the production seed.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {}, // never overwrite an existing admin's password on rerun
    create: { email: adminEmail.toLowerCase(), name: adminName, passwordHash },
  });
  console.log(`Admin ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
