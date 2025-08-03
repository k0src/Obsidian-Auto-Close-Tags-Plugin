import { Plugin } from "obsidian";
import { AutoCloseTagsSettings, DEFAULT_SETTINGS } from "./types";

export class SettingsManager {
	private plugin: Plugin;
	public settings: AutoCloseTagsSettings;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = { ...DEFAULT_SETTINGS };
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.plugin.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.plugin.saveData(this.settings);
	}

	getExcludedTags(): string[] {
		return this.settings.excludedTags
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
	}
}
