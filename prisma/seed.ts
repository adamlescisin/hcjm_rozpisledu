import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed venue
  const venue = await prisma.venue.upsert({
    where: { id: "venue-zs-melnik" },
    update: {},
    create: {
      id: "venue-zs-melnik",
      name: "ZS Mělník",
      address: "Sportovní 1, 276 01 Mělník",
      timezone: "Europe/Prague",
    },
  });
  console.log("Venue:", venue.name);

  // Seed categories
  const categories = [
    {
      id: "cat-trening-hokej",
      name: "Trénink hokej",
      color: "#EAB308",
      defaultDurationMinutes: 60,
      requiresIceResurfacingBefore: false,
      requiresIceResurfacingAfter: true,
      resurfacingDurationMinutes: 15,
      sortOrder: 1,
    },
    {
      id: "cat-zapas-hokej",
      name: "Zápas hokej",
      color: "#C8102E",
      defaultDurationMinutes: 75,
      requiresIceResurfacingBefore: true,
      requiresIceResurfacingAfter: true,
      resurfacingDurationMinutes: 15,
      sortOrder: 2,
    },
    {
      id: "cat-trening-kraso",
      name: "Trénink krasobruslení",
      color: "#3B82F6",
      defaultDurationMinutes: 60,
      requiresIceResurfacingBefore: false,
      requiresIceResurfacingAfter: false,
      resurfacingDurationMinutes: 15,
      sortOrder: 3,
    },
    {
      id: "cat-verejna",
      name: "Veřejné bruslení",
      color: "#22C55E",
      defaultDurationMinutes: 90,
      requiresIceResurfacingBefore: true,
      requiresIceResurfacingAfter: false,
      resurfacingDurationMinutes: 15,
      sortOrder: 4,
    },
    {
      id: "cat-uprava-ledu",
      name: "Úprava ledu",
      color: "#6B7280",
      defaultDurationMinutes: 15,
      requiresIceResurfacingBefore: false,
      requiresIceResurfacingAfter: false,
      resurfacingDurationMinutes: 15,
      sortOrder: 5,
    },
  ];

  for (const cat of categories) {
    await prisma.eventCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        defaultDurationMinutes: cat.defaultDurationMinutes,
        requiresIceResurfacingBefore: cat.requiresIceResurfacingBefore,
        requiresIceResurfacingAfter: cat.requiresIceResurfacingAfter,
        resurfacingDurationMinutes: cat.resurfacingDurationMinutes,
        sortOrder: cat.sortOrder,
      },
    });
    console.log("Category:", cat.name);
  }

  // Seed default theme
  const existingTheme = await prisma.themeSettings.findFirst();
  if (!existingTheme) {
    await prisma.themeSettings.create({
      data: {
        primaryColor: "#003d80",
        secondaryColor: "#c8102e",
        accentColor: "#f5a623",
        fontHeading: "Inter",
        fontBody: "Inter",
      },
    });
  }
  console.log("Theme settings seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
