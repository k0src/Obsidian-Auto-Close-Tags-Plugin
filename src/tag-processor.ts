import { Editor } from "obsidian";
import { AutoCloseTagsSettings } from "./types";
import { TagDetector } from "./tag-detector";

export class TagProcessor {
	private settings: AutoCloseTagsSettings;
	private tagDetector: TagDetector;
	private lastProcessedPosition: { line: number; ch: number } | null = null;

	constructor(settings: AutoCloseTagsSettings) {
		this.settings = settings;
		this.tagDetector = new TagDetector(settings);
	}

	updateSettings(settings: AutoCloseTagsSettings): void {
		this.settings = settings;
		this.tagDetector.updateSettings(settings);
	}

	setLastProcessedPosition(
		position: { line: number; ch: number } | null
	): void {
		this.lastProcessedPosition = position;
	}

	getLastProcessedPosition(): { line: number; ch: number } | null {
		return this.lastProcessedPosition;
	}

	autoCloseTag(editor: Editor, excludedTags: string[]): boolean {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);

		if (cursor.ch === 0 || line[cursor.ch - 1] !== ">") {
			return false;
		}

		const tagInfo = this.tagDetector.extractTagFromLine(line, cursor.ch);
		if (!tagInfo) {
			return false;
		}

		const { tag, fullTag } = tagInfo;

		if (this.tagDetector.isSelfClosing(fullTag)) {
			return false;
		}

		if (this.tagDetector.isTagExcluded(tag, excludedTags)) {
			return false;
		}

		if (
			this.tagDetector.shouldIgnorePosition(
				editor,
				line,
				cursor.line,
				cursor.ch
			)
		) {
			return false;
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

		return true;
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

	insertClosingTag(editor: Editor, excludedTags: string[]): void {
		const content = editor.getValue();
		const lines = content.split("\n");

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

				if (excludedTags.includes(tag)) continue;
				if (this.tagDetector.isSelfClosing(raw)) continue;
				if (
					this.settings.ignoreInlineCode &&
					this.tagDetector.isInInlineCode(line, matchIndex)
				)
					continue;

				openTags.push({ tag, line: i });
			}

			const closeMatches = [...line.matchAll(/<\/([a-zA-Z][\w\-]*)>/g)];
			for (const match of closeMatches) {
				const matchIndex = match.index ?? 0;
				if (
					this.settings.ignoreInlineCode &&
					this.tagDetector.isInInlineCode(line, matchIndex)
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
}
