<script lang="ts">
  import { browser } from "#imports";
  import { Button } from "$lib/components/ui/button";
  import { ModeWatcher } from "mode-watcher";
  import { get_book } from "../../utils/crud";
  import { type Book } from "../../utils/db";
  import { recent_book_ids, last_accessed_study } from "../../utils/storage";
  import { onMount, onDestroy } from "svelte";

  interface PopupBook extends Omit<Book, "coverImage"> {
    study_id?: string;
  }

  let books = $state<PopupBook[]>([]);
  let loading = $state(true);

  async function load_recent_books() {
    const ids = await recent_book_ids.getValue();
    const last_accessed = await last_accessed_study.getValue();

    // Fetch books without cover images for speed
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
<main class="bg-background min-h-80 min-w-70 p-4">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-xl font-bold">Recent Books</h1>
    <Button variant="outline" size="sm" onclick={openOptions}>Library</Button>
  </div>

  {#if loading}
    <div class="flex h-40 items-center justify-center">
      <p class="animate-pulse text-sm">Loading...</p>
    </div>
  {:else if books.length === 0}
    <div class="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <p class="text-muted-foreground text-sm">No recent books</p>
      <Button variant="link" size="sm" onclick={openOptions}>Open library</Button>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each books as book (book.id)}
        <button
          class="group hover:bg-secondary flex items-center justify-between rounded-md border p-3 text-left transition-all"
          onclick={() => {
            if (book.study_id) {
              window.open("https://lichess.org" + book.study_id, "_blank");
            } else {
              openOptions();
            }
          }}
        >
          <div class="flex-1 overflow-hidden">
            <h3 class="truncate text-sm font-medium">{book.title}</h3>
            <p class="text-muted-foreground text-[10px] tracking-wider uppercase">
              {book.study_id ? "Resume" : "In Library"}
            </p>
          </div>
          <div class="text-muted-foreground transition-transform group-hover:translate-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6" /></svg
            >
          </div>
        </button>
      {/each}
    </div>
  {/if}
</main>
