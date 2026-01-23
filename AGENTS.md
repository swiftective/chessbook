# Agentic Coding Guidelines for Chessbook

This document provides essential information for AI agents operating in the Chessbook repository. Adhere to these patterns to maintain consistency and ensure compatibility with the project's architecture.

## 🛠 Tech Stack

- **Framework:** [Svelte 5](https://svelte.dev/) (utilizing Runes for reactivity)
- **Toolbox:** [WXT](https://wxt.dev/) (Web Extension Toolbox)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Icons:** [Lucide Svelte](https://lucide.dev/guide/svelte)
- **UI Components:** [Bits UI](https://bits-ui.com/), [Paneforge](https://paneforge.com/)

## 🚀 Commands

### Build & Development

- `npm run dev`: Start development server (defaults to Brave browser)
- `npm run dev:firefox`: Start development server for Firefox
- `npm run build`: Build the extension for Chrome/Brave
- `npm run build:firefox`: Build specifically for Firefox
- `npm run zip`: Package the extension for distribution

### Quality Control

- `npm run check`: Executes `svelte-check` for type checking and Svelte-specific linting.
- `npm run format`: Formats the codebase using Prettier with Tailwind and Svelte plugins.

### Testing

- **Status:** No dedicated test runner is currently configured in `package.json`.
- **Single Test:** If Vitest or a similar runner is added, use `npx vitest <path-to-file>` to run a specific test.
- **Validation:** Always run `npm run check` before submitting changes to ensure type safety.

## 🎨 Code Style & Conventions

### Svelte 5 Runes & Patterns

- **Reactivity:** Use Runes exclusively. Do not use legacy Svelte 4 syntax (e.g., `export let`, `$:`, or `Writable` stores for component state).
- **State:** Use `$state()` for reactive variables.
  ```svelte
  <script>
    let count = $state(0);
    function increment() {
      count += 1;
    }
  </script>
  ```
- **Props:** Use `$props()` for component inputs. Destructure props if appropriate: `let { title, id } = $props();`.
- **Derived State:** Use `$derived()` for computed values that depend on other reactive state.
  ```javascript
  let doubled = $derived(count * 2);
  ```
- **Effects:** Use `$effect()` sparingly for side effects. For DOM manipulations or intervals, ensure cleanup is handled.
- **Lifecycle:** Prefer standard Svelte 5 mounting: `import { mount, unmount } from "svelte";`.

### Naming Conventions

- **Files:** Use `kebab-case` for all file and directory names (e.g., `book-card.svelte`, `move-event.ts`).
- **Functions:** Use `snake_case` for logic, API, and utility functions (e.g., `get_books`, `add_book`, `update_page`). This is a project-specific convention intended to distinguish logic from standard camelCase variable names.
- **Variables:** Use `camelCase` for local variables and constants.
- **Components:** Use `PascalCase` when referencing components in scripts and templates, though the files themselves are `kebab-case`.
- **Stores/Database:** Database entities and tables should follow the models defined in `src/utils/db.ts`.

### Imports & Path Aliases

- **$lib:** Use the `$lib/` alias for any internal library code (components, utils) located in `src/lib/`.
- **WXT Imports:** Use `#imports` for WXT-provided APIs (e.g., `browser`, `defineBackground`, `defineContentScript`).
- **Organization:**
  1. Framework/Core imports (Svelte, WXT)
  2. Third-party libraries (Lucide, Dexie, etc.)
  3. Internal Aliased imports (`$lib/...`)
  4. Relative imports (`../../utils/...`)
  5. Asset/Style imports

### Database (Dexie.js)

- All IndexedDB logic should reside in `src/utils/db.ts` or `src/utils/crud.ts`.
- Ensure new data models are added to the `Book` interface and the Dexie schema.
- Asynchronous database calls must be wrapped in `try...catch` blocks.
- Example pattern:
  ```typescript
  async function get_books() {
    try {
      return await db.books.toArray();
    } catch (e) {
      console.error("Failed to fetch books", e);
      return [];
    }
  }
  ```

### Styling (Tailwind CSS v4)

- Leverage Tailwind 4 features like the `bg-linear-to-*` syntax.
- Use the `cn` utility from `$lib/utils.ts` for conditional class merging.
- Follow the project's theme pattern (Light/Dark mode) using the `.dark` class on parent containers or shadow roots.
- Example: `class={cn("base-class", condition && "conditional-class")}`.

### Error Handling

- **Async Operations:** Always use `try...catch` for network, database, and extension API calls.
- **Logging:** Use `console.warn()` for non-critical issues and `console.error()` for failures that prevent features from working.
- **User Feedback:** Ensure UI components handle loading and error states (e.g., using Skeletons).

## 📂 Project Structure

- `src/entrypoints/`: Contains the main logic for extension parts:
  - `background/`: Background scripts and message listeners. Centralizes DB access.
  - `content/`: Content scripts injected into Lichess. Implements the overlay UI.
  - `popup/`: The extension's popup UI (browser toolbar).
  - `options/`: The extension's options page.
- `src/lib/`: Shared Svelte components and logic (aliased as `$lib`).
- `src/utils/`: Database configuration (`db.ts`), CRUD operations (`crud.ts`), and storage helpers.
- `src/assets/`: Global CSS and static assets.

## 🔌 Communication Patterns

- **Message Passing:** The project uses `browser.runtime.sendMessage` and `browser.runtime.onMessage.addListener` for communication between content scripts and the background.
- **Actions:** Define clear action strings (e.g., `"add-book"`, `"get-books"`) to handle different requests in the background script's switch statement.
- **Background as Proxy:** The background script should handle all direct Database (Dexie) interactions, with content scripts requesting data via messages.

### Example Message Pattern (Content Script)

```typescript
async function fetch_books() {
  const response = await browser.runtime.sendMessage({ action: "get-books" });
  if (response.error) throw new Error(response.error);
  return response.data;
}
```

### Example Message Pattern (Background Script)

```typescript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get-books") {
    get_books().then((books) => sendResponse({ data: books }));
    return true; // Keep channel open for async response
  }
});
```

## 📝 Cursor & Copilot Rules

_No specific .cursorrules or .cursor/rules found. Adhere to the established snake_case function naming and Svelte 5 Rune usage described above._

---

_This file is maintained for AI agents. Please update it when introducing new architectural patterns or significant tool changes._
