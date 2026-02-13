<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Editor, mergeAttributes, Mark, Node } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import BubbleMenu from "@tiptap/extension-bubble-menu";
  import UndoIcon from "@lucide/svelte/icons/undo";
  import RedoIcon from "@lucide/svelte/icons/redo";
  import BoldIcon from "@lucide/svelte/icons/bold";
  import ItalicIcon from "@lucide/svelte/icons/italic";
  import ListIcon from "@lucide/svelte/icons/list";
  import ListOrderedIcon from "@lucide/svelte/icons/list-ordered";
  import QuoteIcon from "@lucide/svelte/icons/quote";
  import Heading1Icon from "@lucide/svelte/icons/heading-1";
  import Heading2Icon from "@lucide/svelte/icons/heading-2";
  import InfoIcon from "@lucide/svelte/icons/info";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import OctagonAlertIcon from "@lucide/svelte/icons/octagon-alert";
  import ChessKnightIcon from "@lucide/svelte/icons/chess-knight";

  // --- PROPS ---
  interface Props {
    content?: string;
    onUpdate?: (content: any) => void;
    onChessMove?: (move: string) => void;
    isEditing?: boolean;
  }

  let {
    content = ``,
    onUpdate = () => {},
    onChessMove = (move) => {
      console.log("Move clicked:", move);
    },
    isEditing = $bindable(false),
  }: Props = $props();

  function wrapLinesInParagraphs(text: string) {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p>${line}</p>`)
      .join("\n");
  }

  const initialContent = (() => {
    try {
      return JSON.parse(content);
    } catch (_) {
      return wrapLinesInParagraphs(content);
    }
  })();

  let element = $state<HTMLElement>();
  let bubbleMenuElement = $state<HTMLElement>();
  let editor = $state.raw<Editor | undefined>();
  let updateTick = $state(0);

  const checkActive = (name: string, attrs?: any) => {
    updateTick;
    return editor?.isActive(name, attrs) ?? false;
  };

  const isSelectionEmpty = () => {
    updateTick;
    return editor?.state.selection.empty ?? true;
  };

  $effect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  });

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
        red: "bg-destructive/5 border-destructive text-destructive",
        yellow: "bg-yellow-500/5 border-yellow-500 text-yellow-700 dark:text-yellow-400",
        green: "bg-primary/5 border-primary text-primary",
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
      content: initialContent,
      parseOptions: { preserveWhitespace: "full" },
      onUpdate: () => {
        let contentJson: any = editor?.getJSON();
        onUpdate(JSON.stringify(contentJson));
      },
      onTransaction: () => {
        updateTick++;
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

<div class="relative flex w-full flex-col">
  <!-- BUBBLE MENU -->
  <div
    bind:this={bubbleMenuElement}
    class="bubble-menu {isSelectionEmpty()
      ? 'hidden'
      : ''} glass border-border flex items-center gap-1 rounded-full p-1 shadow-xl"
  >
    {#if editor}
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleBold().run())}
        class="btn-bubble {checkActive('bold') ? 'is-active' : ''}"
        ><BoldIcon class="size-3.5" /></button
      >
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleItalic().run())}
        class="btn-bubble {checkActive('italic') ? 'is-active' : ''}"
        ><ItalicIcon class="size-3.5" /></button
      >
      <div class="divider mx-0.5 h-3"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())}
        class="btn-bubble {checkActive('heading', { level: 1 }) ? 'is-active' : ''}"
        ><Heading1Icon class="size-3.5" /></button
      >
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        class="btn-bubble {checkActive('heading', { level: 2 }) ? 'is-active' : ''}"
        ><Heading2Icon class="size-3.5" /></button
      >
      <div class="divider mx-0.5 h-3"></div>
      <button
        onclick={() => runAction(() => editor?.chain().focus().toggleMark("chessMove").run())}
        class="btn-bubble {checkActive('chessMove') ? 'is-active' : ''}"
      >
        <ChessKnightIcon class="size-3.5" />
      </button>
    {/if}
  </div>

  <!-- EDITOR SHELL -->
  <div class="editor-shell bg-background/50 relative flex w-full flex-col">
    {#if editor && isEditing}
      <div
        class="glass sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-1 rounded-lg border p-1.5 shadow-lg backdrop-blur-md"
      >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          class="btn-tool {checkActive('heading', { level: 1 }) ? 'is-active' : ''}"
          ><Heading1Icon class="size-4" /></button
        >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          class="btn-tool {checkActive('heading', { level: 2 }) ? 'is-active' : ''}"
          ><Heading2Icon class="size-4" /></button
        >
        <div class="divider"></div>
        <button
          onclick={() => editor?.chain().focus().toggleBold().run()}
          class="btn-tool {checkActive('bold') ? 'is-active' : ''}"
          ><BoldIcon class="size-4" /></button
        >
        <button
          onclick={() => editor?.chain().focus().toggleItalic().run()}
          class="btn-tool {checkActive('italic') ? 'is-active' : ''}"
          ><ItalicIcon class="size-4" /></button
        >
        <div class="divider"></div>
        <button
          title="Bullet List"
          onclick={() => editor?.chain().focus().toggleBulletList().run()}
          class="btn-tool {checkActive('bulletList') ? 'is-active' : ''}"
          ><ListIcon class="size-4" /></button
        >
        <button
          title="Ordered List"
          onclick={() => editor?.chain().focus().toggleOrderedList().run()}
          class="btn-tool {checkActive('orderedList') ? 'is-active' : ''}"
          ><ListOrderedIcon class="size-4" /></button
        >
        <button
          title="Blockquote"
          onclick={() => editor?.chain().focus().toggleBlockquote().run()}
          class="btn-tool {checkActive('blockquote') ? 'is-active' : ''}"
          ><QuoteIcon class="size-4" /></button
        >
        <div class="divider"></div>
        <button
          title="Green Callout"
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "green" }).run()}
          class="btn-tool text-emerald-600"><InfoIcon class="size-4" /></button
        >
        <button
          title="Yellow Callout"
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "yellow" }).run()}
          class="btn-tool text-amber-600"><TriangleAlertIcon class="size-4" /></button
        >
        <button
          title="Red Callout"
          onclick={() => editor?.chain().focus().toggleWrap("callout", { type: "red" }).run()}
          class="btn-tool text-destructive"><OctagonAlertIcon class="size-4" /></button
        >
        <div class="divider ml-auto"></div>
        <button onclick={() => editor?.chain().focus().undo().run()} class="btn-tool"
          ><UndoIcon class="size-4" /></button
        >
        <button onclick={() => editor?.chain().focus().redo().run()} class="btn-tool"
          ><RedoIcon class="size-4" /></button
        >
      </div>
    {/if}

    <div
      bind:this={element}
      class="tiptap-root prose prose-neutral dark:prose-invert max-w-none font-serif focus:outline-none {isEditing
        ? 'min-h-[40vh]'
        : 'cursor-default'}"
    ></div>
  </div>
</div>

<style lang="postcss">
  @reference "../../assets/index.css";

  :global(.tiptap) {
    @apply outline-none;
  }

  /* --- TYPOGRAPHY --- */
  :global(.tiptap h1) {
    @apply mt-8 mb-4 font-serif text-3xl leading-tight font-bold tracking-tight;
  }
  :global(.tiptap h2) {
    @apply mt-6 mb-3 font-serif text-2xl leading-snug font-semibold tracking-tight;
  }
  :global(.tiptap h3) {
    @apply mt-4 mb-2 font-serif text-xl font-semibold;
  }
  :global(.tiptap ul) {
    @apply mb-4 ml-6 list-disc space-y-2;
  }
  :global(.tiptap ol) {
    @apply mb-4 ml-6 list-decimal space-y-2;
  }
  :global(.tiptap blockquote) {
    @apply border-primary/20 bg-primary/5 my-6 rounded-r-lg border-l-4 py-4 pr-4 pl-6 italic;
  }
  :global(.tiptap p) {
    @apply mb-4 text-lg leading-relaxed;
  }

  /* --- CHESS NOTATION --- */
  :global(.chess-move-text) {
    @apply bg-muted/50 text-foreground mx-0.5 inline-block cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 font-mono text-[0.9em] font-bold transition-all duration-200;
  }
  :global(.tiptap-root:not([contenteditable="true"]) .chess-move-text:hover) {
    @apply bg-primary/10 border-primary/30;
  }
  :global(.active-chess-move) {
    @apply bg-primary text-primary-foreground border-primary shadow-sm;
  }

  /* --- COMPONENTS --- */
  :global(.callout-box) {
    @apply my-6 rounded-lg border p-5 shadow-sm;
  }

  /* --- BUTTONS --- */
  .btn-tool {
    @apply text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md border border-transparent transition-all;
  }
  .btn-tool.is-active {
    @apply bg-primary text-primary-foreground shadow-sm;
  }
  .btn-bubble {
    @apply text-foreground/80 hover:bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all;
  }
  .btn-bubble.is-active {
    @apply bg-primary text-primary-foreground;
  }
  .divider {
    @apply bg-border mx-1.5 h-5 w-px self-center opacity-50;
  }
</style>
