import { storage } from "#imports";

export type LastAccessBook = {
  [study_id: string]: {
    book_id: number;
    page: number;
  };
};

export type LastAccessStudy = {
  [book_id: number]: string;
};

// from study
export const last_accessed_book = storage.defineItem<LastAccessBook>("local:last-accessed-book", {
  fallback: {},
});

// from book
export const last_accessed_study = storage.defineItem<LastAccessStudy>(
  "local:last-accessed-study",
  {
    fallback: {},
  },
);

export const recent_book_ids = storage.defineItem<number[]>("local:recent-book-ids", {
  fallback: [],
});

export const sidebar_width = storage.defineItem<number>("local:sidebar-width", {
  fallback: 400,
});

export const view_mode = storage.defineItem<"single" | "continuous">("local:view-mode", {
  fallback: "single",
});
