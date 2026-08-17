// Minimal runtime stand-in for the "obsidian" package under Vitest. The real
// package ships types only — Obsidian itself supplies the runtime globals,
// and esbuild.config.mjs marks "obsidian" external in the plugin build. Only
// the exports actually used as runtime values (not just types) by src/ code
// need real implementations here; everything else is a thin stub so imports
// don't throw, even if a given test never touches them.

export class TAbstractFile {
	path = "";
	name = "";
}

export class TFile extends TAbstractFile {}

export class Notice {
	constructor(_message: string) {}
}

export class Plugin {}

export class ItemView {}

export class MarkdownView {
	file: TFile | null = null;
}

export class PluginSettingTab {}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
}

export class WorkspaceLeaf {}

// Minimal stand-in for Obsidian's getAllTags: combines inline cache.tags
// with frontmatter tags/tag fields (string, comma-separated string, or
// array), normalizing each to a leading "#".
export function getAllTags(cache: {
	tags?: { tag: string }[];
	frontmatter?: Record<string, unknown>;
}): string[] | null {
	const tags = new Set<string>();

	for (const t of cache.tags ?? []) tags.add(t.tag);

	const fm = cache.frontmatter;
	const fmTags = fm?.tags ?? fm?.tag;
	const raw = Array.isArray(fmTags)
		? fmTags
		: typeof fmTags === "string"
			? fmTags.split(",")
			: [];
	for (const t of raw) {
		const trimmed = String(t).trim();
		if (trimmed) tags.add(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
	}

	return tags.size > 0 ? [...tags] : null;
}
