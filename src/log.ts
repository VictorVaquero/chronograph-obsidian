// Shared logger for the whole plugin. Source/parsing modules (table-source,
// dataview-source, event-creation, ...) take `App`, not the plugin instance,
// so the current level lives here as module state set once from main.ts's
// loadSettings()/saveSettings(), rather than threaded through every call.
//
// ESLint (obsidianmd/rule-custom-message) only allows console.warn/error/debug
// — console.log and console.info are rule violations — so "info" is
// implemented via console.debug, one step below "debug" which also uses
// console.debug but is gated by a stricter level check.

export type TimelineLogLevel = "off" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<TimelineLogLevel, number> = {
	off: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
};

let currentLevel: TimelineLogLevel = "warn";

export function setLogLevel(level: TimelineLogLevel): void {
	currentLevel = level;
}

function enabled(level: TimelineLogLevel): boolean {
	return LEVEL_ORDER[currentLevel] >= LEVEL_ORDER[level];
}

const PREFIX = "[Chronograph]";

export const log = {
	error(message: string, ...context: unknown[]): void {
		if (!enabled("error")) return;
		console.error(PREFIX, message, ...context);
	},
	warn(message: string, ...context: unknown[]): void {
		if (!enabled("warn")) return;
		console.warn(PREFIX, message, ...context);
	},
	info(message: string, ...context: unknown[]): void {
		if (!enabled("info")) return;
		console.debug(PREFIX, message, ...context);
	},
	debug(message: string, ...context: unknown[]): void {
		if (!enabled("debug")) return;
		console.debug(PREFIX, message, ...context);
	},
};
