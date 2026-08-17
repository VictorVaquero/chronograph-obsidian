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
