import { TimelineEvent } from "../../types";
import { toOrdinal } from "../../date/timeline-date";

export const AXIS_PADDING_PX = 48;
export const MIN_TRACK_WIDTH_PX = 600;
export const MAX_TRACK_WIDTH_PX = 20000;
// Minimum pixel width reserved for the gap between two consecutive distinct
// event dates, so labels/points don't crowd each other regardless of how
// many calendar years separate them.
const MIN_GAP_PER_EVENT_PX = 90;
// A gap between two events never claims more than this many pixels no
// matter how many empty calendar years it spans — a 20-year empty stretch
// and a 5000-year empty stretch both just read as "a big gap," so neither
// needs to balloon the track width proportionally to its raw duration.
const MAX_GAP_PX = 180;
// Below this many years, a gap scales proportionally between the min and
// max above; beyond it, further duration no longer grows the gap's pixels.
// A gap is considered "compressed" (see Scale.compressedGaps) once it
// reaches this saturation point.
const GAP_SATURATION_YEARS = 20;

// Non-linear scale: pixel position is piecewise-linear across breakpoints
// placed at every distinct event ordinal (plus the overall min/max), where
// each segment gets at least MIN_GAP_PER_EVENT_PX regardless of its
// calendar duration, and grows toward MAX_GAP_PX as the gap widens, capping
// out for anything beyond GAP_SATURATION_YEARS. This is what lets sparse,
// widely-separated events stay compact while dense clusters still get room.
export interface Scale {
	minOrdinal: number;
	maxOrdinal: number;
	trackWidth: number;
	breakpoints: number[]; // sorted ordinals
	positions: number[]; // pixel offset (0..trackWidth) for each breakpoint
	/** Ordinal of the midpoint of each gap that hit GAP_SATURATION_YEARS, for a visual break marker. */
	compressedGaps: number[];
}

export function buildScale(events: TimelineEvent[]): Scale {
	const ordinals = events.flatMap((e) => (e.endDate ? [toOrdinal(e.date), toOrdinal(e.endDate)] : [toOrdinal(e.date)]));
	const minOrdinal = Math.min(...ordinals);
	const maxOrdinal = Math.max(...ordinals);

	const breakpoints = Array.from(new Set([minOrdinal, maxOrdinal, ...ordinals])).sort((a, b) => a - b);

	const positions: number[] = [0];
	const compressedGaps: number[] = [];
	for (let i = 1; i < breakpoints.length; i++) {
		const gapYears = breakpoints[i] - breakpoints[i - 1];
		const saturation = Math.min(1, gapYears / GAP_SATURATION_YEARS);
		const gapPx = MIN_GAP_PER_EVENT_PX + saturation * (MAX_GAP_PX - MIN_GAP_PER_EVENT_PX);
		positions.push(positions[i - 1] + gapPx);
		if (saturation >= 1) {
			compressedGaps.push((breakpoints[i] + breakpoints[i - 1]) / 2);
		}
	}

	const rawWidth = positions[positions.length - 1] ?? 0;
	const trackWidth = Math.min(MAX_TRACK_WIDTH_PX, Math.max(MIN_TRACK_WIDTH_PX, rawWidth));

	// Rescale proportionally so the track hits trackWidth exactly (handles
	// both the MIN_TRACK_WIDTH_PX floor and the MAX_TRACK_WIDTH_PX cap).
	const scaleFactor = rawWidth > 0 ? trackWidth / rawWidth : 1;
	const scaledPositions = positions.map((p) => p * scaleFactor);

	return { minOrdinal, maxOrdinal, trackWidth, breakpoints, positions: scaledPositions, compressedGaps };
}

// Maps a calendar ordinal to a pixel offset (against the scale's *base*,
// unzoomed width) via piecewise-linear interpolation over the scale's
// breakpoints — values between two breakpoints (e.g. an axis tick falling
// inside a large empty gap) are interpolated linearly within that segment's
// (compressed) pixel span; values outside [minOrdinal, maxOrdinal]
// extrapolate off the nearest edge.
export function xForPx(ordinal: number, scale: Scale): number {
	const { breakpoints, positions } = scale;

	if (breakpoints.length === 1) {
		return AXIS_PADDING_PX + positions[0];
	}

	if (ordinal <= breakpoints[0]) {
		const span = Math.max(1 / 365, breakpoints[1] - breakpoints[0]);
		const px = Math.max(1, positions[1] - positions[0]);
		return AXIS_PADDING_PX + positions[0] + ((ordinal - breakpoints[0]) / span) * px;
	}
	const last = breakpoints.length - 1;
	if (ordinal >= breakpoints[last]) {
		const span = Math.max(1 / 365, breakpoints[last] - breakpoints[last - 1]);
		const px = Math.max(1, positions[last] - positions[last - 1]);
		return AXIS_PADDING_PX + positions[last] + ((ordinal - breakpoints[last]) / span) * px;
	}

	let hi = 1;
	while (breakpoints[hi] < ordinal) hi++;
	const lo = hi - 1;
	const span = Math.max(1 / 365, breakpoints[hi] - breakpoints[lo]);
	const t = (ordinal - breakpoints[lo]) / span;
	return AXIS_PADDING_PX + positions[lo] + t * (positions[hi] - positions[lo]);
}

// Percentage (0-100) of the track's total width — used for all element
// positioning/sizing so that zooming (which just resizes the track element)
// scales every child's absolute pixel position along with it for free,
// without re-running layout math on every zoom tick.
export function xFor(ordinal: number, scale: Scale): number {
	const totalWidth = scale.trackWidth + AXIS_PADDING_PX * 2;
	return (xForPx(ordinal, scale) / totalWidth) * 100;
}
