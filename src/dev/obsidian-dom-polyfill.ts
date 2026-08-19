// Obsidian injects createDiv/createEl/createSpan as globals (and as methods
// on HTMLElement.prototype) at app startup. The standalone browser preview
// (src/dev/preview.html) runs outside Obsidian, so this file recreates just
// enough of that API for the renderer code to work unmodified. Imported
// first in preview.ts, before any renderer code runs.
//
// This file intentionally calls document.createElement directly (rather than
// createEl/createDiv/createSpan) since it IS their implementation for this
// harness — the obsidianmd/prefer-create-el warnings below are expected.

interface DomElementInfo {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string | number | boolean | null>;
}

function applyInfo(el: HTMLElement, o?: DomElementInfo | string): void {
	if (!o) return;
	if (typeof o === "string") {
		el.className = o;
		return;
	}
	if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls;
	if (o.text !== undefined) el.textContent = o.text;
	if (o.attr) {
		for (const [key, value] of Object.entries(o.attr)) {
			if (value === null) continue;
			el.setAttribute(key, String(value));
		}
	}
}

function createEl<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	o?: DomElementInfo | string,
	callback?: (el: HTMLElementTagNameMap[K]) => void
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	applyInfo(el, o);
	callback?.(el);
	return el;
}

function createDiv(o?: DomElementInfo | string, callback?: (el: HTMLDivElement) => void): HTMLDivElement {
	return createEl("div", o, callback);
}

function createSpan(o?: DomElementInfo | string, callback?: (el: HTMLSpanElement) => void): HTMLSpanElement {
	return createEl("span", o, callback);
}

Object.assign(window, { createEl, createDiv, createSpan });

HTMLElement.prototype.createEl = function <K extends keyof HTMLElementTagNameMap>(
	this: HTMLElement,
	tag: K,
	o?: DomElementInfo | string,
	callback?: (el: HTMLElementTagNameMap[K]) => void
): HTMLElementTagNameMap[K] {
	const el = createEl(tag, o, callback);
	this.appendChild(el);
	return el;
};
HTMLElement.prototype.createDiv = function (
	this: HTMLElement,
	o?: DomElementInfo | string,
	callback?: (el: HTMLDivElement) => void
): HTMLDivElement {
	return this.createEl("div", o, callback);
};
HTMLElement.prototype.createSpan = function (
	this: HTMLElement,
	o?: DomElementInfo | string,
	callback?: (el: HTMLSpanElement) => void
): HTMLSpanElement {
	return this.createEl("span", o, callback);
};

HTMLElement.prototype.setText = function (this: HTMLElement, text: string): void {
	this.textContent = text;
};

HTMLElement.prototype.setCssStyles = function (this: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
	Object.assign(this.style, styles);
};
HTMLElement.prototype.setCssProps = function (this: HTMLElement, props: Record<string, string>): void {
	for (const [key, value] of Object.entries(props)) {
		this.style.setProperty(key, value);
	}
};
