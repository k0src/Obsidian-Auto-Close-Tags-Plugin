import { App, Editor, Plugin, PluginSettingTab, Setting } from "obsidian";

interface AutoCloseTagsSettings {
	excludedTags: string;
	cursorPosition: "between" | "after";
	ignoreInCodeBlocks: boolean;
	ignoreInlineCode: boolean;
}

const DEFAULT_SETTINGS: AutoCloseTagsSettings = {
	excludedTags: "",
	cursorPosition: "between",
	ignoreInCodeBlocks: false,
	ignoreInlineCode: true,
};

export default class AutoCloseTags extends Plugin {
	private allowAutoClose: boolean = false;
	settings: AutoCloseTagsSettings;
	private lastProcessedPosition: { line: number; ch: number } | null = null;

	async onload() {
		await this.loadSettings();

		this.registerDomEvent(document, "paste", () => {
			this.allowAutoClose = true;
		});

		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === ">") {
				this.allowAutoClose = true;
			}
		});

		this.registerEvent(
			this.app.workspace.on("editor-change", (editor) => {
				setTimeout(() => {
					this.handleTyping(editor);
				}, 10);
			})
		);

		this.addCommand({
			id: "close-last-tag",
			name: "Close last unclosed tag",
			hotkeys: [],
			editorCallback: (editor) => {
				this.insertClosingTag(editor);
			},
		});

		this.addSettingTab(new AutoCloseTagsSettingTab(this.app, this));
	}

	handleTyping(editor: Editor) {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);

		if (
			this.lastProcessedPosition &&
			this.lastProcessedPosition.line === cursor.line &&
			this.lastProcessedPosition.ch === cursor.ch
		) {
			return;
		}

		if (!this.allowAutoClose) return;
		this.allowAutoClose = false;

		if (cursor.ch === 0 || line[cursor.ch - 1] !== ">") {
			return;
		}

		const beforeCursor = line.slice(0, cursor.ch);

		const tagMatch = beforeCursor.match(/<([a-zA-Z][\w\-]*)\s*([^>]*)>$/);

		if (
			!tagMatch ||
			beforeCursor.endsWith("/>") ||
			beforeCursor.endsWith("</")
		) {
			return;
		}

		const tag = tagMatch[1];
		const fullTag = tagMatch[0];

		if (this.isSelfClosing(fullTag)) return;

		const excluded = this.settings.excludedTags
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);

		if (excluded.includes(tag.toLowerCase())) return;

		if (
			(this.settings.ignoreInCodeBlocks &&
				this.isInCodeBlock(editor, cursor.line)) ||
			(this.settings.ignoreInlineCode &&
				this.isInInlineCode(line, cursor.ch))
		) {
			return;
		}

		const closingTag = `</${tag}>`;
		const insertPos = { line: cursor.line, ch: cursor.ch };

		this.lastProcessedPosition = { line: cursor.line, ch: cursor.ch };

		editor.replaceRange(closingTag, insertPos);

		if (this.settings.cursorPosition === "between") {
			editor.setCursor({ line: cursor.line, ch: cursor.ch });
		} else {
			editor.setCursor({
				line: cursor.line,
				ch: cursor.ch + closingTag.length,
			});
		}

		setTimeout(() => {
			this.lastProcessedPosition = null;
		}, 100);
	}

	hasMatchingClosingTag(
		editor: Editor,
		tagName: string,
		fromLine: number,
		fromCh: number
	): boolean {
		const content = editor.getValue();
		const lines = content.split("\n");

		let openCount = 1;

		for (let i = fromLine; i < lines.length; i++) {
			const line = lines[i];
			const searchFrom = i === fromLine ? fromCh : 0;
			const searchLine = line.slice(searchFrom);

			const openMatches = [
				...searchLine.matchAll(
					new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "gi")
				),
			];
			openCount += openMatches.length;

			const closeMatches = [
				...searchLine.matchAll(new RegExp(`</${tagName}>`, "gi")),
			];
			openCount -= closeMatches.length;

			if (openCount <= 0) {
				return true;
			}
		}

		return false;
	}

	insertClosingTag(editor: Editor) {
		const content = editor.getValue();
		const lines = content.split("\n");

		const excluded = this.settings.excludedTags
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);

		const openTags: { tag: string; line: number }[] = [];
		const closeTags: string[] = [];

		let insideCodeBlock = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (line.trim().startsWith("```")) {
				insideCodeBlock = !insideCodeBlock;
				continue;
			}

			if (this.settings.ignoreInCodeBlocks && insideCodeBlock) continue;

			const openMatches = [
				...line.matchAll(/<([a-zA-Z][\w\-]*)\s*([^>]*?)>/g),
			];
			for (const match of openMatches) {
				const raw = match[0];
				const tag = match[1].toLowerCase();
				const matchIndex = match.index ?? 0;

				if (excluded.includes(tag)) continue;
				if (this.isSelfClosing(raw)) continue;
				if (
					this.settings.ignoreInlineCode &&
					this.isInInlineCode(line, matchIndex)
				)
					continue;

				openTags.push({ tag, line: i });
			}

			const closeMatches = [...line.matchAll(/<\/([a-zA-Z][\w\-]*)>/g)];
			for (const match of closeMatches) {
				const matchIndex = match.index ?? 0;
				if (
					this.settings.ignoreInlineCode &&
					this.isInInlineCode(line, matchIndex)
				)
					continue;
				closeTags.push(match[1].toLowerCase());
			}
		}

		for (const closeTag of closeTags) {
			const openIndex = openTags.findLastIndex(
				(openTag) => openTag.tag === closeTag
			);
			if (openIndex !== -1) {
				openTags.splice(openIndex, 1);
			}
		}

		if (openTags.length === 0) {
			console.log("No unclosed tags found");
			return;
		}

		const tagToClose = openTags[openTags.length - 1].tag;
		const closingTag = `</${tagToClose}>`;
		const cursor = editor.getCursor();

		editor.replaceRange(closingTag, cursor);

		if (this.settings.cursorPosition === "after") {
			editor.setCursor({
				line: cursor.line,
				ch: cursor.ch + closingTag.length,
			});
		} else {
			editor.setCursor(cursor);
		}
	}

	isSelfClosing(tag: string): boolean {
		if (/\/\s*>$/.test(tag)) return true;

		const voidElements = [
			"area",
			"base",
			"br",
			"col",
			"embed",
			"hr",
			"img",
			"input",
			"link",
			"meta",
			"source",
			"track",
			"wbr",
		];

		const tagName = tag.match(/<([a-zA-Z][\w\-]*)/)?.[1]?.toLowerCase();
		return tagName ? voidElements.includes(tagName) : false;
	}

	isInCodeBlock(editor: Editor, line: number): boolean {
		let inCodeBlock = false;
		for (let i = 0; i <= line; i++) {
			const currentLine = editor.getLine(i);
			if (currentLine && currentLine.trim().startsWith("```")) {
				inCodeBlock = !inCodeBlock;
			}
		}
		return inCodeBlock;
	}

	isInInlineCode(line: string, index: number): boolean {
		const before = line.slice(0, index);
		const backticks = (before.match(/`/g) || []).length;
		return backticks % 2 === 1;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

/* ---------------------------- Settings Tab ---------------------------- */
class AutoCloseTagsSettingTab extends PluginSettingTab {
	plugin: AutoCloseTags;

	constructor(app: App, plugin: AutoCloseTags) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Excluded tags")
			.setDesc(
				"Comma-separated list of tags that should not be auto-closed (e.g., div, span, i)."
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., div, span, i")
					.setValue(this.plugin.settings.excludedTags)
					.onChange(async (value) => {
						this.plugin.settings.excludedTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Cursor position after auto-close")
			.setDesc("Where to place the cursor after auto-closing a tag.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("between", "Between tags")
					.addOption("after", "After closing tag")
					.setValue(this.plugin.settings.cursorPosition)
					.onChange(async (value: "between" | "after") => {
						this.plugin.settings.cursorPosition = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ignore fenced code blocks")
			.setDesc(
				"Avoid auto-closing tags inside Markdown code blocks (``` blocks)."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ignoreInCodeBlocks)
					.onChange(async (value) => {
						this.plugin.settings.ignoreInCodeBlocks = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ignore inline code")
			.setDesc(
				"Avoid auto-closing tags inside inline code spans (e.g., `<div>`)."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ignoreInlineCode)
					.onChange(async (value) => {
						this.plugin.settings.ignoreInlineCode = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
