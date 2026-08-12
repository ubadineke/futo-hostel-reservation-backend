import { Gender, PaymentStatus, PrismaClient, ReservationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123';

type RoomSeed = { name: string; capacity: number; bedsAvailable: number; bedsTotal: number };
type HostelSeed = {
  id: string;
  name: string;
  code: string;
  funder: string;
  gender: Gender;
  price: number;
  roomSize: string;
  lat: number;
  lng: number;
  coverA: bigint;
  coverB: bigint;
  blurb: string;
  rooms: RoomSeed[];
};

// Values reproduced verbatim from BACKEND-README.md §8 / app/lib/core/demo/hostel_data.dart
const HOSTELS: HostelSeed[] = [
  {
    id: 'A', name: 'Hostel A', code: 'A', funder: 'School', gender: Gender.male,
    price: 42000, roomSize: '8–10 per room', lat: 5.3869, lng: 7.0341,
    coverA: 0xff1e3a8an, coverB: 0xff2563ebn,
    blurb: 'A male school block close to the lecture halls. Dense, lively, and the cheapest way to stay on campus.',
    rooms: [
      { name: '8-bed room', capacity: 8, bedsAvailable: 9, bedsTotal: 48 },
      { name: '10-bed room', capacity: 10, bedsAvailable: 3, bedsTotal: 40 },
    ],
  },
  {
    id: 'B', name: 'Hostel B', code: 'B', funder: 'School', gender: Gender.male,
    price: 42000, roomSize: '8–10 per room', lat: 5.3872, lng: 7.0347,
    coverA: 0xff312e81n, coverB: 0xff4f46e5n,
    blurb: 'Male school block beside Hostel A. Filling fast for the session.',
    rooms: [
      { name: '8-bed room', capacity: 8, bedsAvailable: 0, bedsTotal: 48 },
      { name: '10-bed room', capacity: 10, bedsAvailable: 5, bedsTotal: 50 },
    ],
  },
  {
    id: 'C', name: 'Hostel C', code: 'C', funder: 'School', gender: Gender.female,
    price: 45000, roomSize: '6–8 per room', lat: 5.3858, lng: 7.0359,
    coverA: 0xff0f766en, coverB: 0xff0ea5a4n,
    blurb: 'A female block near TETFund. Calmer rooms with a little more space.',
    rooms: [
      { name: '6-bed room', capacity: 6, bedsAvailable: 7, bedsTotal: 36 },
      { name: '8-bed room', capacity: 8, bedsAvailable: 6, bedsTotal: 48 },
    ],
  },
  {
    id: 'D', name: 'Hostel D', code: 'D', funder: 'School', gender: Gender.female,
    price: 45000, roomSize: '6–8 per room', lat: 5.3855, lng: 7.0364,
    coverA: 0xff155e75n, coverB: 0xff0891b2n,
    blurb: 'Female school block. Only a few beds remain this session.',
    rooms: [
      { name: '6-bed room', capacity: 6, bedsAvailable: 2, bedsTotal: 36 },
      { name: '8-bed room', capacity: 8, bedsAvailable: 0, bedsTotal: 32 },
    ],
  },
  {
    id: 'E', name: 'Hostel E', code: 'E', funder: 'School', gender: Gender.male,
    price: 42000, roomSize: '8–10 per room', lat: 5.3877, lng: 7.0338,
    coverA: 0xff1e293bn, coverB: 0xff334155n,
    blurb: 'Male school block on the far side. Fully booked for now — check back later.',
    rooms: [{ name: '8-bed room', capacity: 8, bedsAvailable: 0, bedsTotal: 64 }],
  },
  {
    id: 'TETFUND', name: 'TETFund Hostel', code: 'TF', funder: 'TETFund', gender: Gender.mixed,
    price: 90000, roomSize: '4 per room (en-suite)', lat: 5.3851, lng: 7.0366,
    coverA: 0xff1d4ed8n, coverB: 0xff3b82f6n,
    blurb: 'The newest, most comfortable block — four to a room, en-suite, mixed and floor-segregated.',
    rooms: [{ name: '4-bed room (en-suite)', capacity: 4, bedsAvailable: 8, bedsTotal: 80 }],
  },
  {
    id: 'NDDC', name: 'NDDC Hostel', code: 'ND', funder: 'NDDC', gender: Gender.mixed,
    price: 62500, roomSize: '3–4 per room', lat: 5.3848, lng: 7.0371,
    coverA: 0xff134e4an, coverB: 0xff0d9488n,
    blurb: 'Lower-density, two-storey block housing both genders by floor. Premium comfort for the price.',
    rooms: [
      { name: '4-bed room', capacity: 4, bedsAvailable: 6, bedsTotal: 64 },
      { name: '3-bed room', capacity: 3, bedsAvailable: 4, bedsTotal: 36 },
    ],
  },
  {
    id: 'PG', name: 'PG Hostel', code: 'PG', funder: 'Postgraduate', gender: Gender.postgrad,
    price: 75000, roomSize: '1–2 per room', lat: 5.3845, lng: 7.0331,
    coverA: 0xff4c1d95n, coverB: 0xff6d28d9n,
    blurb: 'Quiet quarters for postgraduate students — one or two to a room for focused study.',
    rooms: [
      { name: '2-bed room', capacity: 2, bedsAvailable: 5, bedsTotal: 40 },
      { name: '1-bed studio', capacity: 1, bedsAvailable: 2, bedsTotal: 12 },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // wipe in FK-safe order so re-running the seed is idempotent
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  await prisma.admin.create({
    data: { email: 'admin@futo.edu.ng', name: 'Hostel Officer', passwordHash },
  });

  const demoStudent = await prisma.student.create({
    data: {
      regNo: '20211274242',
      email: 'nwakanma.dominion.20211274242@futo.edu.ng',
      name: 'Dominion Nwakanma',
      dept: 'Software Engineering',
      level: '400 Level',
      passwordHash,
    },
  });

  // Occupied beds are backfilled with synthetic "filler" students/reservations so
  // GET /hostels reports the exact bedsAvailable figures from BACKEND-README.md §8.
  let fillerCount = 0;
  const fillerStudents: {
    id: string; regNo: string; email: string; name: string; dept: string; level: string; passwordHash: string;
  }[] = [];
  const fillerReservations: {
    id: string; reference: string; rrr: string; studentId: string; hostelId: string; roomId: string;
    roomName: string; bedId: string; bedNumber: number; fee: number; status: ReservationStatus;
  }[] = [];
  const fillerPayments: {
    id: string; rrr: string; reservationId: string; amount: number; status: PaymentStatus;
  }[] = [];

  let pastBookingBedId = '';
  let pastBookingRoomId = '';

  for (const h of HOSTELS) {
    await prisma.hostel.create({
      data: {
        id: h.id, name: h.name, code: h.code, funder: h.funder, gender: h.gender,
        price: h.price, roomSize: h.roomSize, blurb: h.blurb, lat: h.lat, lng: h.lng,
        coverA: h.coverA, coverB: h.coverB,
      },
    });

    for (const r of h.rooms) {
      const roomId = randomUUID();
      await prisma.room.create({
        data: { id: roomId, hostelId: h.id, name: r.name, capacity: r.capacity },
      });

      const bedIds: string[] = [];
      const bedsData = Array.from({ length: r.bedsTotal }, (_, i) => {
        const bedId = randomUUID();
        bedIds.push(bedId);
        return { id: bedId, roomId, number: i + 1 };
      });
      await prisma.bed.createMany({ data: bedsData });

      if (h.id === 'NDDC' && r.name === '4-bed room') {
        pastBookingBedId = bedIds[1]; // bed 2 — used by the seeded past booking below
        pastBookingRoomId = roomId;
      }

      const occupied = r.bedsTotal - r.bedsAvailable;
      for (let i = 0; i < occupied; i++) {
        fillerCount += 1;
        const regNo = String(90000000000 + fillerCount);
        const studentId = randomUUID();
        fillerStudents.push({
          id: studentId,
          regNo,
          email: `filler.student.${regNo}@futo.edu.ng`,
          name: 'Filler Student',
          dept: 'General Studies',
          level: fillerCount % 5 === 0 ? '100 Level' : '200 Level',
          passwordHash,
        });

        const reservationId = randomUUID();
        const reference = `RST-SEED${String(fillerCount).padStart(4, '0')}`;
        const rrr = String(200000000000 + fillerCount);
        fillerReservations.push({
          id: reservationId, reference, rrr, studentId, hostelId: h.id, roomId,
          roomName: r.name, bedId: bedIds[i], bedNumber: i + 1, fee: h.price,
          status: ReservationStatus.paid,
        });
        fillerPayments.push({
          id: randomUUID(), rrr, reservationId, amount: h.price, status: PaymentStatus.paid,
        });
      }
    }
  }

  await prisma.student.createMany({ data: fillerStudents });
  await prisma.reservation.createMany({ data: fillerReservations });
  await prisma.payment.createMany({ data: fillerPayments });

  // One seeded past (cancelled) booking so the demo student's history isn't empty,
  // per BACKEND-README.md §8.
  await prisma.reservation.create({
    data: {
      reference: 'RST-7F3A21',
      rrr: '270054118832',
      studentId: demoStudent.id,
      hostelId: 'NDDC',
      roomId: pastBookingRoomId,
      roomName: '4-bed room',
      bedId: pastBookingBedId,
      bedNumber: 2,
      fee: 62500,
      status: ReservationStatus.cancelled,
      createdAt: new Date('2025-09-14T10:30:00Z'),
    },
  });

  console.log(`Seed complete: 8 hostels, ${fillerCount} filler reservations, 1 demo student, 1 admin.`);
  console.log(`Demo login: regNo=20211274242 (or the school email) / password=${SEED_PASSWORD}`);
  console.log(`Admin login: admin@futo.edu.ng / password=${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
