<script lang="ts">
  import SinglePageMode from "./SinglePageMode.svelte";
  import ContinuousPageMode from "./ContinuousPageMode.svelte";

  import { fly, fade } from "svelte/transition";
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
  import Edit3Icon from "@lucide/svelte/icons/edit-3";
  import CheckIcon from "@lucide/svelte/icons/check";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import ColumnsIcon from "@lucide/svelte/icons/gallery-vertical";

  import { type Book } from "../../utils/db";
  import {
    type LastAccessBook,
    type LastAccessStudy,
    last_accessed_study,
    last_accessed_book,
    sidebar_width,
    view_mode,
  } from "../../utils/storage";

  import { Button } from "$lib/components/ui/button/index";
  import BookCard from "../../components/book-card.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { clamp, debounce } from "../../utils/utils";
  import { onDestroy, untrack } from "svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";

  let sidebarWidth = $state(400);
  let isResizing = $state(false);
  let el = $state<HTMLElement | null>(null);

  // View mode state: 'single' or 'continuous'
  let viewMode = $state<"single" | "continuous">("single");

  function startResizing(e: MouseEvent) {
    isResizing = true;
    e.preventDefault();
  }

  function stopResizing() {
    isResizing = false;
    sidebar_width.setValue(sidebarWidth);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    // The sidebar starts at left:0, so its width is just the mouse's X position
    const newWidth = Math.max(300, Math.min(window.innerWidth * 0.6, e.clientX));
    sidebarWidth = newWidth;
  }

  $effect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  });

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
  let isEditing = $state(false);

  let selected_book = $state<Omit<Book, "coverImage"> | undefined>();
  let pageInput = $state(1);

  let local_last_accessed_book = $state<LastAccessBook>({});
  let local_last_accessed_study = $state<LastAccessStudy>({});

  // BookList State
  let books = $state<Omit<Book, "pages">[]>([]);
  let isBookList = $state(false);
  let loading = $state(false);

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

  async function refresh_books() {
    books = [];
    loading = true;

    // Ensure at least one full rotation for the animation
    const startTime = Date.now();
    const fetchedBooks = await get_books();
    const elapsed = Date.now() - startTime;
    const minSpin = 1000;

    if (elapsed < minSpin) {
      await new Promise((r) => setTimeout(r, minSpin - elapsed));
    }

    books = fetchedBooks.reverse();
    loading = false;
  }

  function onChessMove(bookMove: string) {
    try {
      const fen_el = document.querySelector("[data-fen]");

      if (fen_el == undefined) {
        alert(
          "To use this feature, please enable 'Engine Moves' on Lichess. You can find the button (marked with an 'x') directly above the move list/analysis tree.",
        );
        return;
      }

      const fen = fen_el.getAttribute("data-fen");
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

  function setViewMode(mode: typeof viewMode) {
    viewMode = mode;
    view_mode.setValue(mode);
  }

  async function startup() {
    local_last_accessed_book = await last_accessed_book.getValue();
    local_last_accessed_study = await last_accessed_study.getValue();
    sidebarWidth = await sidebar_width.getValue();
    viewMode = await view_mode.getValue();
  }

  // sync data
  const interval_key = setInterval(() => {
    if (selected_book && open) {
      last_accessed_study.setValue($state.snapshot(local_last_accessed_study));
      last_accessed_book.setValue($state.snapshot(local_last_accessed_book));
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={el}
    class="fixed inset-y-0 left-0 z-999999 flex overscroll-contain"
    style="width: {sidebarWidth}px;"
    transition:fly={{ x: -100, duration: 400, easing: quintOut }}
  >
    <div
      class="bg-background relative flex h-full w-full flex-col overflow-hidden border-r shadow-2xl"
    >
      <div class="flex h-full flex-col overflow-hidden">
        {#if isBookList || !selected_book}
          <div
            class="bg-secondary/30 flex shrink-0 items-center justify-between border-b px-6 py-4 backdrop-blur-md"
          >
            <div class="flex items-center gap-2">
              <LibraryBigIcon class="text-primary size-5" />
              <h2 class="text-sm font-bold tracking-tight uppercase">Library</h2>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full"
                onclick={refresh_books}
              >
                <RefreshIcon class="size-4 {loading ? 'animate-spin' : ''}" />
              </Button>
              {#if selected_book}
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 rounded-full"
                  onclick={() => {
                    isBookList = false;
                  }}
                >
                  <CancelIcon class="size-4" />
                </Button>
              {/if}
              <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full"
                onclick={() => (open = false)}
              >
                <ChevronsLeftIcon class="size-4" />
              </Button>
            </div>
          </div>
          <ScrollArea class="min-h-0 flex-1">
            <div class="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
              {#each books as book (book.id)}
                <button
                  class="group relative text-left outline-none"
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
                {#each Array(4) as _}
                  <Skeleton class="aspect-[1/1.414] w-full rounded-lg" />
                {/each}
              {/if}
            </div>
          </ScrollArea>
        {:else}
          <div
            class="bg-secondary/30 flex shrink-0 items-center justify-between border-b px-6 py-4 backdrop-blur-md"
          >
            <div class="flex-1 overflow-hidden">
              <h2 class="truncate font-serif text-lg leading-none font-bold">
                {selected_book?.title}
              </h2>
              <div class="mt-1 flex items-center gap-2">
                <span
                  class="text-primary font-serif text-[9px] font-bold tracking-widest uppercase"
                >
                  {isEditing ? "Editing" : "Reading"}
                </span>
                <span class="bg-border h-2 w-px"></span>
                <p class="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  Page {pageInput} of {selected_book?.pages.length}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <Button
                variant={isEditing ? "default" : "ghost"}
                size="icon"
                class="size-8 rounded-full transition-all {isEditing
                  ? 'bg-primary scale-110 shadow-lg'
                  : ''}"
                onclick={() => (isEditing = !isEditing)}
                title={isEditing ? "Finish Editing" : "Edit Page"}
              >
                {#if isEditing}
                  <CheckIcon class="size-4" />
                {:else}
                  <Edit3Icon class="size-4" />
                {/if}
              </Button>

              <div class="bg-border mx-1 h-4 w-px"></div>

              <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full"
                onclick={async () => {
                  isBookList = true;
                  refresh_books();
                }}
              >
                <LibraryBigIcon class="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full"
                onclick={() => setViewMode(viewMode === "single" ? "continuous" : "single")}
                title={viewMode === "single"
                  ? "Switch to Continuous Mode"
                  : "Switch to Single Page Mode"}
              >
                {#if viewMode === "single"}
                  <ColumnsIcon class="size-4" />
                {:else}
                  <FileTextIcon class="size-4" />
                {/if}
              </Button>

              <Button variant="ghost" size="icon" class="size-8 rounded-full" onclick={toggleMode}>
                <SunIcon
                  class="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                />
                <MoonIcon
                  class="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full"
                onclick={() => (open = false)}
              >
                <ChevronsLeftIcon class="size-4" />
              </Button>
            </div>
          </div>

          {#if viewMode === "single"}
            <SinglePageMode
              pageContent={selected_book?.pages[pageInput - 1] || ""}
              pageNumber={pageInput}
              totalPages={selected_book?.pages.length ?? 0}
              bookId={selected_book?.id}
              {isEditing}
              {onChessMove}
              onPageUpdate={(contents) => {
                if (selected_book) {
                  const finalIndex = pageInput - 1;
                  if (finalIndex >= 0 && finalIndex < selected_book.pages.length) {
                    selected_book.pages[finalIndex] = contents;
                    update_page(selected_book.id, pageInput, contents);
                  }
                }
              }}
            />
          {:else}
            <ContinuousPageMode
              pages={selected_book?.pages || []}
              currentPage={pageInput}
              bookId={selected_book?.id}
              {isEditing}
              {onChessMove}
              onPageUpdate={(pageIndex, contents) => {
                if (selected_book) {
                  if (pageIndex >= 0 && pageIndex < selected_book.pages.length) {
                    selected_book.pages[pageIndex] = contents;
                    update_page(selected_book.id, pageIndex + 1, contents);
                  }
                }
              }}
              onPageChange={(page) => {
                pageInput = clamp(page, 1, selected_book?.pages.length ?? 1);
              }}
            />
          {/if}

          <div
            class="bg-background flex shrink-0 items-center justify-between border-t p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]"
          >
            <Button
              variant="outline"
              size="sm"
              class="h-9 gap-2 rounded-full px-4 font-bold"
              disabled={pageInput <= 1}
              onclick={() =>
                (pageInput = clamp(pageInput - 1, 1, selected_book?.pages.length ?? 1))}
            >
              <ChevronLeftIcon class="size-4" />
              Prev
            </Button>
            <div class="flex items-center gap-2">
              <div class="relative flex items-center">
                {#key pageInput}
                  <input
                    type="number"
                    min={1}
                    max={selected_book?.pages.length}
                    class="bg-muted focus:bg-background focus:ring-primary w-14 rounded-full border-none py-1.5 text-center text-sm font-bold focus:ring-2 focus:outline-none"
                    value={pageInput}
                    onkeydown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        pageInput = clamp(val, 1, selected_book?.pages.length ?? 1);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onblur={(e) => {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      pageInput = clamp(val, 1, selected_book?.pages.length ?? 1);
                    }}
                  />
                {/key}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-9 gap-2 rounded-full px-4 font-bold"
              disabled={pageInput >= (selected_book?.pages.length ?? 0)}
              onclick={() =>
                (pageInput = clamp(pageInput + 1, 1, selected_book?.pages.length ?? 1))}
            >
              Next
              <ChevronRightIcon class="size-4" />
            </Button>
          </div>
        {/if}
      </div>
    </div>

    <!-- CUSTOM RESIZE HANDLE -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="group relative flex w-1 cursor-col-resize items-center justify-center transition-all hover:w-2"
      onmousedown={startResizing}
    >
      <div
        class="bg-muted-foreground/20 group-hover:bg-primary/40 absolute inset-y-0 w-px transition-all group-hover:w-full"
      ></div>
    </div>
  </div>
{:else}
  <main class="fixed top-24 left-0 z-999999" transition:fade>
    <button
      class="bg-primary text-primary-foreground flex h-12 w-10 items-center justify-center rounded-r-xl shadow-lg transition-all hover:w-14 hover:pl-2"
      onclick={() => {
        if (!selected_book || isBookList) {
          refresh_books();
        }
        open = true;
      }}
    >
      <BookOpenTextIcon class="size-5" />
    </button>
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
