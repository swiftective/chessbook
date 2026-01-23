<script lang="ts">
  import * as Resizable from "$lib/components/ui/resizable/index";
  import Editor from "./editor.svelte";

  import { fly } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";

  import { get_books, get_book, update_page, update_recent_books } from "../../utils/crud";

  import { Chess } from "chess.js";

  import BookOpenTextIcon from "@lucide/svelte/icons/book-open-text";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import ChevronsLeftIcon from "@lucide/svelte/icons/chevrons-left";

  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

  import LibraryBigIcon from "@lucide/svelte/icons/library-big";

  import CancelIcon from "@lucide/svelte/icons/x";
  import RefreshIcon from "@lucide/svelte/icons/rotate-ccw";

  import { type Book } from "../../utils/db";
  import {
    type LastAccessBook,
    type LastAccessStudy,
    last_accessed_study,
    last_accessed_book,
    recent_book_ids,
  } from "../../utils/storage";

  import { Button } from "$lib/components/ui/button/index";
  import BookCard from "../../components/book-card.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { clamp, debounce } from "../../utils/utils";
  import { onDestroy, untrack } from "svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";

  let el = $state<HTMLElement | null>(null);

  let theme = $state<"dark" | "light">("dark");

  // URL Tracking
  let currentUrl = $state(window.location.href);

  $effect(() => {
    const interval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
      }
    }, 500);
    return () => clearInterval(interval);
  });

  const curr_study_id = $derived(new URL(currentUrl).pathname);

  // ContentUI open state
  let open = $state(false);

  let selected_book = $state<Omit<Book, "coverImage"> | undefined>();
  let pageInput = $state(1);

  let local_last_accessed_book = $state<LastAccessBook>({});
  let local_last_accessed_study = $state<LastAccessStudy>({});

  // BookList State
  let books = $state<Omit<Book, "pages">[]>([]);
  let isBookList = $state(false);
  let loading = $state(false);
  let refreshSpin = $state(false);

  function toggleMode() {
    if (!el || !el.parentElement) return;
    if (theme == "dark") {
      el.parentElement.classList.remove("dark");
      theme = "light";
    } else {
      el.parentElement.classList.add("dark");
      theme = "dark";
    }
  }

  function firstChessNotation(text: string) {
    const regex = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?|O-O(-O)?)\b/;
    const match = text.match(regex);
    return match ? match[0] : null;
  }

  function refreshButtonSpin() {
    refreshSpin = true;
    setTimeout(() => {
      refreshSpin = false;
    }, 600);
  }

  async function refresh_books() {
    books = [];
    refreshButtonSpin();

    const key = setTimeout(() => {
      loading = true;
    }, 50);

    books = (await get_books()).reverse();

    clearTimeout(key);
    loading = false;
  }

  function onChessMove(bookMove: string) {
    try {
      const fen_el = document.querySelector("[data-fen]");
      const fen = fen_el?.getAttribute("data-fen");
      if (!fen) return;
      const chess = new Chess(fen);
      const notation = firstChessNotation(bookMove);
      if (!notation) return;
      let move = chess.move(notation);

      document.dispatchEvent(
        new CustomEvent("UI_COMMAND", {
          detail: { action: "MAKE_MOVE", params: { uci: move.lan } },
        }),
      );
    } catch (_) {}
  }

  async function startup() {
    local_last_accessed_book = await last_accessed_book.getValue();
    local_last_accessed_study = await last_accessed_study.getValue();
  }

  // sync data
  const interval_key = setInterval(() => {
    if (selected_book && open) {
      last_accessed_study.setValue(local_last_accessed_study);
      last_accessed_book.setValue(local_last_accessed_book);
    }
  }, 3000);

  // Load book associated with current study
  $effect(() => {
    const data = local_last_accessed_book[curr_study_id];
    const current_book = untrack(() => selected_book);

    if (data && (!current_book || current_book.id !== data.book_id)) {
      get_book(data.book_id).then((book) => {
        if (book) {
          selected_book = book;
          pageInput = data.page || 1;
          update_recent_books(book.id);
        }
      });
    }
  });

  $effect(() => {
    if (!selected_book) return;
    local_last_accessed_study[selected_book.id] = curr_study_id;

    if (!local_last_accessed_book[curr_study_id]) {
      local_last_accessed_book[curr_study_id] = {
        book_id: selected_book.id,
        page: pageInput,
      };
    } else {
      local_last_accessed_book[curr_study_id].book_id = selected_book.id;
      local_last_accessed_book[curr_study_id].page = pageInput;
    }
  });

  onDestroy(() => {
    clearInterval(interval_key);
  });

  startup();
</script>

{#if open}
  <div
    bind:this={el}
    class="pointer-events-none absolute inset-y-18 left-0 z-50 min-h-[90vh] w-full"
    transition:fly={{ x: -100, duration: 400, easing: quintOut }}
  >
    <Resizable.PaneGroup autoSaveId={"bookUILength"} direction="horizontal">
      <Resizable.Pane class="bg-background pointer-events-auto rounded-r-lg shadow-xl">
        {#if isBookList || !selected_book}
          <div class="flex items-center justify-end gap-4 p-6 pb-0">
            <Button class="size-10 rounded-full" variant="outline" onclick={refresh_books}>
              <RefreshIcon class={refreshSpin ? "animate-[spin_0.6s_linear_1]" : ""} />
            </Button>
            {#if selected_book}
              <Button
                class="size-10 rounded-full"
                variant="outline"
                onclick={() => {
                  isBookList = false;
                }}
              >
                <CancelIcon />
              </Button>
            {/if}
            <Button onclick={() => (open = false)} class="size-10 rounded-full" variant="outline">
              <ChevronsLeftIcon class="size-[1.2rem]" />
            </Button>
          </div>
          <ScrollArea class="h-[80vh] p-6">
            <div class="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-6">
              {#each books as book (book.id)}
                <button
                  class="appearance-none"
                  onclick={async () => {
                    if (selected_book && selected_book.id == book.id) {
                      isBookList = false;
                      return;
                    }

                    const curr_book = await get_book(book.id);
                    if (!curr_book) return;

                    local_last_accessed_book[curr_study_id] = {
                      book_id: curr_book.id,
                      page: 1,
                    };
                    local_last_accessed_study[curr_book.id] = curr_study_id;

                    selected_book = curr_book;
                    pageInput = 1;
                    isBookList = false;
                    update_recent_books(book.id);
                  }}
                  animate:flip={{ duration: 500 }}
                >
                  <BookCard {...book} />
                </button>
              {/each}

              {#if loading}
                {#each Array(5) as _}
                  <Skeleton class="rouned-lg aspect-[1/1.414] max-w-75" />
                {/each}
              {/if}
            </div>
          </ScrollArea>
        {:else}
          <div class="p-6">
            <div class="mb-6 flex w-full items-center justify-between">
              <div class="flex items-center gap-4">
                <h2 class="max-w-60 truncate font-bold">{selected_book?.title}</h2>
                <input
                  type="number"
                  min={1}
                  max={selected_book?.pages.length}
                  class="bg-secondary max-w-15 appearance-none rounded-sm text-center"
                  bind:value={pageInput}
                />
              </div>
              <div class="flex gap-4">
                <Button
                  class="size-10 rounded-full"
                  onclick={async () => {
                    isBookList = true;
                    refresh_books();
                  }}
                >
                  <LibraryBigIcon />
                </Button>

                <Button
                  class="size-10 rounded-full"
                  onclick={toggleMode}
                  variant="outline"
                  size="icon"
                >
                  <SunIcon
                    class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
                  />
                  <MoonIcon
                    class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
                  />
                  <span class="sr-only">Toggle theme</span>
                </Button>
                <Button
                  onclick={() => (open = false)}
                  class="size-10 rounded-full"
                  variant="outline"
                >
                  <ChevronsLeftIcon class="size-[1.2rem]" />
                </Button>
              </div>
            </div>
            {#key pageInput}
              <Editor
                {onChessMove}
                content={selected_book?.pages[pageInput - 1]}
                onUpdate={debounce((contents) => {
                  if (selected_book) {
                    selected_book.pages[pageInput - 1] = contents;
                    update_page(selected_book.id, pageInput, contents);
                  }
                }, 100)}
              />
            {/key}
          </div>

          <div class="mt-6 flex justify-center gap-6">
            <Button
              class="px-4"
              variant="outline"
              onclick={() =>
                (pageInput = clamp(pageInput - 1, 1, selected_book?.pages.length ?? 1))}
              ><ChevronLeftIcon />Prev</Button
            >
            <Button
              class="px-4"
              variant="outline"
              onclick={() =>
                (pageInput = clamp(pageInput + 1, 1, selected_book?.pages.length ?? 1))}
              >Next<ChevronRightIcon /></Button
            >
          </div>
        {/if}
      </Resizable.Pane>

      <Resizable.Handle withHandle class="bg-background/10 pointer-events-auto" />

      <Resizable.Pane defaultSize={70} class="pointer-events-none"></Resizable.Pane>
    </Resizable.PaneGroup>
  </div>
{:else}
  <main class="absolute top-30 left-0 text-3xl">
    <button
      class="rounded-r-full bg-black p-3 px-5 text-white"
      onclick={() => {
        if (!selected_book || isBookList) {
          refresh_books();
        }
        open = true;
      }}><BookOpenTextIcon /></button
    >
  </main>
{/if}

<style>
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
  input[type="number"] {
    appearance: textfield;
  }
</style>
