## Requirements

- JS Runtime (`bun` -- recommended, `nodejs`)

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
