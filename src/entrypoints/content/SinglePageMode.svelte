<script lang="ts">
  import { fade } from "svelte/transition";
  import Editor from "./editor.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";
  import { clamp, debounce } from "../../utils/utils";

  interface Props {
    pageContent: string;
    pageNumber: number;
    totalPages: number;
    bookId: number | string;
    isEditing: boolean;
    onChessMove: (move: string) => void;
    onPageUpdate: (contents: string) => void;
  }

  let { pageContent, pageNumber, totalPages, bookId, isEditing, onChessMove, onPageUpdate }: Props =
    $props();

  // Scroll animation state
  let reachedBottom = $state(false);
  let scrollSentinel = $state<HTMLElement | null>(null);
  let isScrollable = $state(false);
  let viewport = $state<HTMLElement | null>(null);
  let isActivelyScrollingAtBottom = $state(false);
  let scrollStopTimer: ReturnType<typeof setTimeout>;

  // Intersection Observer for bottom detection
  $effect(() => {
    if (!scrollSentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        reachedBottom = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(scrollSentinel);
    return () => observer.disconnect();
  });

  // Handle active scroll detection for glow effect
  function handleActiveScroll(e: WheelEvent | TouchEvent) {
    if (!reachedBottom || !isScrollable) return;

    let isScrollingDown = false;
    if (e instanceof WheelEvent) {
      isScrollingDown = e.deltaY > 0;
    } else if (e instanceof TouchEvent) {
      isScrollingDown = true;
    }

    if (isScrollingDown) {
      isActivelyScrollingAtBottom = true;
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => {
        isActivelyScrollingAtBottom = false;
      }, 150);
    }
  }

  $effect(() => {
    if (!viewport) return;
    viewport.addEventListener("wheel", handleActiveScroll, { passive: true });
    viewport.addEventListener("touchmove", handleActiveScroll, { passive: true });
    return () => {
      viewport?.removeEventListener("wheel", handleActiveScroll);
      viewport?.removeEventListener("touchmove", handleActiveScroll);
    };
  });

  // Check if content is scrollable
  $effect(() => {
    if (!viewport) return;
    const checkScrollable = () => {
      isScrollable = viewport!.scrollHeight > viewport!.clientHeight + 10;
    };
    checkScrollable();
    const resizeObserver = new ResizeObserver(checkScrollable);
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild as HTMLElement);
    }
    return () => resizeObserver.disconnect();
  });
</script>

<ScrollArea class="relative min-h-0 flex-1" bind:viewportRef={viewport}>
  <div class="p-6">
    {#key pageNumber}
      {@const capturedPage = clamp(pageNumber, 1, totalPages)}
      {@const capturedBookId = bookId}
      <Editor
        {onChessMove}
        bind:isEditing
        content={pageContent}
        onUpdate={debounce((contents: string) => {
          onPageUpdate(contents);
        }, 100)}
      />
    {/key}
    <div bind:this={scrollSentinel} class="h-px w-full"></div>
  </div>

  <!-- Bottom Glow Indicator -->
  {#if isActivelyScrollingAtBottom}
    <div
      transition:fade={{ duration: 150 }}
      class="from-primary/30 pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
    ></div>
  {/if}
</ScrollArea>
