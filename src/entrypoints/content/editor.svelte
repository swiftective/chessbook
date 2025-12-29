<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Editor, mergeAttributes, Mark, Node } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import BubbleMenu from "@tiptap/extension-bubble-menu";
  import UndoIcon from "@lucide/svelte/icons/undo";
  import RedoIcon from "@lucide/svelte/icons/redo";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index";

  // --- PROPS ---
  export let content = ``;

  export let onUpdate = (content: any) => {};

  export let onChessMove: ((move: string) => void) | undefined = (move) => {
    console.log("Move clicked:", move);
  };

  function wrapLinesInParagraphs(text: string) {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p>${line}</p>`)
      .join("\n");
  }

  try {
    content = JSON.parse(content);
  } catch (_) {
    content = wrapLinesInParagraphs(content);
  }

  let element: HTMLElement;
  let bubbleMenuElement: HTMLElement;
  let editor: Editor | undefined;
  let isEditing = false;

  $: if (editor) {
    editor.setEditable(isEditing);
  }

  // --- HELPER: Execute commands even in Read-Only mode ---
  const runAction = (callback: () => void) => {
    if (!editor) return;
    if (isEditing) {
      callback();
    } else {
      editor.setEditable(true);
      callback();
      editor.setEditable(false);
    }
  };

  function handleWindowKeyDown(event: KeyboardEvent) {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key === "z";
    const isRedo = (event.ctrlKey || event.metaKey) && event.key === "y";

    if (!isUndo && !isRedo) return;

    const active = document.activeElement;
    const isInputFocused =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);

    if (isInputFocused) return;

    // Always block browser undo first
    event.preventDefault();
    event.stopPropagation();

    // If editor is not editing, run editor undo/redo
    if (!isEditing) {
      runAction(() => {
        if (isUndo) {
          editor?.chain().undo().run();
        } else {
          editor?.chain().redo().run();
        }
      });
    }
  }

  // --- Regex & Marks ---
  const complexMovePattern = /^(\d*\.{1,3})?([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?|O-O(-O)?)/;
  const numberOnlyPattern = /^\d+\.$/;

  const ChessMove = Mark.create({
    name: "chessMove",
    addAttributes() {
      return {
        active: {
          default: false,
          parseHTML: (element) => element.getAttribute("data-active") === "true",
          renderHTML: (attributes) => ({
            "data-active": attributes.active,
            class: attributes.active ? "chess-move-text active-chess-move" : "chess-move-text",
          }),
        },
      };
    },
    parseHTML() {
      return [{ tag: "span[data-chess-move]" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["span", mergeAttributes(HTMLAttributes, { "data-chess-move": "" }), 0];
    },
  });

  const Callout = Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    defining: true,
    addAttributes() {
      return { type: { default: "green" } };
    },
    parseHTML() {
      return [{ tag: "div[data-callout]" }];
    },
    renderHTML({ node, HTMLAttributes }) {
      const type = node.attrs.type;
      const typeClasses: any = {
        red: "bg-destructive/10 border-destructive text-destructive",
        yellow: "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400",
        green: "bg-primary/10 border-primary text-primary",
      };
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-callout": type,
          class: `callout-box ${typeClasses[type]}`,
        }),
        0,
      ];
    },
  });

  // --- HELPERS ---
  function clearAllActiveMoves(tr: any, schema: any) {
    tr.doc.descendants((node: any, pos: any) => {
      if (node.isText) {
        node.marks.forEach((mark: any) => {
          if (mark.type.name === "chessMove" && mark.attrs.active) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
            tr.addMark(pos, pos + node.nodeSize, schema.marks.chessMove.create({ active: false }));
          }
        });
      }
    });
  }

  function getWordAtPos(doc: any, pos: number) {
    const new_pos = doc.resolve(pos);
    const parent = new_pos.parent;
    const offset = new_pos.parentOffset;
    if (!parent.isTextblock) return null;
    const text = parent.textContent;
    if (!text) return null;
    let start = offset;
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    let end = offset;
    while (end < text.length && !/\s/.test(text[end])) end++;
    if (start === end) return null;
    return {
      text: text.slice(start, end),
      from: new_pos.start() + start,
      to: new_pos.start() + end,
    };
  }

  onMount(() => {
    window.addEventListener("keydown", handleWindowKeyDown);
    if (editor) return;

    editor = new Editor({
      element: element,
      editable: isEditing,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" },
          },
        }),
        ChessMove,
        Callout,
        BubbleMenu.configure({
          element: bubbleMenuElement,
          shouldShow: ({ editor, view }) => {
            return !view.state.selection.empty && !editor.isActive("image");
          },
        }),
      ],
      content: content,
      parseOptions: { preserveWhitespace: "full" },
      onUpdate: () => {
        let content: any = editor?.getJSON();
        content = JSON.stringify(content);
        onUpdate(content);
      },
      onTransaction: () => {
        editor = editor;
      },
      editorProps: {
        handleClick(view, pos, event) {
          if (!isEditing) {
            const linkMark = view.state.doc
              .resolve(pos)
              .marks()
              .find((m) => m.type.name === "link");
            if (linkMark && linkMark.attrs.href) {
              window.open(linkMark.attrs.href, "_blank");
              return true;
            }
          }
          if (isEditing) return false;

          // Chess Logic
          const { state, dispatch } = view;
          const { schema, tr } = state;
          const target = event.target as HTMLElement;
          const clickedActualMoveElement =
            target.closest(".chess-move-text") || target.closest("[data-chess-move]");
          const mark = state.doc
            .resolve(pos)
            .marks()
            .find((m) => m.type.name === "chessMove");

          if (mark) {
            if (!clickedActualMoveElement) return false;
            clearAllActiveMoves(tr, schema);
            const word = getWordAtPos(state.doc, pos);
            if (!word) return false;
            tr.removeMark(word.from, word.to, schema.marks.chessMove);
            tr.addMark(word.from, word.to, schema.marks.chessMove.create({ active: true }));
            dispatch(tr);
            if (onChessMove) onChessMove(state.doc.textBetween(word.from, word.to));
            return true;
          }

          const coords = view.coordsAtPos(pos);
          if (event.clientX > coords.left + 20 || event.clientX < coords.left - 20) return false;
          const current = getWordAtPos(state.doc, pos);
          if (!current) return false;

          let finalFrom = current.from;
          let finalTo = current.to;
          let combinedText = current.text;
          let isValid = false;

          const moveMatch = current.text.match(complexMovePattern);
          const isMove = !!moveMatch;
          const isNumberOnly = numberOnlyPattern.test(current.text);

          if (isMove) {
            isValid = true;
            if (!(moveMatch && moveMatch[1])) {
              const prevWord = getWordAtPos(state.doc, finalFrom - 2);
              if (
                prevWord &&
                numberOnlyPattern.test(prevWord.text) &&
                prevWord.to === finalFrom - 1
              ) {
                finalFrom = prevWord.from;
                combinedText = `${prevWord.text} ${current.text}`;
              }
            }
          } else if (isNumberOnly) {
            const nextWord = getWordAtPos(state.doc, finalTo + 2);
            if (
              nextWord &&
              complexMovePattern.test(nextWord.text) &&
              nextWord.from === finalTo + 1
            ) {
              finalTo = nextWord.to;
              combinedText = `${current.text} ${nextWord.text}`;
              isValid = true;
            }
          }

          if (isValid) {
            clearAllActiveMoves(tr, schema);
            tr.addMark(finalFrom, finalTo, schema.marks.chessMove.create({ active: true }));
            dispatch(tr);
            if (onChessMove) onChessMove(combinedText);
            return true;
          }
          return false;
        },
      },
    });
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleWindowKeyDown);
    if (editor) editor.destroy();
  });
</script>

<div class="relative flex w-full flex-col gap-4">
  <div class="flex justify-end">
    <button
      onclick={() => {
        isEditing = !isEditing;
      }}
      class="rounded-md border px-4 py-2 text-xs font-medium tracking-wider uppercase shadow-sm transition-colors
      {isEditing
        ? 'bg-primary text-primary-foreground'
        : 'bg-background text-muted-foreground hover:bg-muted'}"
    >
      {isEditing ? "Done Editing" : "Edit"}
    </button>
  </div>

  <!-- BUBBLE MENU -->
  <div
    bind:this={bubbleMenuElement}
    class="bubble-menu {editor?.view.state.selection.empty
      ? 'hidden'
      : ''} border-border bg-popover text-popover-foreground flex items-center gap-1 rounded-md border p-1 shadow-md"
  >
    {#if editor}
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleBold().run())}
        class="btn-bubble {editor.isActive('bold') ? 'is-active' : ''}">B</button
      >
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleItalic().run())}
        class="btn-bubble italic {editor.isActive('italic') ? 'is-active' : ''}">I</button
      >
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleUnderline().run())}
        class="btn-bubble underline {editor.isActive('underline') ? 'is-active' : ''}">U</button
      >
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleStrike().run())}
        class="btn-bubble line-through {editor.isActive('strike') ? 'is-active' : ''}">S</button
      >
      <div class="divider mx-1 h-4"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())}
        class="btn-bubble {editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}">H1</button
      >
      <div class="divider mx-1 h-4"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        class="btn-bubble {editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}">H2</button
      >
      <div class="divider mx-1 h-4"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
        class="btn-bubble {editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}">H3</button
      >
      <div class="divider mx-1 h-4"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleMark("chessMove").run())}
        class="btn-bubble {editor.isActive('chessMove') ? 'is-active' : ''}"
      >
        <span class="font-mono text-[10px] font-bold">Move</span>
      </button>
    {/if}
  </div>

  <!-- EDITOR SHELL -->
  <div
    class="editor-shell bg-background flex w-full flex-col overflow-hidden rounded-xl border shadow-sm"
  >
    {#if editor && isEditing}
      <div
        class="bg-muted/30 sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-2 backdrop-blur-sm"
      >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          class="btn-tool {editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}">H1</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          class="btn-tool {editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}">H2</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          class="btn-tool {editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}">H3</button
        >
        <div class="divider"></div>
        <button
          onclick={() => editor?.chain().focus().toggleBold().run()}
          class="btn-tool font-bold {editor.isActive('bold') ? 'is-active' : ''}">B</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleItalic().run()}
          class="btn-tool italic {editor.isActive('italic') ? 'is-active' : ''}">I</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleStrike().run()}
          class="btn-tool line-through {editor.isActive('strike') ? 'is-active' : ''}">S</button
        >
        <div class="divider"></div>
        <button
          title="toggle bulletlist"
          onclick={() => editor?.chain().focus().toggleBulletList().run()}
          class="btn-tool {editor.isActive('bulletList') ? 'is-active' : ''}"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"
            ></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"
            ></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line
              x1="3"
              y1="18"
              x2="3.01"
              y2="18"
            ></line></svg
          >
        </button>
        <button
          title="toggle orderedList"
          onclick={() => editor?.chain().focus().toggleOrderedList().run()}
          class="btn-tool {editor.isActive('orderedList') ? 'is-active' : ''}"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"
            ></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path
              d="M4 10h2"
            ></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg
          >
        </button>
        <button
          title="toggle blockquote"
          onclick={() => editor?.chain().focus().toggleBlockquote().run()}
          class="btn-tool {editor.isActive('blockquote') ? 'is-active' : ''}"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><path
              d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
            ></path><path
              d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
            ></path></svg
          >
        </button>
        <div class="divider"></div>
        <button
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "green" }).run()}
          class="btn-tool font-bold text-emerald-600">Grn</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "yellow" }).run()}
          class="btn-tool font-bold text-amber-600">Yel</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "red" }).run()}
          class="btn-tool text-destructive font-bold">Red</button
        >
        <div class="divider"></div>
        <button onclick={() => editor?.chain().focus().undo().run()} class="btn-tool"
          ><UndoIcon class="h-4" /></button
        >
        <button onclick={() => editor?.chain().focus().redo().run()} class="btn-tool"
          ><RedoIcon class="h-4" /></button
        >
      </div>
    {/if}

    <ScrollArea class="h-[60vh]">
      <div
        bind:this={element}
        class="tiptap-root prose prose-sm max-w-none px-4 py-8 focus:outline-none {isEditing
          ? ''
          : 'cursor-default'}"
      ></div>
    </ScrollArea>
  </div>
</div>

<style lang="postcss">
  @reference "../../assets/index.css";

  :global(.tiptap) {
    @apply outline-none;
  }

  /* --- TYPOGRAPHY --- */
  :global(.tiptap h1) {
    @apply mt-6 mb-4 text-2xl leading-tight font-bold;
  }
  :global(.tiptap h2) {
    @apply mt-5 mb-3 text-xl leading-snug font-semibold;
  }
  :global(.tiptap h3) {
    @apply mt-4 mb-2 text-lg font-semibold;
  }
  :global(.tiptap ul) {
    @apply mb-4 ml-5 list-disc space-y-1;
  }
  :global(.tiptap ol) {
    @apply mb-4 ml-5 list-decimal space-y-1;
  }
  :global(.tiptap blockquote) {
    @apply border-muted-foreground/30 text-muted-foreground my-4 border-l-4 py-1 pl-4 italic;
  }
  :global(.tiptap p) {
    @apply mb-3 leading-relaxed;
  }

  /* --- CHESS NOTATION --- */
  :global(.chess-move-text) {
    @apply bg-secondary text-secondary-foreground m-0.5 my-1 rounded px-1 font-mono font-bold transition-all duration-200;
    white-space: nowrap;
    display: inline-block;
  }
  :global(.tiptap-root:not([contenteditable="true"]) .chess-move-text:hover) {
    @apply bg-primary/20;
  }
  :global(.active-chess-move) {
    @apply border-orange-600 bg-orange-500 text-white;
  }

  /* --- COMPONENTS --- */
  :global(.callout-box) {
    @apply my-4 rounded-r-lg border-l-4 p-4 shadow-sm;
  }

  /* --- BUTTONS --- */
  .btn-tool {
    @apply text-foreground/80 hover:bg-muted flex h-8 w-8 items-center justify-center rounded border border-transparent text-xs font-medium transition-all;
  }
  .btn-tool.is-active {
    @apply bg-primary text-primary-foreground shadow-sm;
  }
  .btn-bubble {
    @apply text-popover-foreground hover:bg-muted/80 flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-all;
  }
  .btn-bubble.is-active {
    @apply bg-primary/20 text-primary;
  }
  .divider {
    @apply bg-border mx-1 h-5 w-px self-center;
  }
</style>
