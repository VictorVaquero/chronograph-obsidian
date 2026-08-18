import "./obsidian-dom-polyfill";
import { renderTimeline, renderEmptyState, renderErrorState } from "../render/timeline-renderer";
import { mockEvents, ancientMockEvents, randomizedMockEvents } from "./mock-events";
import { parseMockTable, MockTableParseError } from "./mock-table-parser";
import { MOCK_QUERIES, DEFAULT_MOCK_QUERY, resolveMockQuery } from "./mock-dataview";
import { queryMockFrontmatter, MOCK_VAULT } from "./mock-frontmatter";
import { createDefaultView } from "../settings";
import {
	TimelineEvent,
	TimelineLayout,
	TimelineDatePrecision,
	TimelineCardSide,
	TimelineLineStyle,
	TimelineFieldMapping,
	TimelineSourceType,
	TimelineAdvancedFeatures,
	TimelineDensity,
	TimelineCardRadius,
	TimelineMarkerSize,
	TimelineSpineThickness,
	TimelineShadowIntensity,
} from "../types";

// Entry point for the standalone browser preview (see src/dev/preview.html).
// Bundled and served without any Obsidian runtime, so the timeline renderer
// -- and, as of this file, a rough mock of the settings tab and the three
// event sources -- can be iterated on visually via `pnpm run dev:preview`.
// It deliberately reimplements small pure slices of settings-tab.ts and
// src/sources/*.ts rather than importing them: those files import types
// (App, TFile, PluginSettingTab) from the "obsidian" package, which ships no
// runtime JS for the browser bundle to resolve.

const container = document.getElementById("app");
if (!container) throw new Error("Missing #app container in preview.html");

const log = document.getElementById("log");
function logClick(event: TimelineEvent): void {
	if (!log) return;
	log.textContent = `Clicked: ${event.title} (${event.sourcePath})`;
}
function logHover(event: TimelineEvent): void {
	if (!log) return;
	log.textContent = `Hovered: ${event.title} (${event.sourcePath})`;
}

// ---- Mirrors one TimelineViewConfig + the global "advanced" toggles ----

const advanced: TimelineAdvancedFeatures = {
	extraFields: false,
	layoutAndStyle: false,
	sortAndGranularity: false,
	multiView: false,
	styleOverrides: false,
};

// Reuses the real createDefaultView() so the harness's starting field
// mapping (dateField: "date", endDateField: "enddate", etc.) always matches
// what a freshly added view actually defaults to.
const defaults = createDefaultView();
const view = {
	sourceType: "table" as TimelineSourceType,
	dataviewQuery: DEFAULT_MOCK_QUERY,
	frontmatterTag: "event",
	frontmatterFolder: "",
	fields: defaults.fields,
	sortOrder: defaults.sortOrder,
	layout: defaults.layout,
	datePrecision: defaults.datePrecision,
	verticalCardSide: defaults.verticalCardSide,
	verticalLineStyle: defaults.verticalLineStyle,
	density: defaults.density,
	cardRadius: defaults.cardRadius,
	markerSize: defaults.markerSize,
	spineThickness: defaults.spineThickness,
	shadowIntensity: defaults.shadowIntensity,
};

const DEFAULT_TABLE_NOTE = `# Timeline events

| date | title | group | enddate | kind |
| --- | --- | --- | --- | --- |
| 2026-01-05 | Kickoff meeting | Meetings | | |
| 2026-01-08 | Literature review | Research | 2026-01-15 | |
| 2026-01-20 | Draft outline | Writing | | |
| 2026-02-10 | Public launch | Meetings | | marker |
`;

let manualEvents: TimelineEvent[] | null = null; // set by the sample/random/ancient buttons; cleared once a source tab is edited
let currentEvents: TimelineEvent[] = mockEvents;

function render(): void {
	renderTimeline(
		container!,
		currentEvents,
		view.layout,
		{ onEventClick: logClick, onEventHover: logHover },
		{
			precision: view.datePrecision,
			verticalCardSide: view.verticalCardSide,
			verticalLineStyle: view.verticalLineStyle,
			styleVars: {
				density: view.density,
				cardRadius: view.cardRadius,
				markerSize: view.markerSize,
				spineThickness: view.spineThickness,
				shadowIntensity: view.shadowIntensity,
			},
		}
	);
}

// ---- Source tabs: Markdown table / Dataview query / Frontmatter scan ----
// Each panel re-derives currentEvents live from its own input, exactly like
// editing a real note (table), typing a query (Dataview), or changing the
// tag/folder filters (frontmatter) would in the actual plugin.

const sourceTabButtons = document.querySelectorAll<HTMLButtonElement>(".source-tab-btn");
const sourcePanels = document.querySelectorAll<HTMLElement>(".source-panel");

function setActiveSource(source: TimelineSourceType): void {
	view.sourceType = source;
	sourceTabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.source === source));
	sourcePanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.sourcePanel === source));
}

sourceTabButtons.forEach((btn) => {
	btn.addEventListener("click", () => {
		const source = btn.dataset.source as TimelineSourceType;
		setActiveSource(source);
		if (source === "table") runTableSource();
		else if (source === "dataview") runDataviewSource();
		else if (source === "frontmatter") runFrontmatterSource();
	});
});

// -- Table source --
const tableEditor = document.getElementById("table-editor") as HTMLTextAreaElement | null;
const tableFeedback = document.getElementById("table-feedback");
if (tableEditor) tableEditor.value = DEFAULT_TABLE_NOTE;

function runTableSource(): void {
	if (!tableEditor || !tableFeedback) return;
	manualEvents = null;
	try {
		const events = parseMockTable(tableEditor.value, view.fields);
		currentEvents = events;
		tableFeedback.textContent = `Parsed ${events.length} event${events.length === 1 ? "" : "s"} from the table.`;
		tableFeedback.className = "parse-feedback ok";
		render();
	} catch (err) {
		const message = err instanceof MockTableParseError ? err.message : "Failed to parse table.";
		tableFeedback.textContent = message;
		tableFeedback.className = "parse-feedback error";
		renderErrorState(container!, message);
	}
}
tableEditor?.addEventListener("input", runTableSource);

// -- Dataview source --
const dataviewInput = document.getElementById("dataview-query") as HTMLInputElement | null;
const dataviewFeedback = document.getElementById("dataview-feedback");
const dataviewPresets = document.getElementById("dataview-presets");
if (dataviewInput) dataviewInput.value = DEFAULT_MOCK_QUERY;

MOCK_QUERIES.forEach((preset) => {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.textContent = preset.query;
	btn.title = preset.description;
	btn.addEventListener("click", () => {
		if (dataviewInput) dataviewInput.value = preset.query;
		runDataviewSource();
	});
	dataviewPresets?.appendChild(btn);
});

function runDataviewSource(): void {
	if (!dataviewInput || !dataviewFeedback) return;
	manualEvents = null;
	const match = resolveMockQuery(dataviewInput.value);
	if (!match) {
		const message = `Dataview query failed: unrecognized query. Try one of the presets below.`;
		dataviewFeedback.textContent = message;
		dataviewFeedback.className = "parse-feedback error";
		renderErrorState(container!, message);
		return;
	}
	currentEvents = match.events;
	dataviewFeedback.textContent = `${match.description} — ${match.events.length} event${match.events.length === 1 ? "" : "s"}.`;
	dataviewFeedback.className = "parse-feedback ok";
	render();
}
dataviewInput?.addEventListener("input", runDataviewSource);

// -- Frontmatter source --
const frontmatterTagInput = document.getElementById("frontmatter-tag") as HTMLInputElement | null;
const frontmatterFolderInput = document.getElementById("frontmatter-folder") as HTMLInputElement | null;
const frontmatterFeedback = document.getElementById("frontmatter-feedback");
const mockVaultList = document.getElementById("mock-vault-list");

if (frontmatterTagInput) frontmatterTagInput.value = view.frontmatterTag;
if (frontmatterFolderInput) frontmatterFolderInput.value = view.frontmatterFolder;

function renderMockVaultList(matchedPaths: Set<string>): void {
	if (!mockVaultList) return;
	mockVaultList.innerHTML = "";
	MOCK_VAULT.forEach((note) => {
		const row = document.createElement("div");
		row.className = "vault-note" + (matchedPaths.has(note.path) ? " matched" : "");
		row.textContent = `${note.path}  ${note.tags.join(" ")}`;
		mockVaultList.appendChild(row);
	});
}

function runFrontmatterSource(): void {
	if (!frontmatterTagInput || !frontmatterFolderInput || !frontmatterFeedback) return;
	manualEvents = null;
	view.frontmatterTag = frontmatterTagInput.value;
	view.frontmatterFolder = frontmatterFolderInput.value;
	const events = queryMockFrontmatter(view.frontmatterTag, view.frontmatterFolder, view.fields);
	renderMockVaultList(new Set(events.map((e) => e.sourcePath)));
	currentEvents = events;
	frontmatterFeedback.textContent = `Matched ${events.length} note${events.length === 1 ? "" : "s"} in the mock vault.`;
	frontmatterFeedback.className = "parse-feedback ok";
	render();
}
frontmatterTagInput?.addEventListener("input", runFrontmatterSource);
frontmatterFolderInput?.addEventListener("input", runFrontmatterSource);

// ---- Settings modal: mirrors settings-tab.ts's advanced toggles + the
// field-mapping/layout/sort controls for the "current view" above ----

const settingsBackdrop = document.getElementById("settings-backdrop");
const settingsBody = document.getElementById("settings-body");
const openSettingsBtn = document.getElementById("open-settings");
const ribbonSettingsBtn = document.getElementById("ribbon-settings");
const closeSettingsBtn = document.getElementById("close-settings");

function openSettings(): void {
	renderSettings();
	settingsBackdrop?.classList.add("open");
}
function closeSettings(): void {
	settingsBackdrop?.classList.remove("open");
}
openSettingsBtn?.addEventListener("click", openSettings);
ribbonSettingsBtn?.addEventListener("click", openSettings);
closeSettingsBtn?.addEventListener("click", closeSettings);
settingsBackdrop?.addEventListener("click", (e) => {
	if (e.target === settingsBackdrop) closeSettings();
});

function settingItem(name: string, desc: string | null, controlEl: HTMLElement): HTMLElement {
	const item = document.createElement("div");
	item.className = "setting-item";
	const info = document.createElement("div");
	info.className = "setting-item-info";
	const nameEl = document.createElement("div");
	nameEl.className = "setting-item-name";
	nameEl.textContent = name;
	info.appendChild(nameEl);
	if (desc) {
		const descEl = document.createElement("div");
		descEl.className = "setting-item-description";
		descEl.textContent = desc;
		info.appendChild(descEl);
	}
	item.appendChild(info);
	const control = document.createElement("div");
	control.className = "setting-item-control";
	control.appendChild(controlEl);
	item.appendChild(control);
	return item;
}

function toggleControl(checked: boolean, onChange: (value: boolean) => void): HTMLElement {
	const label = document.createElement("label");
	label.className = "checkbox-toggle";
	const input = document.createElement("input");
	input.type = "checkbox";
	input.checked = checked;
	input.addEventListener("change", () => onChange(input.checked));
	const slider = document.createElement("span");
	slider.className = "slider";
	label.appendChild(input);
	label.appendChild(slider);
	return label;
}

function textControl(value: string, onChange: (value: string) => void): HTMLElement {
	const input = document.createElement("input");
	input.type = "text";
	input.value = value;
	input.addEventListener("input", () => onChange(input.value));
	return input;
}

function dropdownControl(
	value: string,
	options: [string, string][],
	onChange: (value: string) => void,
	id?: string
): HTMLElement {
	const select = document.createElement("select");
	if (id) select.id = id;
	options.forEach(([optValue, label]) => {
		const opt = document.createElement("option");
		opt.value = optValue;
		opt.textContent = label;
		if (optValue === value) opt.selected = true;
		select.appendChild(opt);
	});
	select.addEventListener("change", () => onChange(select.value));
	return select;
}

function groupHeading(text: string): HTMLElement {
	const h = document.createElement("div");
	h.className = "setting-group-heading";
	h.textContent = text;
	return h;
}

function note(text: string): HTMLElement {
	const n = document.createElement("div");
	n.className = "settings-note";
	n.textContent = text;
	return n;
}

function renderSettings(): void {
	if (!settingsBody) return;
	settingsBody.innerHTML = "";

	settingsBody.appendChild(
		note(
			'Every view already has sensible defaults for the settings below (a "date"/"title"/"group"/"enddate"/... field mapping, vertical layout, oldest-first, day precision). These toggles don\'t turn features on or off — they just show the controls to change a default per view. Leave them off if the defaults work for you.'
		)
	);

	settingsBody.appendChild(groupHeading("Advanced feature groups"));
	settingsBody.appendChild(
		settingItem(
			"Extra field mappings",
			'Show controls to rename the fields used for end date, title, group, color, kind, and points-to (defaults: "enddate", "title", "group", "color", "kind", "pointsto"). Only needed if your notes use different field names.',
			toggleControl(advanced.extraFields, (v) => {
				advanced.extraFields = v;
				renderSettings();
			})
		)
	);
	settingsBody.appendChild(
		settingItem(
			"Layout & style options",
			"Show controls to change a view's layout (default: vertical list) and vertical-layout card side/spine line style. These are per-view settings — most vaults never need more than one layout.",
			toggleControl(advanced.layoutAndStyle, (v) => {
				advanced.layoutAndStyle = v;
				renderSettings();
			})
		)
	);
	settingsBody.appendChild(
		settingItem(
			"Sort & date granularity",
			"Show controls to change a view's sort order (default: oldest first) and date granularity (default: day). Granularity in particular is usually set per view — coarser for a history timeline, exact for a daily journal.",
			toggleControl(advanced.sortAndGranularity, (v) => {
				advanced.sortAndGranularity = v;
				renderSettings();
			})
		)
	);
	settingsBody.appendChild(
		settingItem(
			"Multiple views",
			"Show the control to set which view opens by default. Only useful once you have more than one view.",
			toggleControl(advanced.multiView, (v) => {
				advanced.multiView = v;
				renderSettings();
			})
		)
	);
	settingsBody.appendChild(
		settingItem(
			"Style overrides",
			"Show controls to change a view's density, corner radius, marker size, spine thickness, and shadow intensity.",
			toggleControl(advanced.styleOverrides, (v) => {
				advanced.styleOverrides = v;
				renderSettings();
			})
		)
	);

	settingsBody.appendChild(groupHeading("Timeline view: Preview"));

	settingsBody.appendChild(
		settingItem(
			"Source",
			"Where events come from — matches the tab open below the toolbar.",
			dropdownControl(
				view.sourceType,
				[
					["dataview", "Dataview query"],
					["table", "Markdown table"],
					["frontmatter", "Frontmatter (no Dataview)"],
				],
				(v) => {
					setActiveSource(v as TimelineSourceType);
					if (v === "table") runTableSource();
					else if (v === "dataview") runDataviewSource();
					else runFrontmatterSource();
					renderSettings();
				}
			)
		)
	);

	settingsBody.appendChild(
		settingItem(
			"Date field",
			"Table column header (table source) or frontmatter field (Dataview/frontmatter source) used as the event date.",
			textControl(view.fields.dateField, (v) => {
				view.fields.dateField = v;
				reRunActiveSource();
			})
		)
	);

	if (advanced.extraFields) {
		settingsBody.appendChild(groupHeading("Extra field mappings"));
		type OptionalFieldKey = Exclude<keyof TimelineFieldMapping, "dateField">;
		(
			[
				["endDateField", "End date field"],
				["titleField", "Title field"],
				["groupField", "Group field"],
				["colorField", "Color field"],
				["kindField", "Kind field"],
				["pointsToField", "Points-to field"],
			] as [OptionalFieldKey, string][]
		).forEach(([key, label]) => {
			settingsBody.appendChild(
				settingItem(
					`${label} (optional)`,
					null,
					textControl(view.fields[key] ?? "", (v) => {
						view.fields[key] = v || undefined;
						reRunActiveSource();
					})
				)
			);
		});
	}

	if (advanced.sortAndGranularity) {
		settingsBody.appendChild(groupHeading("Sort & date granularity"));
		settingsBody.appendChild(
			settingItem(
				"Sort order",
				null,
				dropdownControl(
					view.sortOrder,
					[
						["asc", "Oldest first"],
						["desc", "Newest first"],
					],
					(v) => {
						view.sortOrder = v as "asc" | "desc";
						reRunActiveSource();
					}
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Date granularity",
				"How dates are displayed and how the horizontal axis is ticked.",
				dropdownControl(
					view.datePrecision,
					[
						["day", "Day"],
						["month", "Month"],
						["year", "Year"],
						["decade", "Decade"],
						["century", "Century"],
						["millennium", "Millennium"],
					],
					(v) => {
						view.datePrecision = v as TimelineDatePrecision;
						reRunActiveSource();
					}
				)
			)
		);
	}

	if (advanced.layoutAndStyle) {
		settingsBody.appendChild(groupHeading("Layout & style"));
		settingsBody.appendChild(
			settingItem(
				"Layout",
				"Vertical list or a horizontal axis with grouped lanes.",
				dropdownControl(
					view.layout,
					[
						["vertical", "Vertical list"],
						["horizontal", "Horizontal axis"],
					],
					(v) => {
						view.layout = v as TimelineLayout;
						reRunActiveSource();
					},
					"layout-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Vertical card side",
				"Vertical layout only: which side of the spine cards are placed on.",
				dropdownControl(
					view.verticalCardSide,
					[
						["alternate", "Alternate sides"],
						["left", "Left only"],
						["right", "Right only"],
					],
					(v) => {
						view.verticalCardSide = v as TimelineCardSide;
						reRunActiveSource();
					},
					"card-side-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Vertical spine line style",
				"Vertical layout only: visual style of the central spine line.",
				dropdownControl(
					view.verticalLineStyle,
					[
						["solid", "Solid"],
						["dashed", "Dashed"],
						["dotted", "Dotted"],
					],
					(v) => {
						view.verticalLineStyle = v as TimelineLineStyle;
						reRunActiveSource();
					},
					"line-style-select"
				)
			)
		);
	}

	if (advanced.multiView) {
		settingsBody.appendChild(groupHeading("Multiple views"));
		settingsBody.appendChild(
			note("Only one view exists in this preview harness, so \"default view\" has nothing else to pick from.")
		);
	}

	if (advanced.styleOverrides) {
		settingsBody.appendChild(groupHeading("Style overrides"));
		settingsBody.appendChild(
			settingItem(
				"Density",
				"Card padding, node spacing, and lane height.",
				dropdownControl(
					view.density,
					[
						["compact", "Compact"],
						["comfortable", "Comfortable"],
						["spacious", "Spacious"],
					],
					(v) => {
						view.density = v as TimelineDensity;
						render();
					},
					"density-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Card radius",
				"Corner rounding for cards, tooltips, and badges.",
				dropdownControl(
					view.cardRadius,
					[
						["none", "None"],
						["small", "Small"],
						["medium", "Medium"],
						["large", "Large"],
					],
					(v) => {
						view.cardRadius = v as TimelineCardRadius;
						render();
					},
					"card-radius-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Marker size",
				"Diameter of the vertical spine dot and horizontal point marker.",
				dropdownControl(
					view.markerSize,
					[
						["small", "Small"],
						["medium", "Medium"],
						["large", "Large"],
					],
					(v) => {
						view.markerSize = v as TimelineMarkerSize;
						render();
					},
					"marker-size-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Spine thickness",
				"Width of the vertical spine line and horizontal connector.",
				dropdownControl(
					view.spineThickness,
					[
						["thin", "Thin"],
						["medium", "Medium"],
						["thick", "Thick"],
					],
					(v) => {
						view.spineThickness = v as TimelineSpineThickness;
						render();
					},
					"spine-thickness-select"
				)
			)
		);
		settingsBody.appendChild(
			settingItem(
				"Shadow intensity",
				"Elevation shadow on cards and tooltips.",
				dropdownControl(
					view.shadowIntensity,
					[
						["none", "None"],
						["subtle", "Subtle"],
						["normal", "Normal"],
					],
					(v) => {
						view.shadowIntensity = v as TimelineShadowIntensity;
						render();
					},
					"shadow-intensity-select"
				)
			)
		);
	}
}

function reRunActiveSource(): void {
	if (view.sourceType === "table") runTableSource();
	else if (view.sourceType === "dataview") runDataviewSource();
	else runFrontmatterSource();
}

// ---- Sample-data buttons (bypass the source tabs entirely) ----

render();

document.getElementById("btn-sample")?.addEventListener("click", () => {
	manualEvents = mockEvents;
	currentEvents = manualEvents;
	render();
});

document.getElementById("btn-random")?.addEventListener("click", () => {
	manualEvents = randomizedMockEvents(30);
	currentEvents = manualEvents;
	render();
});

document.getElementById("btn-ancient")?.addEventListener("click", () => {
	manualEvents = ancientMockEvents;
	currentEvents = manualEvents;
	view.datePrecision = "year";
	render();
});

document.getElementById("btn-empty")?.addEventListener("click", () => {
	renderEmptyState(container, "No events matched this view's query and date field.");
});

// Mirrors the message formats actually thrown by the source modules (see
// DataviewUnavailableError, the Dataview query-failure Error, and
// TimelineTableNotFoundError/TimelineTableParseError in src/sources/) so the
// error state can be eyeballed with realistic content instead of one canned
// string.
const sampleErrors = [
	"Dataview is not installed or enabled. Chronograph uses Dataview as its query backend.",
	'Dataview query failed: Unknown field "startDate" in WHERE clause.',
	'Table note not found: "Timeline/Events.md". Set a valid note path in the view\'s settings.',
	'No markdown table found in "Timeline/Events.md". Add a table with a header row and a "---" divider row.',
];
let errorIndex = 0;
document.getElementById("btn-error")?.addEventListener("click", () => {
	renderErrorState(container, sampleErrors[errorIndex % sampleErrors.length]);
	errorIndex++;
});

// Initialize the default active source tab's derived state (table).
runTableSource();
