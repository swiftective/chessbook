<script lang="ts">
  import { browser } from "#imports";
  import { Button } from "$lib/components/ui/button";
  import { ModeWatcher } from "mode-watcher";

  function onclick() {
    browser.tabs.create({
      url: browser.runtime.getURL("/options.html"),
    });
  }
</script>

<ModeWatcher />
<main class="bg-secondary grid min-h-100 min-w-80 place-items-center">
  <Button variant="outline" {onclick}>Options page</Button>
</main>
