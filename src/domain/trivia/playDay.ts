import { z } from "zod";

export { PLAY_DEDUP_RETENTION_DAYS, PLAY_TIME_ZONE, PlayDay, playDayOf, playDedupCutoff };

/** Plays are deduplicated per calendar day in this time zone (product audience: Brazil). */
const PLAY_TIME_ZONE = "America/Sao_Paulo";

/** Dedup rows are only needed for "today"; one extra day absorbs clock skew around midnight. */
const PLAY_DEDUP_RETENTION_DAYS = 2;

const DAY_MS: number = 24 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) in PLAY_TIME_ZONE. Sorts and compares as text. */
class PlayDay {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z.iso.date({ error: "Dia inválido" }).transform((v): PlayDay => new PlayDay(v));

  equals(other: PlayDay): boolean {
    return this.value === other.value;
  }
}

/** `en-CA` formats dates as ISO `YYYY-MM-DD`; the output is still validated by the schema. */
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: PLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function playDayOf(now: Date): PlayDay {
  const parsed = PlayDay.schema.safeParse(dayFormat.format(now));
  if (!parsed.success) throw new Error(`Intl produced an invalid day for ${now.toISOString()}`);
  return parsed.data;
}

/** Dedup rows of days strictly before this one can be deleted. */
function playDedupCutoff(now: Date): PlayDay {
  return playDayOf(new Date(now.getTime() - (PLAY_DEDUP_RETENTION_DAYS - 1) * DAY_MS));
}
