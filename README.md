## Auto Close Tags

This is a plugin for [Obsidian](https://obsidian.md/) that auto-closes HTML tags, such as `<div>`, `<span>`, etc.

[comment]: <> (gif)

### Usage

By default, after enabling the plugin, it will automatically close HTML tags as you type. For example, if you type `<div>`, it will automatically add the closing tag `</div>`.

### Settings

To exclude certain tags from being auto-closed, you can go to the plugin settings and add them to the "Excluded Tags" list. The position of the cursor can be changed for the closing tag by enabling the "Place cursor at end of closing tag" option. This will place the cursor after the closing tag, for tags closed by hotkeys. Additionally, tags in fenced code blocks and inline code can be ignored.

### Hotkeys

Hotkeys can be changed in the Obsidian settings under "Hotkeys". The default hotkeys are:

-   `Ctrl + Alt + T`: Close the last opened tag at the cursor position.

### Development

To develop this plugin, you can clone the repository and run the following commands:

```bash
npm install
```

```bash
npm run dev
```

### Notes

This plugin is experimental and may not work perfectly in all cases. It is distributed as-is.
