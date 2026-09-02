import { prisma } from "@/lib/prisma";
import ScheduleView from "@/components/schedule/ScheduleView";
import IframeResizer from "@/components/IframeResizer";

export const dynamic = "force-dynamic";

async function getInitialData() {
  const [categories, theme] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.themeSettings.findFirst(),
  ]);

  return { categories, theme };
}

export default async function HomePage() {
  const { categories, theme } = await getInitialData();

  return (
    <>
      <IframeResizer />
      <main className="min-h-screen" style={theme ? {
        ["--color-primary" as string]: theme.primaryColor,
        ["--color-secondary" as string]: theme.secondaryColor,
        ["--color-accent" as string]: theme.accentColor,
      } : {}}>
        <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-3">
          {theme?.logoUrl && (
            <img src={theme.logoUrl} alt="HC Junior Mělník" className="h-10 w-auto" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">Rozpis ledu</h1>
            <p className="text-sm opacity-80">HC Junior Mělník — ZS Mělník</p>
          </div>
        </header>
        <ScheduleView categories={categories} scheduleWeeksAhead={theme?.scheduleWeeksAhead ?? 4} />
      </main>
    </>
  );
}
