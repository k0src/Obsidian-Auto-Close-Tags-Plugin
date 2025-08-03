import { Editor, Plugin } from "obsidian";
import { AutoCloseTagsSettings } from "./src/types";
import { SettingsManager } from "./src/settings";
import { TagProcessor } from "./src/tag-processor";
import { AutoCloseTagsSettingTab } from "./src/settings-tab";

export default class AutoCloseTags extends Plugin {
	private allowAutoClose: boolean = false;
	private settingsManager: SettingsManager;
	private tagProcessor: TagProcessor;

	async onload() {
		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.loadSettings();

		this.tagProcessor = new TagProcessor(this.settingsManager.settings);

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

		const lastPos = this.tagProcessor.getLastProcessedPosition();
		if (
			lastPos &&
			lastPos.line === cursor.line &&
			lastPos.ch === cursor.ch
		) {
			return;
		}

		if (!this.allowAutoClose) return;
		this.allowAutoClose = false;

		this.tagProcessor.autoCloseTag(
			editor,
			this.settingsManager.getExcludedTags()
		);
	}

	insertClosingTag(editor: Editor) {
		this.tagProcessor.insertClosingTag(
			editor,
			this.settingsManager.getExcludedTags()
		);
	}

	getSettings(): AutoCloseTagsSettings {
		return this.settingsManager.settings;
	}

	updateSetting<K extends keyof AutoCloseTagsSettings>(
		key: K,
		value: AutoCloseTagsSettings[K]
	): void {
		this.settingsManager.settings[key] = value;
		this.tagProcessor.updateSettings(this.settingsManager.settings);
	}

	async saveSettings(): Promise<void> {
		await this.settingsManager.saveSettings();
	}
}
