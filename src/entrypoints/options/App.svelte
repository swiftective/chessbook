<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button/index";
  import { Skeleton } from "$lib/components/ui/skeleton/index";

  import BookCard from "../../components/book-card.svelte";
  import { flip } from "svelte/animate";

  import { get_books, add_book, delete_book } from "../../utils/crud";
  import { last_accessed_study } from "../../utils/storage";

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
    // Add the PNG header manually
    const base64WithHeader = `data:image/png;base64,${rawBase64}`;

    const response = await fetch(base64WithHeader);
    return await response.blob();
  }

  async function blob_to_uint8array(blob: Blob) {
    const buffer = await blob.arrayBuffer(); // read Blob as ArrayBuffer
    const uint8 = new Uint8Array(buffer); // create Uint8Array from that buffer
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
  <header class="bg-secondary/50 flex h-30 items-center justify-between px-10">
    <div class="flex size-18 items-center gap-2">
      <img alt="chessbook" src={LogoImg} class="h-full w-full object-contain" />
      <h1 class="text-3xl font-bold">Chessbook</h1>
    </div>
    <div class="flex items-center gap-5">
      <Button variant="outline" class="rounded-md" onclick={() => fileInput?.click()}>
        Add Book +</Button
      >
      <input class="hidden" type="file" onchange={handleFileChange} bind:this={fileInput} />
      <Button class="size-12 rounded-full" onclick={toggleMode} variant="outline" size="icon">
        <SunIcon
          class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
        />
        <MoonIcon
          class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </div>
  </header>

  <div class="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-6 p-10">
    {#each books as book (book.id)}
      <button
        class="appearance-none"
        onclick={async () => {
          const res = await last_accessed_study.getValue();
          const study_id = res[book.id];
          if (!study_id) return;

          let url = "https://lichess.org" + study_id;
          window.open(url, "_blank");
        }}
        animate:flip={{ duration: 500 }}
      >
        <BookCard
          {...book}
          onDelete={async () => {
            await delete_book(book.id);
            books = await get_books();
          }}
        />
      </button>
    {/each}

    {#if loading}
      {#each Array(5) as _}
        <Skeleton class="rouned-lg aspect-[1/1.414] max-w-[300px]" />
      {/each}
    {/if}
  </div>
</main>
