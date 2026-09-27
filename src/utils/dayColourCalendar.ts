import { dayHex } from '../theme/scanner';
import type { GalleryItem, StoredYoloDetection } from '../types';

/** Matches Kotlin LABELS / classId order (source of truth). */
export type WeekdayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type DayColourName =
  | 'Black'
  | 'Blue'
  | 'Brown'
  | 'Green'
  | 'Orange'
  | 'Red'
  | 'Yellow';

export type ExpiryUrgency = 'expired' | 'today' | 'tomorrow' | 'this-week';

export type DayColourClass = {
  classId: number;
  colour: DayColourName;
  weekday: WeekdayName;
  /** JS `Date.getDay()`: 0=Sun … 6=Sat */
  weekdayIndex: number;
  hex: string;
  shortDay: string;
  label: string;
};

export const DAY_COLOUR_CLASSES: readonly DayColourClass[] = [
  {
    classId: 0,
    colour: 'Black',
    weekday: 'Sunday',
    weekdayIndex: 0,
    hex: dayHex.Sunday,
    shortDay: 'Sun',
    label: 'Black : Sunday',
  },
  {
    classId: 1,
    colour: 'Blue',
    weekday: 'Monday',
    weekdayIndex: 1,
    hex: dayHex.Monday,
    shortDay: 'Mon',
    label: 'Blue : Monday',
  },
  {
    classId: 2,
    colour: 'Brown',
    weekday: 'Thursday',
    weekdayIndex: 4,
    hex: dayHex.Thursday,
    shortDay: 'Thu',
    label: 'Brown : Thursday',
  },
  {
    classId: 3,
    colour: 'Green',
    weekday: 'Friday',
    weekdayIndex: 5,
    hex: dayHex.Friday,
    shortDay: 'Fri',
    label: 'Green : Friday',
  },
  {
    classId: 4,
    colour: 'Orange',
    weekday: 'Saturday',
    weekdayIndex: 6,
    hex: dayHex.Saturday,
    shortDay: 'Sat',
    label: 'Orange : Saturday',
  },
  {
    classId: 5,
    colour: 'Red',
    weekday: 'Wednesday',
    weekdayIndex: 3,
    hex: dayHex.Wednesday,
    shortDay: 'Wed',
    label: 'Red : Wednesday',
  },
  {
    classId: 6,
    colour: 'Yellow',
    weekday: 'Tuesday',
    weekdayIndex: 2,
    hex: dayHex.Tuesday,
    shortDay: 'Tue',
    label: 'Yellow : Tuesday',
  },
] as const;

const BY_CLASS_ID = new Map(DAY_COLOUR_CLASSES.map((c) => [c.classId, c]));
const BY_WEEKDAY_INDEX = new Map(DAY_COLOUR_CLASSES.map((c) => [c.weekdayIndex, c]));

export function getClassMeta(classId: number): DayColourClass | undefined {
  return BY_CLASS_ID.get(classId);
}

export function getClassMetaForWeekday(weekdayIndex: number): DayColourClass | undefined {
  return BY_WEEKDAY_INDEX.get(weekdayIndex);
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Current HACCP week: Sunday 00:00 → Saturday 23:59:59.999 (local). */
export function startOfWeekSunday(d: Date = new Date()): Date {
  const day = startOfLocalDay(d);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

export function endOfWeekSaturday(d: Date = new Date()): Date {
  const start = startOfWeekSunday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export type WeekDayCell = {
  date: Date;
  weekdayIndex: number;
  weekday: WeekdayName;
  colour: DayColourName;
  classId: number;
  hex: string;
  shortDay: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
};

/** Seven cells for the Sun–Sat week containing `from`. */
export function getWeekStrip(from: Date = new Date()): WeekDayCell[] {
  const today = startOfLocalDay(from);
  const sunday = startOfWeekSunday(from);
  const cells: WeekDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const meta = getClassMetaForWeekday(i)!;
    const dayStart = startOfLocalDay(date);
    const isToday = dayStart.getTime() === today.getTime();
    cells.push({
      date: dayStart,
      weekdayIndex: i,
      weekday: meta.weekday,
      colour: meta.colour,
      classId: meta.classId,
      hex: meta.hex,
      shortDay: meta.shortDay,
      isToday,
      isPast: dayStart.getTime() < today.getTime(),
      isFuture: dayStart.getTime() > today.getTime(),
    });
  }
  return cells;
}

export type TodayRotation = {
  date: Date;
  weekday: WeekdayName;
  colour: DayColourName;
  classId: number;
  hex: string;
  shortDay: string;
  label: string;
  pillText: string;
  greeting: string;
  weekLabel: string;
};

export function getTodayRotation(from: Date = new Date()): TodayRotation {
  const meta = getClassMetaForWeekday(from.getDay())!;
  const hour = from.getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const weekStart = startOfWeekSunday(from);
  const weekEnd = endOfWeekSaturday(from);
  const weekLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;
  return {
    date: startOfLocalDay(from),
    weekday: meta.weekday,
    colour: meta.colour,
    classId: meta.classId,
    hex: meta.hex,
    shortDay: meta.shortDay,
    label: meta.label,
    pillText: `${meta.weekday} · ${meta.colour}`,
    greeting,
    weekLabel,
  };
}

/** Days from `from` until this week's occurrence of `weekdayIndex` (negative if past). */
export function daysUntilWeekdayInWeek(from: Date, weekdayIndex: number): number {
  const todayIdx = from.getDay();
  return weekdayIndex - todayIdx;
}

export type ExpiryInfo = {
  meta: DayColourClass;
  /** Calendar date in the current Sun–Sat week when this colour is due. */
  dueDate: Date;
  daysUntil: number;
  urgency: ExpiryUrgency;
  expiresLabel: string;
  deliveryLabel: string;
};

export function expiryForClassId(classId: number, from: Date = new Date()): ExpiryInfo | null {
  const meta = getClassMeta(classId);
  if (!meta) return null;
  const sunday = startOfWeekSunday(from);
  const dueDate = new Date(sunday);
  dueDate.setDate(sunday.getDate() + meta.weekdayIndex);
  const daysUntil = daysUntilWeekdayInWeek(from, meta.weekdayIndex);

  let urgency: ExpiryUrgency;
  if (daysUntil < 0) urgency = 'expired';
  else if (daysUntil === 0) urgency = 'today';
  else if (daysUntil === 1) urgency = 'tomorrow';
  else urgency = 'this-week';

  const expiresLabel =
    urgency === 'expired'
      ? `Expired ${meta.shortDay} ${fmtShort(dueDate)}`
      : urgency === 'today'
        ? 'Expires today'
        : urgency === 'tomorrow'
          ? 'Expires tomorrow'
          : `Expires ${meta.shortDay} ${fmtShort(dueDate)}`;

  const deliveryLabel = `Delivery / use-by · ${meta.weekday} (${meta.colour})`;

  return { meta, dueDate, daysUntil, urgency, expiresLabel, deliveryLabel };
}

export type ColourStockItem = {
  id: string;
  classId: number;
  colour: DayColourName;
  weekday: WeekdayName;
  hex: string;
  shortDay: string;
  name: string;
  batchCode: string;
  units: number;
  avgConfidence: number;
  urgency: ExpiryUrgency;
  isAtRisk: boolean;
  useSoon: boolean;
  useBy: string;
  deliveryLabel: string;
  value: string;
  action: 'use-first' | 'allocate' | 'optimal' | 'details';
  lastSeenAt: number;
  scanCount: number;
};

export type LatestScanSummary = {
  id: string;
  createdAt: number;
  expectedCount: number;
  detected: number;
  verified: number;
  review: number;
  accuracy: number;
  timeLabel: string;
  rackLabel: string;
  yoloDetections: StoredYoloDetection[];
};

export type OpsSnapshot = {
  today: TodayRotation;
  week: WeekDayCell[];
  stock: ColourStockItem[];
  atRisk: ColourStockItem[];
  useFirst: ColourStockItem[];
  totalUnits: number;
  atRiskUnits: number;
  latestScan: LatestScanSummary | null;
};

function fmtShort(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const VERIFY = 0.85;

/**
 * Roll up YOLO detections from gallery items in the current Sun–Sat week
 * into colour-day stock rows (one row per classId with counts).
 */
export function buildOpsSnapshot(
  gallery: GalleryItem[],
  from: Date = new Date(),
  verifyThreshold = VERIFY,
): OpsSnapshot {
  const today = getTodayRotation(from);
  const week = getWeekStrip(from);
  const weekStart = startOfWeekSunday(from).getTime();
  const weekEnd = endOfWeekSaturday(from).getTime();

  const weekItems = gallery.filter(
    (g) => g.createdAt >= weekStart && g.createdAt <= weekEnd,
  );

  type Acc = {
    classId: number;
    count: number;
    confSum: number;
    lastSeenAt: number;
    scanIds: Set<string>;
  };
  const byClass = new Map<number, Acc>();

  for (const item of weekItems) {
    const dets = item.yoloDetections ?? [];
    for (const d of dets) {
      if (d.classId < 0 || d.classId > 6) continue;
      const prev = byClass.get(d.classId);
      if (prev) {
        prev.count += 1;
        prev.confSum += d.confidence;
        prev.lastSeenAt = Math.max(prev.lastSeenAt, item.createdAt);
        prev.scanIds.add(item.id);
      } else {
        byClass.set(d.classId, {
          classId: d.classId,
          count: 1,
          confSum: d.confidence,
          lastSeenAt: item.createdAt,
          scanIds: new Set([item.id]),
        });
      }
    }
  }

  const stock: ColourStockItem[] = [];
  for (const acc of byClass.values()) {
    const expiry = expiryForClassId(acc.classId, from);
    if (!expiry) continue;
    const { meta, urgency, expiresLabel, deliveryLabel } = expiry;
    const avgConfidence = acc.confSum / acc.count;
    const isAtRisk = urgency === 'expired' || urgency === 'today';
    const useSoon = urgency === 'tomorrow';
    const action: ColourStockItem['action'] = isAtRisk
      ? 'use-first'
      : useSoon
        ? 'allocate'
        : 'optimal';

    stock.push({
      id: `colour-${meta.classId}`,
      classId: meta.classId,
      colour: meta.colour,
      weekday: meta.weekday,
      hex: meta.hex,
      shortDay: meta.shortDay,
      name: `${meta.colour} day-dot`,
      batchCode: meta.label,
      units: acc.count,
      avgConfidence,
      urgency,
      isAtRisk,
      useSoon,
      useBy: expiresLabel,
      deliveryLabel,
      value: `${acc.count} label${acc.count === 1 ? '' : 's'} · ${meta.weekday}`,
      action,
      lastSeenAt: acc.lastSeenAt,
      scanCount: acc.scanIds.size,
    });
  }

  stock.sort((a, b) => {
    const order = { expired: 0, today: 1, tomorrow: 2, 'this-week': 3 } as const;
    return order[a.urgency] - order[b.urgency] || b.units - a.units;
  });

  const atRisk = stock.filter((s) => s.isAtRisk);
  const useFirst = stock.filter(
    (s) => s.urgency === 'expired' || s.urgency === 'today' || s.urgency === 'tomorrow',
  );
  const totalUnits = stock.reduce((n, s) => n + s.units, 0);
  const atRiskUnits = atRisk.reduce((n, s) => n + s.units, 0);

  const latest = gallery[0] ?? null;
  let latestScan: LatestScanSummary | null = null;
  if (latest) {
    const yolo = latest.yoloDetections ?? [];
    const detected = yolo.length > 0 ? yolo.length : latest.detections.length;
    const verified =
      yolo.length > 0
        ? yolo.filter((d) => d.confidence >= verifyThreshold).length
        : latest.detections.filter((d) => d.confidence >= verifyThreshold).length;
    const review = Math.max(0, detected - verified);
    const accuracy = detected > 0 ? Math.round((verified / detected) * 100) : 0;
    latestScan = {
      id: latest.id,
      createdAt: latest.createdAt,
      expectedCount: latest.expectedCount,
      detected,
      verified,
      review,
      accuracy,
      timeLabel: fmtTime(latest.createdAt),
      rackLabel: `Scan · ${fmtShort(new Date(latest.createdAt))}`,
      yoloDetections: yolo,
    };
  }

  return {
    today,
    week,
    stock,
    atRisk,
    useFirst,
    totalUnits,
    atRiskUnits,
    latestScan,
  };
}

export function shortDayColourLabel(label: string): string {
  const parts = label.split(':').map((s) => s.trim());
  if (parts.length < 2) return label;
  return `${parts[0]} (${parts[1].slice(0, 3)})`;
}
