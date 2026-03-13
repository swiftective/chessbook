<p align="center">
  <img src="public/icon/128.png" alt="ChessBook Logo" width="128">
</p>

<h1 align="center">CHESSBOOK</h1>

<p align="center">
  Read, study, and explore chess ebooks directly in your browser.
</p>

## Requirements

- JS Runtime (`bun`, `nodejs`)

## Installation

```sh
bun install
```

## Development

```sh
# Chromium browsers (launches Brave)
bun run dev

# Firefox
bun run dev:firefox
```

> The dev commands require the browser binary paths to be configured in `web-ext.config.ts`.
> Set the path to Brave and/or Firefox Developer Edition for your system.

## Building

```sh
# Chromium browsers
bun run build

# Firefox
bun run build:firefox
```

Output is placed in `.output/`.

### Packaging for distribution

```sh
# Chromium (Chrome Web Store)
bun run zip

# Firefox (Firefox Add-ons / AMO)
bun run zip:firefox
```

### Loading the extension manually

**Chromium (Chrome, Brave, Edge, etc.)**

1. Run `bun run build`
2. Click **Load unpacked** and select the `.output/chrome-mv3/` directory

**Firefox**

1. Run `bun run build:firefox`
2. Click **Load Temporary Add-on** and select any file inside `.output/firefox-mv3/`

## Adding a new book

Books are distributed as `.chessbook.json` files and can be imported via the extension's options page.

### JSON schema

```json
{
  "title": "My Chess Book",
  "image_base64": "<base64-encoded PNG, no data: URI prefix — optional>",
  "pages": ["Page content as a plain text or HTML string", "Each element in the array is one page"]
}
```

| Field          | Type       | Required | Description                                                                         |
| -------------- | ---------- | -------- | ----------------------------------------------------------------------------------- |
| `title`        | `string`   | Yes      | Display name of the book                                                            |
| `pages`        | `string[]` | Yes      | Array of page content strings (plain text, HTML, or stringified Tiptap JSON)        |
| `image_base64` | `string`   | No       | Raw base64-encoded PNG used as the cover image (no `data:image/png;base64,` prefix) |
