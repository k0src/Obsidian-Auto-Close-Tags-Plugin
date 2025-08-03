import { Editor } from "obsidian";
import { AutoCloseTagsSettings } from "./types";

export class TagDetector {
	private settings: AutoCloseTagsSettings;

	constructor(settings: AutoCloseTagsSettings) {
		this.settings = settings;
	}

	updateSettings(settings: AutoCloseTagsSettings): void {
		this.settings = settings;
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

	isTagExcluded(tag: string, excludedTags: string[]): boolean {
		return excludedTags.includes(tag.toLowerCase());
	}

	shouldIgnorePosition(
		editor: Editor,
		line: string,
		lineNumber: number,
		position: number
	): boolean {
		if (
			this.settings.ignoreInCodeBlocks &&
			this.isInCodeBlock(editor, lineNumber)
		) {
			return true;
		}

		if (
			this.settings.ignoreInlineCode &&
			this.isInInlineCode(line, position)
		) {
			return true;
		}

		return false;
	}

	extractTagFromLine(
		line: string,
		cursorPosition: number
	): { tag: string; fullTag: string } | null {
		const beforeCursor = line.slice(0, cursorPosition);
		const tagMatch = beforeCursor.match(/<([a-zA-Z][\w\-]*)\s*([^>]*)>$/);

		if (
			!tagMatch ||
			beforeCursor.endsWith("/>") ||
			beforeCursor.endsWith("</")
		) {
			return null;
		}

		return {
			tag: tagMatch[1],
			fullTag: tagMatch[0],
		};
	}
}
