import { prisma } from "@/lib/prisma";
import { RecurrenceEventFormData } from "@/lib/validations";
import { RecurrenceFrequency } from "@prisma/client";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
