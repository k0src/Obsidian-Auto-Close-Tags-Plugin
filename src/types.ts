export interface AutoCloseTagsSettings {
	excludedTags: string;
	cursorPosition: "between" | "after";
	ignoreInCodeBlocks: boolean;
	ignoreInlineCode: boolean;
}

export const DEFAULT_SETTINGS: AutoCloseTagsSettings = {
	excludedTags: "",
	cursorPosition: "between",
	ignoreInCodeBlocks: false,
	ignoreInlineCode: true,
};
