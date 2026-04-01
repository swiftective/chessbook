import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,

  manifest: ({ browser }) => ({
    // Conditionally include gecko settings only for Firefox
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "chessbook@swiftective.github.io",
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    }),
    permissions: ["storage"],
    web_accessible_resources: [
      {
        resources: ["/move-event.js", "/icon/128.png"],
        matches: ["https://lichess.org/*"],
      },
    ],
  }),

  imports: false,
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],

  vite: () => ({
    resolve: {
      alias: {
        $lib: path.resolve("./src/lib"),
      },
    },
    plugins: [tailwindcss()],
  }),
});
