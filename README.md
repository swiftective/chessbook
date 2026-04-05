<p align="center">
  <img src="public/icon/128.png" alt="ChessBook Logo" width="128">
</p>

<h1 align="center">CHESSBOOK</h1>

<p align="center">
  Read, study, and explore chess ebooks directly in your browser.
</p>

## Installation

- [Chessbook - Chrome Web Store](https://chromewebstore.google.com/detail/iocbmjchkglakkkjfbflbeaolnkeiffp/)
- [Chessbook - Firefox Add-Ons](https://addons.mozilla.org/en-US/firefox/addon/chessbook/)


> [!NOTE]
> For instructions on how to build from source, see [BUILD.md](https://github.com/swiftective/chessbook/blob/main/BUILD.md)


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
