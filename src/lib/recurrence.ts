import { prisma } from "@/lib/prisma";
import { RecurrenceEventFormData } from "@/lib/validations";
import { RecurrenceFrequency } from "@prisma/client";

// All date arithmetic must be done in local Prague time so that the wall-clock
// time of recurring events (e.g. 18:00) stays the same even across DST changes.
// Vercel runs in UTC, so raw Date.setDate / setMonth would shift events by ±1 h.
const VENUE_TZ = "Europe/Prague";

type LocalParts = { y: number; mo: number; d: number; h: number; mi: number; s: number };

function getLocalParts(date: Date): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENUE_TZ,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const h = get("hour");
  return { y: get("year"), mo: get("month") - 1, d: get("day"), h: h === 24 ? 0 : h, mi: get("minute"), s: get("second") };
}

// Convert local date/time components back to a UTC Date.
// Estimates the UTC offset by comparing a trial UTC timestamp to its local representation.
function localPartsToUtc({ y, mo, d, h, mi, s }: LocalParts): Date {
  const trial = new Date(Date.UTC(y, mo, d, h, mi, s));
  const loc = getLocalParts(trial);
  const locAsUtc = new Date(Date.UTC(loc.y, loc.mo, loc.d, loc.h, loc.mi, loc.s));
  const offset = trial.getTime() - locAsUtc.getTime();
  return new Date(Date.UTC(y, mo, d, h, mi, s) + offset);
}

function addDays(date: Date, days: number): Date {
  const p = getLocalParts(date);
  // Advance only the day component so wall-clock time is unchanged.
  const shifted = new Date(Date.UTC(p.y, p.mo, p.d + days));
  return localPartsToUtc({ ...p, y: shifted.getUTCFullYear(), mo: shifted.getUTCMonth(), d: shifted.getUTCDate() });
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const p = getLocalParts(date);
  const shifted = new Date(Date.UTC(p.y, p.mo + months, p.d));
  return localPartsToUtc({ ...p, y: shifted.getUTCFullYear(), mo: shifted.getUTCMonth(), d: shifted.getUTCDate() });
}

function isSameDay(a: Date, b: Date): boolean {
  const pa = getLocalParts(a);
  const pb = getLocalParts(b);
  return pa.y === pb.y && pa.mo === pb.mo && pa.d === pb.d;
}

export async function generateRecurringEvents(
  data: RecurrenceEventFormData,
  userId: string
): Promise<number> {
  const { recurrence, ...eventBase } = data;

  const startDt = new Date(eventBase.startDatetime);
  const endDt = new Date(eventBase.endDatetime);
  const duration = endDt.getTime() - startDt.getTime();

  const exceptions = recurrence.exceptions.map((e) => new Date(e));
  const untilDate = recurrence.untilDate ? new Date(recurrence.untilDate) : null;

  // Create the recurrence rule record
  const rule = await prisma.recurrenceRule.create({
    data: {
      frequency: recurrence.frequency as RecurrenceFrequency,
      interval: recurrence.interval,
      daysOfWeek: recurrence.daysOfWeek,
      untilDate: untilDate,
      occurrenceCount: recurrence.occurrenceCount ?? null,
      exceptions: exceptions,
    },
  });

  // Generate occurrence dates
  const occurrenceDates: Date[] = [];
  let current = new Date(startDt);
  let count = 0;
  const maxOccurrences = recurrence.occurrenceCount ?? 365; // safety limit

  while (count < maxOccurrences) {
    if (untilDate && current > untilDate) break;

    const isException = exceptions.some((ex) => isSameDay(ex, current));
    if (!isException) {
      if (recurrence.frequency === "WEEKLY" || recurrence.frequency === "BIWEEKLY") {
        // Check day of week matches
        const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon...
        if (recurrence.daysOfWeek.length === 0 || recurrence.daysOfWeek.includes(dayOfWeek)) {
          occurrenceDates.push(new Date(current));
          count++;
        }
      } else {
        occurrenceDates.push(new Date(current));
        count++;
      }
    }

    // Advance to next occurrence
    switch (recurrence.frequency) {
      case "DAILY":
        current = addDays(current, recurrence.interval);
        break;
      case "WEEKLY":
        current = addWeeks(current, recurrence.interval);
        break;
      case "BIWEEKLY":
        current = addWeeks(current, 2 * recurrence.interval);
        break;
      case "MONTHLY":
        current = addMonths(current, recurrence.interval);
        break;
    }
  }

  // Check for conflicts: single range query covering the whole series, then filter in memory.
  // This avoids an OR clause with one condition per occurrence (up to 365 clauses).
  const seriesStart = occurrenceDates[0];
  const seriesEnd = new Date(occurrenceDates[occurrenceDates.length - 1].getTime() + duration);

  const candidateConflicts = await prisma.event.findMany({
    where: {
      venueId: eventBase.venueId,
      status: { not: "CANCELLED" },
      startDatetime: { lt: seriesEnd },
      endDatetime: { gt: seriesStart },
    },
    select: { startDatetime: true, endDatetime: true, title: true },
  });

  const conflictsCheck = candidateConflicts.filter((existing) =>
    occurrenceDates.some(
      (date) =>
        existing.startDatetime < new Date(date.getTime() + duration) &&
        existing.endDatetime > date
    )
  );

  if (conflictsCheck.length > 0) {
    await prisma.recurrenceRule.delete({ where: { id: rule.id } });
    throw new Error(
      `Nalezeny kolize s ${conflictsCheck.length} existujícími termíny. Série nebyla vytvořena.`
    );
  }

  // Create all events in a single bulk insert
  const { count: createdCount } = await prisma.event.createMany({
    data: occurrenceDates.map((date, index) => ({
      venueId: eventBase.venueId,
      categoryId: eventBase.categoryId,
      title: eventBase.title,
      description: eventBase.description ?? null,
      startDatetime: date,
      endDatetime: new Date(date.getTime() + duration),
      status: eventBase.status,
      recurrenceRuleId: rule.id,
      recurrenceIndex: index,
      createdBy: userId,
    })),
  });

  return createdCount;
}
