import esbuild from "esbuild";
import process from "process";

// Bundles the standalone browser preview (src/dev/preview.ts) with no
// Obsidian externals — everything it imports (timeline-renderer.ts, types.ts,
// mock-events.ts) is plain TS/DOM, so this produces a fully self-contained
// browser bundle for `pnpm run dev:preview`.

const watch = process.argv[2] === "watch";

const context = await esbuild.context({
	entryPoints: ["src/dev/preview.ts"],
	bundle: true,
	format: "esm",
	target: "es2020",
	sourcemap: true,
	outfile: "src/dev/preview.bundle.js",
	logLevel: "info",
});

if (watch) {
	await context.watch();
	// Served from the project root (not src/dev) so preview.html can load
	// the real styles.css via a root-relative path instead of "../../".
	const serveResult = await context.serve({ servedir: ".", port: 8123 }, {});
	console.log(
		`Preview server: http://${serveResult.host}:${serveResult.port}/src/dev/preview.html`
	);
} else {
	await context.rebuild();
	await context.dispose();
}
