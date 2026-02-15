<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import { browser } from "#imports";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import ArrowDownToLineIcon from "@lucide/svelte/icons/arrow-down-to-line";
  import { onDestroy } from "svelte";
  import { get_book } from "../utils/crud";
  const LogoImg = browser.runtime.getURL("/icon/128.png");

  interface Props {
    title: string;
    coverImage?: any;
    id: number;
    onDelete?: () => void;
  }

  let { title, coverImage, id, onDelete }: Props = $props();

  // svelte-ignore state_referenced_locally
  const coverImageUrl = coverImage ? getUrl(coverImage) : null;

  async function uint8array_to_rawbase64(rawImage: any): Promise<string> {
    const uint8Array = new Uint8Array(Object.values(rawImage));
    const blob = new Blob([uint8Array], { type: "image/png" });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const rawBase64 = result.split(",")[1];
        resolve(rawBase64);
      };
      reader.onerror = () => reject(new Error("Could not read the image data"));
      reader.readAsDataURL(blob);
    });
  }

  async function download_book() {
    try {
      const book = await get_book(id, true);
      const image_base64 = book.coverImage ? await uint8array_to_rawbase64(book.coverImage) : null;

      const data: any = {
        title: book.title,
        pages: book.pages,
      };

      if (image_base64) {
        data.image_base64 = image_base64;
      }

      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `${book.title.replace(/\s+/g, "_").toLowerCase()}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download book:", error);
    }
  }

  function getUrl(rawImage: any) {
    const uint8Array = new Uint8Array(Object.values(rawImage));
    const blob = new Blob([uint8Array], { type: "image/png" });
    const imageUrl = URL.createObjectURL(blob);
    return imageUrl;
  }

  onDestroy(() => {
    if (coverImageUrl) {
      URL.revokeObjectURL(coverImageUrl);
    }
  });
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger
    disabled={onDelete == undefined ? true : false}
    class="book-shadow group relative aspect-[1/1.414] w-full overflow-hidden rounded-md border border-white/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
  >
    <!-- Logo Background (Always present) -->
    <div class="bg-muted/20 absolute inset-0 flex items-center justify-center">
      <img
        alt=""
        src={LogoImg}
        class="absolute inset-0 size-full scale-150 object-cover opacity-20 blur-xl"
        aria-hidden="true"
      />
      {#if !coverImageUrl}
        <img
          alt="chessbook"
          src={LogoImg}
          class="relative z-10 size-20 object-contain opacity-40 transition-transform duration-700 group-hover:scale-110"
        />
      {/if}
    </div>

    {#if coverImageUrl}
      <img
        src={coverImageUrl}
        alt={`Cover of ${title}`}
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
    {/if}

    <div
      class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80"
    ></div>

    <div class="absolute inset-0 flex flex-col justify-end p-5 text-left">
      <div class="translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
        <h3 class="font-serif text-lg leading-tight font-bold text-white drop-shadow-lg">
          {title}
        </h3>
        <div
          class="bg-primary/80 mt-2 h-0.5 w-0 transition-all duration-500 group-hover:w-full"
        ></div>
      </div>
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52 rounded-xl p-1 shadow-2xl backdrop-blur-md">
    <ContextMenu.Item
      onclick={download_book}
      class="hover:bg-primary hover:text-primary-foreground flex items-center justify-between gap-4 rounded-lg p-2.5 px-4 text-sm font-medium transition-colors"
    >
      Download <ArrowDownToLineIcon class="size-4 opacity-70" />
    </ContextMenu.Item>
    <ContextMenu.Item
      onclick={onDelete}
      class="text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-between gap-4 rounded-lg p-2.5 px-4 text-sm font-medium transition-colors"
    >
      Delete <TrashIcon class="size-4 opacity-70" />
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
