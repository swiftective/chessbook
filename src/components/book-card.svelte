<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu/index";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import ArrowDownToLineIcon from "@lucide/svelte/icons/arrow-down-to-line";
  import { onDestroy } from "svelte";
  import { get_book } from "../utils/crud";

  let { title, coverImage, id, onDelete } = $props();

  // svelte-ignore state_referenced_locally
  const coverImageUrl = getUrl(coverImage);

  async function uint8array_to_rawbase64(rawImage: any): Promise<string> {
    // 1. Convert the object values into a real Uint8Array (using your hint)
    const uint8Array = new Uint8Array(Object.values(rawImage));

    // 2. Create the Blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: "image/png" });

    // 3. Use FileReader with the await syntax (wrapped in a Promise)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        // 4. Split to get only the raw Base64 string (no "data:image/png;base64," prefix)
        const rawBase64 = result.split(",")[1];
        resolve(rawBase64);
      };

      reader.onerror = () => reject(new Error("Could not read the image data"));

      // This triggers the binary-to-base64 conversion natively
      reader.readAsDataURL(blob);
    });
  }

  async function download_book() {
    try {
      const book = await get_book(id, true);
      const image_base64 = await uint8array_to_rawbase64(book.coverImage);

      const data = {
        title: book.title,
        pages: book.pages,
        image_base64: image_base64,
      };

      // 1. Convert the data object to a JSON string
      const jsonString = JSON.stringify(data);

      // 2. Create a Blob with the JSON content
      const blob = new Blob([jsonString], { type: "application/json" });

      // 3. Create a temporary URL for the Blob
      const url = URL.createObjectURL(blob);

      // 4. Create a hidden 'a' element to trigger the download
      const link = document.createElement("a");
      link.href = url;

      // Set the filename (replaces spaces with underscores for safety)
      const fileName = `${book.title.replace(/\s+/g, "_").toLowerCase()}.json`;
      link.download = fileName;

      // 5. Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 6. Clean up the URL to free up memory
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download book:", error);
    }
  }

  function getUrl(rawImage: any) {
    // 2. Convert the object values into a real Uint8Array
    // Object.values() extracts the numbers [137, 80, 78, ...] in order
    const uint8Array = new Uint8Array(Object.values(rawImage));

    // 3. Create the Blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: "image/png" });

    // 4. Generate a URL for your <img> tag
    const imageUrl = URL.createObjectURL(blob);

    return imageUrl;
  }

  onDestroy(() => {
    URL.revokeObjectURL(coverImageUrl);
  });
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger
    disabled={onDelete == undefined ? true : false}
    class={`
      group border-border relative
      aspect-[1/1.414] w-full max-w-[300px]
      overflow-hidden
      rounded-lg border
      bg-[hsl(var(--card))]
      shadow-sm transition-all duration-300
      hover:-translate-y-1 hover:shadow-xl `}
  >
    <img
      src={coverImageUrl}
      alt={`Cover of ${title}`}
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      loading="lazy"
    />

    <div
      class="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90"
    ></div>

    <div class="relative z-10 flex h-full flex-col justify-end p-6 text-left">
      <h3 class="mb-1 text-xl leading-tight font-bold tracking-tight text-white drop-shadow-md">
        {title}
      </h3>
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-52">
    <ContextMenu.Item
      onclick={download_book}
      class="flex items-center justify-between gap-4 p-2 px-5 text-lg"
    >
      Download<ArrowDownToLineIcon class="size-5" />
    </ContextMenu.Item>
    <ContextMenu.Item
      onclick={onDelete}
      class="text-destructive flex items-center justify-between gap-4 p-2 px-5 text-lg"
    >
      Delete book<TrashIcon class="text-destructive size-5" />
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
