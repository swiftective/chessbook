<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import PlusIcon from "@lucide/svelte/icons/plus";

  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button/index";
  import { Skeleton } from "$lib/components/ui/skeleton/index";

  import BookCard from "../../components/book-card.svelte";
  import { flip } from "svelte/animate";

  import { get_books, add_book, delete_book, update_recent_books } from "../../utils/crud";
  import { last_accessed_study, recent_book_ids } from "../../utils/storage";

  import LogoImg from "/icon/128.png";

  interface Book {
    id: number;
    title: string;
    coverImage: Uint8Array;
    pages: string[];
  }

  let fileInput: HTMLInputElement;

  let books: Omit<Book, "pages">[] = $state([]);

  let loading = $state(false);

  async function rawbase64_to_blob(rawBase64: string) {
    const base64WithHeader = `data:image/png;base64,${rawBase64}`;
    const response = await fetch(base64WithHeader);
    return await response.blob();
  }

  async function blob_to_uint8array(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    return uint8;
  }

  async function handleFileChange(event: any) {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const json = JSON.parse(e.target.result);
        const blob = await rawbase64_to_blob(json.image_base64);
        const image = await blob_to_uint8array(blob);

        add_book({
          title: json.title,
          pages: json.pages,
          coverImage: image,
        });

        books = await get_books();
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(selectedFile);
  }

  async function startup() {
    const key = setTimeout(() => {
      loading = true;
    }, 50);

    books = await get_books();

    clearTimeout(key);
    loading = false;
  }

  startup();
</script>

<ModeWatcher />
<main class="bg-background min-h-screen">
  <header class="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
    <div class="mx-auto flex h-24 max-w-7xl items-center justify-between px-8">
      <div class="flex items-center gap-4">
        <div
          class="bg-card relative flex size-12 items-center justify-center overflow-hidden rounded-xl border shadow-lg"
        >
          <img
            alt=""
            src={LogoImg}
            class="absolute inset-0 size-full scale-150 object-cover opacity-20 blur-xl"
            aria-hidden="true"
          />
          <img alt="chessbook" src={LogoImg} class="relative z-10 size-9 object-contain" />
        </div>
        <div>
          <h1 class="font-serif text-2xl font-bold tracking-tight">ChessBook</h1>
          <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Your Personal Library
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <Button
          variant="outline"
          class="hover:bg-primary hover:text-primary-foreground gap-2 rounded-full border-2 px-6 font-bold transition-all"
          onclick={() => fileInput?.click()}
        >
          <PlusIcon class="size-4" />
          Import Collection
        </Button>
        <input class="hidden" type="file" onchange={handleFileChange} bind:this={fileInput} />

        <div class="bg-border/50 mx-2 h-8 w-px"></div>

        <Button variant="ghost" size="icon" class="size-11 rounded-full" onclick={toggleMode}>
          <SunIcon class="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon
            class="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
        </Button>
      </div>
    </div>
  </header>

  <div class="mx-auto max-w-7xl px-8 py-12">
    <div class="mb-10 flex items-end justify-between border-b pb-6">
      <div class="space-y-1">
        <h2 class="font-serif text-3xl font-bold">All Books</h2>
        <p class="text-muted-foreground text-sm font-medium">
          {books.length} items in your collection
        </p>
      </div>
    </div>

    <div
      class="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {#each books as book (book.id)}
        <div class="flex flex-col gap-4" animate:flip={{ duration: 500 }}>
          <button
            class="outline-none"
            onclick={async () => {
              const res = await last_accessed_study.getValue();
              const study_id = res[book.id];
              if (!study_id) return;

              update_recent_books(book.id);

              let url = "https://lichess.org" + study_id;
              window.open(url, "_blank");
            }}
          >
            <BookCard
              {...book}
              onDelete={async () => {
                await delete_book(book.id);
                books = await get_books();
              }}
            />
          </button>
          <div class="px-1">
            <h3 class="truncate font-serif text-base leading-none font-bold">{book.title}</h3>
            <p
              class="text-muted-foreground mt-2 text-[10px] font-bold tracking-widest uppercase opacity-70"
            >
              Study Collection
            </p>
          </div>
        </div>
      {/each}

      {#if loading}
        {#each Array(10) as _}
          <div class="flex flex-col gap-4">
            <Skeleton class="aspect-[1/1.414] w-full rounded-lg" />
            <Skeleton class="h-4 w-3/4 rounded-md" />
            <Skeleton class="h-3 w-1/2 rounded-md" />
          </div>
        {/each}
      {/if}
    </div>

    {#if !loading && books.length === 0}
      <div class="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center">
        <div class="bg-muted flex size-24 items-center justify-center rounded-full opacity-50">
          <PlusIcon class="size-12" />
        </div>
        <div class="space-y-2">
          <h3 class="font-serif text-2xl font-bold">Your library is empty</h3>
          <p class="text-muted-foreground max-w-xs text-sm">
            Import your chess books in JSON format to start reading and studying.
          </p>
        </div>
        <Button class="rounded-full px-8" onclick={() => fileInput?.click()}>
          Import your first book
        </Button>
      </div>
    {/if}
  </div>
</main>
