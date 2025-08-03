import { App, PluginSettingTab, Setting } from "obsidian";
import AutoCloseTags from "../main";

export class AutoCloseTagsSettingTab extends PluginSettingTab {
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
					.setValue(this.plugin.getSettings().excludedTags)
					.onChange(async (value) => {
						this.plugin.updateSetting("excludedTags", value);
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
					.setValue(this.plugin.getSettings().cursorPosition)
					.onChange(async (value: "between" | "after") => {
						this.plugin.updateSetting("cursorPosition", value);
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
					.setValue(this.plugin.getSettings().ignoreInCodeBlocks)
					.onChange(async (value) => {
						this.plugin.updateSetting("ignoreInCodeBlocks", value);
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
					.setValue(this.plugin.getSettings().ignoreInlineCode)
					.onChange(async (value) => {
						this.plugin.updateSetting("ignoreInlineCode", value);
						await this.plugin.saveSettings();
					})
			);
	}
}
