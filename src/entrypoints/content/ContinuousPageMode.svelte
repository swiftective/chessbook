<script lang="ts">
  import Editor from "./editor.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";
  import { clamp, debounce } from "../../utils/utils";

  interface Props {
    pages: string[];
    currentPage: number;
    bookId: number | string;
    isEditing: boolean;
    onChessMove: (move: string) => void;
    onPageUpdate: (pageIndex: number, contents: string) => void;
    onPageChange: (page: number) => void;
  }

  let { pages, currentPage, bookId, isEditing, onChessMove, onPageUpdate, onPageChange }: Props =
    $props();

  // Virtual scrolling configuration
  const BUFFER_SIZE = 3; // Pages to render before/after visible
  const MAX_VIRTUAL_ITEMS = 10; // Maximum items in DOM at once
  const ESTIMATED_PAGE_HEIGHT = 800; // Average height for spacers

  let viewport = $state<HTMLElement | null>(null);
  let containerRef = $state<HTMLElement | null>(null);
  let pageElements = $state<Map<number, HTMLElement>>(new Map());
  let visiblePages = $state<Set<number>>(new Set());
  let isProgrammaticScroll = $state(false);
  let lastScrolledToPage = $state<number | null>(null);
  let isInitialLoad = $state(true);

  // Store measured heights for accurate spacer calculation separately for each mode
  let pageHeightsReading = $state<Map<number, number>>(new Map());
  let pageHeightsEditing = $state<Map<number, number>>(new Map());
  let activePageHeights = $derived(isEditing ? pageHeightsEditing : pageHeightsReading);

  // Calculate which pages should be rendered
  let renderedPageIndices = $derived.by(() => {
    const visibleArray = Array.from(visiblePages);
    if (visibleArray.length === 0) {
      // No pages visible yet, render around current page
      const start = Math.max(0, currentPage - 1 - BUFFER_SIZE);
      const end = Math.min(pages.length, currentPage - 1 + BUFFER_SIZE + 1);
      return Array.from({ length: end - start }, (_, i) => start + i);
    }
    // ... (rest of the derived logic)
    const minVisible = Math.min(...visibleArray);
    const maxVisible = Math.max(...visibleArray);
    const centerPage = Math.floor((minVisible + maxVisible) / 2);

    // Calculate render window
    let start = Math.max(0, centerPage - BUFFER_SIZE);
    let end = Math.min(pages.length, centerPage + BUFFER_SIZE + 1);

    // Ensure we don't exceed MAX_VIRTUAL_ITEMS
    if (end - start > MAX_VIRTUAL_ITEMS) {
      if (centerPage - start > BUFFER_SIZE) {
        start = centerPage - BUFFER_SIZE;
        end = Math.min(pages.length, start + MAX_VIRTUAL_ITEMS);
      } else {
        end = start + MAX_VIRTUAL_ITEMS;
      }
    }

    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  // Lock scroll position to current page when editing mode is toggled
  let prevIsEditing = $derived(isEditing);
  $effect(() => {
    if (isEditing !== prevIsEditing) {
      prevIsEditing = isEditing;
      const targetIndex = currentPage - 1;
      const element = pageElements.get(targetIndex);

      if (element) {
        isProgrammaticScroll = true;
        // Wait for next tick so DOM updates new heights and spacers
        setTimeout(() => {
          element.scrollIntoView({
            behavior: "auto",
            block: "start",
          });
          // Reset after short delay
          setTimeout(() => {
            isProgrammaticScroll = false;
          }, 100);
        }, 0);
      }
    }
  });

  // Handle scrolling to current page when it changes from outside
  $effect(() => {
    if (currentPage !== lastScrolledToPage && !isProgrammaticScroll) {
      const targetIndex = currentPage - 1;
      const element = pageElements.get(targetIndex);

      if (element) {
        isProgrammaticScroll = true;
        const wasInitialLoad = isInitialLoad;
        lastScrolledToPage = currentPage;

        element.scrollIntoView({
          behavior: wasInitialLoad ? "auto" : "smooth",
          block: "start",
        });

        if (wasInitialLoad) isInitialLoad = false;

        // Reset programmatic scroll flag after animation
        setTimeout(
          () => {
            isProgrammaticScroll = false;
          },
          wasInitialLoad ? 50 : 1000,
        );
      } else if (renderedPageIndices.indexOf(targetIndex) === -1) {
        // If target page is not rendered, we need to force it to render
        visiblePages = new Set([targetIndex]);
      }
    }
  });

  // Track visible pages using IntersectionObserver
  $effect(() => {
    if (!containerRef || !viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const pageIndex = parseInt(entry.target.getAttribute("data-page-index") || "-1");
          if (pageIndex === -1) return;

          if (entry.isIntersecting) {
            if (!visiblePages.has(pageIndex)) {
              visiblePages.add(pageIndex);
              changed = true;
            }
          } else {
            if (visiblePages.has(pageIndex)) {
              visiblePages.delete(pageIndex);
              changed = true;
            }
          }
        });

        if (changed) {
          visiblePages = new Set(visiblePages); // Trigger reactivity

          // Determine current page from visible pages
          if (visiblePages.size > 0 && !isProgrammaticScroll) {
            const visibleArray = Array.from(visiblePages).sort((a, b) => a - b);
            // Use the first visible page as current (top-most)
            const newPage = visibleArray[0] + 1;
            if (newPage !== currentPage) {
              lastScrolledToPage = newPage;
              onPageChange(newPage);
            }
          }
        }
      },
      {
        root: viewport,
        threshold: 0.1, // Page is considered visible when 10% is in view
      },
    );

    // Observe all page containers
    const elementsToObserve = Array.from(pageElements.values());
    elementsToObserve.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  });

  // Debounced page update handler
  const handlePageUpdate = debounce((pageIndex: number, contents: string) => {
    onPageUpdate(pageIndex, contents);
  }, 100);

  // Action to register page elements for intersection observer
  function registerPageElement(node: HTMLElement, index: number) {
    pageElements.set(index, node);
    pageElements = new Map(pageElements);

    let currentEditingState = isEditing;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Fast-path height measurement without layout thrashing
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        // Check if editing state changed during the measurement frame
        const isNowEditing = isEditing;
        if (isNowEditing) {
          pageHeightsEditing.set(index, height);
          pageHeightsEditing = new Map(pageHeightsEditing);
        } else {
          pageHeightsReading.set(index, height);
          pageHeightsReading = new Map(pageHeightsReading);
        }
      }
    });
    resizeObserver.observe(node);

    return {
      destroy() {
        pageElements.delete(index);
        pageElements = new Map(pageElements);
        resizeObserver.disconnect();
      },
    };
  }
  // Calculate top and bottom spacer heights based on active measurements
  let topSpacerHeight = $derived.by(() => {
    if (renderedPageIndices.length === 0 || renderedPageIndices[0] === 0) return 0;
    let height = 0;
    for (let i = 0; i < renderedPageIndices[0]; i++) {
      height += activePageHeights.get(i) || ESTIMATED_PAGE_HEIGHT;
    }
    return height;
  });

  let bottomSpacerHeight = $derived.by(() => {
    if (renderedPageIndices.length === 0) return 0;
    const lastRendered = renderedPageIndices[renderedPageIndices.length - 1];
    if (lastRendered >= pages.length - 1) return 0;
    let height = 0;
    for (let i = lastRendered + 1; i < pages.length; i++) {
      height += activePageHeights.get(i) || ESTIMATED_PAGE_HEIGHT;
    }
    return height;
  });
</script>

<ScrollArea class="min-h-0 flex-1" bind:viewportRef={viewport}>
  <div bind:this={containerRef} class="flex flex-col">
    <!-- Spacer for pages not yet rendered (top) -->
    {#if topSpacerHeight > 0}
      <div style="height: {topSpacerHeight}px"></div>
    {/if}

    {#each renderedPageIndices as pageIndex (pageIndex)}
      {@const capturedIndex = pageIndex}
      {@const capturedBookId = bookId}
      <div
        use:registerPageElement={capturedIndex}
        data-page-index={capturedIndex}
        class="page-container border-border/50 min-h-[50vh] border-b p-6 last:border-b-0"
      >
        <div class="text-muted-foreground mb-4 text-xs font-bold tracking-widest uppercase">
          Page {capturedIndex + 1} of {pages.length}
        </div>
        <Editor
          {onChessMove}
          bind:isEditing
          content={pages[capturedIndex] || ""}
          onUpdate={(contents) => {
            handlePageUpdate(capturedIndex, contents);
          }}
        />
      </div>
    {/each}

    <!-- Spacer for pages not yet rendered (bottom) -->
    {#if bottomSpacerHeight > 0}
      <div
        style="height: {bottomSpacerHeight}px"
        class="bg-muted/30 text-muted-foreground flex items-center justify-center text-sm"
      >
        <span>More pages below...</span>
      </div>
    {/if}
  </div>
</ScrollArea>

<style>
  .page-container {
    scroll-margin-top: 1rem;
  }
</style>
