<script lang="ts">
  import { browser } from "#imports";
  import { Button } from "$lib/components/ui/button";
  import { ModeWatcher } from "mode-watcher";
  import { get_book } from "../../utils/crud";
  import { type Book } from "../../utils/db";
  import { recent_book_ids, last_accessed_study } from "../../utils/storage";
  import { onMount, onDestroy } from "svelte";
  import LibraryIcon from "@lucide/svelte/icons/library";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

  interface PopupBook extends Omit<Book, "coverImage"> {
    study_id?: string;
  }

  let books = $state<PopupBook[]>([]);
  let loading = $state(true);

  async function load_recent_books() {
    const ids = await recent_book_ids.getValue();
    const last_accessed = await last_accessed_study.getValue();

    const book_promises = ids.map((id: number) => get_book(id, false));
    const results = await Promise.all(book_promises);

    const validBooks = results.filter((b): b is Book => b !== undefined);

    books = validBooks.map((b) => ({
      ...b,
      study_id: last_accessed[b.id],
    }));
    loading = false;
  }

  onMount(() => {
    load_recent_books();
  });

  function openOptions() {
    browser.tabs.create({
      url: browser.runtime.getURL("/options.html"),
    });
  }
</script>

<ModeWatcher />
<main class="bg-background w-80 p-5">
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="bg-primary flex size-8 items-center justify-center rounded-lg shadow-sm">
        <LibraryIcon class="text-primary-foreground size-4" />
      </div>
      <h1 class="text-sm font-bold tracking-tight uppercase">ChessBook</h1>
    </div>
    <Button variant="ghost" size="sm" class="text-xs font-semibold" onclick={openOptions}>
      Library
    </Button>
  </div>

  <div class="space-y-1.5">
    <h2 class="text-muted-foreground mb-3 px-1 text-[10px] font-bold tracking-widest uppercase">
      Recent Readings
    </h2>

    {#if loading}
      <div class="space-y-2">
        {#each Array(3) as _}
          <div class="bg-muted h-12 w-full animate-pulse rounded-lg"></div>
        {/each}
      </div>
    {:else if books.length === 0}
      <div
        class="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-4 text-center"
      >
        <p class="text-muted-foreground text-xs">No recent books found</p>
        <Button variant="outline" size="sm" class="h-8 text-xs" onclick={openOptions}>
          Open Library
        </Button>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each books as book (book.id)}
          <button
            class="group hover:bg-muted/50 hover:border-border flex items-center justify-between rounded-xl border border-transparent p-3 text-left transition-all"
            onclick={() => {
              if (book.study_id) {
                window.open("https://lichess.org" + book.study_id, "_blank");
              } else {
                openOptions();
              }
            }}
          >
            <div class="flex-1 overflow-hidden">
              <h3 class="truncate font-serif text-sm leading-none font-bold">{book.title}</h3>
              <p class="text-muted-foreground mt-1 text-[10px] font-medium">Continue reading</p>
            </div>
            <div
              class="text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
            >
              <ChevronRightIcon class="size-4" />
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</main>
