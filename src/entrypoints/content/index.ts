// entrypoints/example-ui.content/index.ts
import App from "./App.svelte";
import { mount, unmount } from "svelte";
import "../../assets/index.css";
import { createShadowRootUi, defineContentScript, injectScript } from "#imports";

export default defineContentScript({
  matches: [
    "https://lichess.org/analysis/*",
    "https://lichess.org/study/*",
    "https://lichess.org/analysis",
  ], // Be specific for security
  // 2. Set cssInjectionMode
  cssInjectionMode: "ui",

  async main(ctx) {
    // 3. Define your UI
    const ui = await createShadowRootUi(ctx, {
      name: "book-ui",
      isolateEvents: true,
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (isDarkMode) {
          container.classList.add("dark");
        }

        injectScript("/move-event.js");

        document.addEventListener("UI_COMMAND", (e: any) => {
          window.postMessage(
            {
              source: "my-svelte-remote",
              action: e.detail.action,
              params: e.detail.params,
            },
            "*",
          );
        });

        // Create the Svelte app inside the UI container
        return mount(App, { target: container });
      },
      onRemove: (app) => {
        // Destroy the app when the UI is removed
        if (app) unmount(app);
      },
    });

    // 4. Mount the UI
    ui.mount();
  },
});
