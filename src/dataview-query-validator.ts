import { App } from "obsidian";
import { formatDataviewError, getDataviewApi, isDataviewEnabled } from "./sources/dataview-source";

const VALIDATE_DEBOUNCE_MS = 400;

export type DataviewQueryValidationState = "empty" | "pending" | "valid" | "invalid" | "unavailable";

/**
 * Wires a live "is this DQL valid" indicator onto a Dataview query textarea:
 * debounces re-validation as the user types, runs the query read-only via
 * Dataview's own `query()` API (the same entrypoint the real render path
 * uses, so "valid" here means "will actually run"), and reports the result
 * through `onStateChange` for the caller to render (checkmark/error/etc).
 *
 * Call `scheduleValidate()` on every keystroke (debounced internally) and
 * `validateNow()` once up front to check the initial value immediately
 * without waiting out the debounce.
 */
export function attachDataviewQueryValidation(
	app: App,
	getValue: () => string,
	onStateChange: (state: DataviewQueryValidationState, message?: string) => void
): { scheduleValidate: () => void; validateNow: () => void; dispose: () => void } {
	let debounceTimer: number | undefined;
	// Guards against an earlier, slower query's result overwriting a later
	// one's — Dataview's query() is async and unordered, so with fast typing
	// an in-flight validation for a stale value could otherwise resolve after
	// (and clobber) the result for the current value.
	let requestId = 0;

	async function validate(): Promise<void> {
		const value = getValue();
		const thisRequest = ++requestId;

		if (!value.trim()) {
			onStateChange("empty");
			return;
		}

		if (!isDataviewEnabled(app)) {
			onStateChange("unavailable");
			return;
		}

		onStateChange("pending");
		const api = getDataviewApi(app);
		if (!api) {
			onStateChange("unavailable");
			return;
		}

		try {
			const result = await api.query(value);
			if (thisRequest !== requestId) return;
			if (result.successful) {
				onStateChange("valid");
			} else {
				onStateChange("invalid", formatDataviewError(result.error));
			}
		} catch (err) {
			if (thisRequest !== requestId) return;
			onStateChange("invalid", err instanceof Error ? err.message : String(err));
		}
	}

	function scheduleValidate(): void {
		window.clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(() => void validate(), VALIDATE_DEBOUNCE_MS);
	}

	return {
		scheduleValidate,
		validateNow: () => void validate(),
		dispose: () => window.clearTimeout(debounceTimer),
	};
}

/** Renders a validation state into a status element, shared by every caller so the wording/styling stays consistent. */
export function renderDataviewQueryStatus(
	el: HTMLElement,
	state: DataviewQueryValidationState,
	message?: string
): void {
	el.classList.remove("is-valid", "is-invalid", "is-pending", "is-unavailable");
	switch (state) {
		case "empty":
			el.setText("");
			break;
		case "pending":
			el.classList.add("is-pending");
			el.setText("Checking query…");
			break;
		case "valid":
			el.classList.add("is-valid");
			el.setText("✓ query is valid");
			break;
		case "invalid":
			el.classList.add("is-invalid");
			el.setText(message ?? "Query failed");
			break;
		case "unavailable":
			el.classList.add("is-unavailable");
			el.setText("Dataview is not available — can't validate this query.");
			break;
	}
}
