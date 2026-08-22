import { getDate, getDaysInMonth, isSameMonth, parseISO } from "date-fns";

/**
 * Whether an iOS inline-picker change came from tapping a day -- which should
 * dismiss the sheet -- rather than scrolling the month/year wheel, which
 * should leave it open.
 *
 * The picker reports both through the same callback and exposes no "wheel is
 * open" state, so they can only be told apart by what moved. The wheel always
 * carries the day-of-month across, clamping it to the new month's length: from
 * Aug 31, scrolling to February lands on Feb 28. A tap lands wherever the
 * finger did.
 *
 * The displayed month is not necessarily the selected date's month -- the
 * < > chevrons move the grid without changing the selection -- so a tap can
 * legitimately arrive from a different month than `previous`.
 *
 * One tap is indistinguishable from a wheel move and does not dismiss: after
 * chevron-navigating to another month, tapping the exact day the wheel would
 * have carried over anyway (Aug 22 -> Jul 22). A second tap dismisses, as does
 * the backdrop, and the date is already committed either way.
 */
export function isDayTap(previous: string, selected: Date): boolean {
  const prev = parseISO(previous);
  if (isSameMonth(selected, prev)) return true;
  const carriedByWheel = Math.min(getDate(prev), getDaysInMonth(selected));
  return getDate(selected) !== carriedByWheel;
}
