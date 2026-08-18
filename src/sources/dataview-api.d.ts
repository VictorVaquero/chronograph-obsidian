// Minimal ambient typing for the subset of the Dataview plugin API this
// plugin consumes. Dataview is an optional peer plugin: it is never
// imported at runtime, only detected via `app.plugins.plugins.dataview`.
// See https://blacksmithgu.github.io/obsidian-dataview/api/intro/

export interface DataviewLiteral {
	value: unknown;
	toString(): string;
}

export interface DataviewPage {
	file: {
		path: string;
		name: string;
		link: unknown;
	};
	[field: string]: unknown;
}

export interface DataviewQueryResultSuccess {
	successful: true;
	value: {
		type: "table" | "list" | "task";
		// "table" results are positional: each row is an array with one entry
		// per selected column, in the same order as `headers` (column 0 is
		// always the implicit File link). "list"/"task" results are DataviewPage
		// objects keyed by field name. See dataview-source.ts's `normalizeRow`.
		values: DataviewPage[] | unknown[][];
		/** Column names for "table" results, parallel to each row array. */
		headers?: string[];
	};
}

export interface DataviewQueryResultError {
	successful: false;
	error: string;
}

export type DataviewQueryResult =
	| DataviewQueryResultSuccess
	| DataviewQueryResultError;

export interface DataviewApi {
	query(source: string, originFile?: string): Promise<DataviewQueryResult>;
	pages(query?: string, originFile?: string): DataviewPage[];
}

export interface DataviewPluginLike {
	api: DataviewApi;
}
