<script>
  import * as Resizable from "$lib/components/ui/resizable/index";
  import Editor from "./editor.svelte";

  import { fly } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";

  import { get_books, get_book, update_page } from "../../utils/crud";

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

  import { last_accessed_study, last_accessed_book } from "../../utils/storage";

  import { Button } from "$lib/components/ui/button/index";
  import BookCard from "../../components/book-card.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { clamp, debounce } from "../../utils/utils";
  import { onDestroy } from "svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";

  let el = $state(null);

  let theme = $state("dark");

  // ContentUI open state
  let open = $state(false);

  /** @type {Omit<import('../../utils/db').Book, 'coverImage'>} **/
  let selected_book = $state();
  let pageInput = $state(1);

  /** @type {import('../../utils/storage').LastAccessBook } **/
  let local_last_accessed_book = $state({});
  /** @type {import('../../utils/storage').LastAccessStudy } **/
  let local_last_accessed_study = $state({});

  // BookList State
  let books = $state([]);
  let isBookList = $state(false);
  let loading = $state(false);
  let refreshSpin = $state(false);

  function toggleMode() {
    if (theme == "dark") {
      el.parentNode.classList.remove("dark");
      theme = "light";
    } else {
      el.parentNode.classList.add("dark");
      theme = "dark";
    }
  }

  function firstChessNotation(text) {
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

  function onChessMove(bookMove) {
    try {
      const fen = document.querySelector("[data-fen]").getAttribute("data-fen");
      const chess = new Chess(fen);
      let move = chess.move(firstChessNotation(bookMove));

      document.dispatchEvent(
        new CustomEvent("UI_COMMAND", {
          detail: { action: "MAKE_MOVE", params: { uci: move.lan } },
        }),
      );
    } catch (_) {}
  }

  function current_study_id() {
    const url = new URL(window.location.href);
    const study_id = url.pathname;
    return study_id;
  }

  async function startup() {
    local_last_accessed_book = await last_accessed_book.getValue();
    local_last_accessed_study = await last_accessed_study.getValue();

    const current_last_accessed_book = local_last_accessed_book[current_study_id()];

    if (!current_last_accessed_book) return;

    const { book_id, page } = current_last_accessed_book;

    const book = await get_book(book_id);

    if (!book) return;

    selected_book = book;

    // set the page number
    if (page) {
      pageInput = page;
    }
  }

  // sync data
  const interval_key = setInterval(() => {
    if (selected_book && open) {
      last_accessed_study.setValue(local_last_accessed_study);
      last_accessed_book.setValue(local_last_accessed_book);
    }
  }, 3000);

  $effect(() => {
    const curr_study_id = current_study_id();
    const res = local_last_accessed_book[curr_study_id];
    if (!selected_book || !res || !open) return;
    res.page = pageInput;
  });

  onDestroy(() => {
    clearInterval(interval_key);
  });

  startup();
</script>

{#if open}
  <div
    bind:this={el}
    class="pointer-events-none absolute inset-y-18 left-0 z-50 w-full"
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
                    selected_book = curr_book;
                    let curr_study_id = current_study_id();
                    pageInput = 1;
                    local_last_accessed_book[curr_study_id] = {
                      book_id: selected_book.id,
                      page: pageInput,
                    };
                    local_last_accessed_study[book.id] = curr_study_id;
                    isBookList = false;
                  }}
                  animate:flip={{ duration: 500 }}
                >
                  <BookCard {...book} />
                </button>
              {/each}

              {#if loading}
                {#each Array(5) as _}
                  <Skeleton class="rouned-lg aspect-[1/1.414] max-w-[300px]" />
                {/each}
              {/if}
            </div>
          </ScrollArea>
        {:else}
          <div class="p-6">
            <div class="mb-6 flex w-full items-center justify-between">
              <div class="flex items-center gap-4">
                <h2 class="max-w-60 truncate font-bold">{selected_book.title}</h2>
                <input
                  type="number"
                  min={1}
                  max={selected_book.pages.length}
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
                content={selected_book.pages[pageInput - 1]}
                onUpdate={debounce((contents) => {
                  selected_book.pages[pageInput - 1] = contents;
                  update_page(selected_book.id, pageInput, contents);
                }, 100)}
              />
            {/key}
          </div>

          <div class="mt-6 flex justify-center gap-6">
            <Button
              class="px-4"
              variant="outline"
              onclick={() => (pageInput = clamp(pageInput - 1, 1, selected_book.pages.length))}
              ><ChevronLeftIcon />Prev</Button
            >
            <Button
              class="px-4"
              variant="outline"
              onclick={() => (pageInput = clamp(pageInput + 1, 1, selected_book.pages.length))}
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
