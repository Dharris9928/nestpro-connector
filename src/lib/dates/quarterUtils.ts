/**
 * Utility functions for quarterly date filtering.
 * Provides current quarter + previous quarter selections.
 */

export interface QuarterOption {
  label: string;
  value: string;
  from: Date;
  to: Date;
}

function getQuarterDates(year: number, quarter: number): { from: Date; to: Date } {
  const startMonth = (quarter - 1) * 3;
  return {
    from: new Date(year, startMonth, 1),
    to: new Date(year, startMonth + 3, 0, 23, 59, 59, 999), // last day of quarter
  };
}

export function getQuarterOptions(): QuarterOption[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;

  const current = getQuarterDates(currentYear, currentQuarter);
  const previous = getQuarterDates(prevYear, prevQuarter);

  return [
    {
      label: `Q${currentQuarter} ${currentYear}`,
      value: `Q${currentQuarter}_${currentYear}`,
      ...current,
    },
    {
      label: `Q${prevQuarter} ${prevYear}`,
      value: `Q${prevQuarter}_${prevYear}`,
      ...previous,
    },
  ];
}
