import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_ACRONYMS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/acronyms.js";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

export default defineConfig([
	globalIgnores([
		"main.js",
		"node_modules/**",
		"esbuild.config.mjs",
		"esbuild.preview.mjs",
		"version-bump.mjs",
		"verify-tmp*.mjs",
		"vitest.config.mts",
		"src/dev/preview.bundle.js",
		"**/*.js.map",
	]),
	js.configs.recommended,
	...tseslint.configs.recommended,
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { project: "./tsconfig.json" },
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			// `brands`/`acronyms` here REPLACE the rule's own defaults rather than
			// extend them (see node_modules/eslint-plugin-obsidianmd's
			// normalizeOptions: `options?.brands ?? DEFAULT_BRANDS`), so the
			// plugin's own lists (which recognize "Obsidian", "CSS", "HTML", etc.)
			// must be spread in explicitly alongside our project-specific additions.
			"obsidianmd/ui/sentence-case": [
				"warn",
				{ brands: [...DEFAULT_BRANDS, "Dataview", "Chronograph"], acronyms: [...DEFAULT_ACRONYMS, "DQL"] },
			],
		},
	},
	// Standalone dev/preview tooling (see src/dev/), not bundled into the
	// plugin (see README "Project structure"): Node scripts, console logging,
	// and raw DOM calls here are fine — Obsidian runtime guidelines don't
	// apply outside the actual plugin bundle.
	{
		files: ["src/dev/**/*.mjs"],
		languageOptions: {
			globals: { process: "readonly", console: "readonly" },
		},
	},
	// Playwright config runs under Node, not the Obsidian/browser runtime.
	{
		files: ["playwright.config.ts"],
		languageOptions: {
			globals: { process: "readonly" },
		},
	},
	{
		files: ["src/dev/**"],
		rules: Object.fromEntries(
			Object.keys(obsidianmd.rules).map((name) => [`obsidianmd/${name}`, "off"])
		),
	},
	// Vitest specs run under jsdom, not the Obsidian runtime, so the
	// `createDiv()`/`createEl()` prototype helpers Obsidian injects aren't
	// available here; plain DOM APIs are the correct choice in this context.
	{
		files: ["**/*.test.ts"],
		rules: {
			"obsidianmd/prefer-create-el": "off",
			"obsidianmd/no-nodejs-modules": "off",
		},
	},
]);
