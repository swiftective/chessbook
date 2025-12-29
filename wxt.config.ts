import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({

  manifest: {
    permissions: ["storage"],
    web_accessible_resources: [
      {
        resources: ["/move-event.js"],
        matches: ["https://lichess.org/*"],
      },
    ],
  },


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
