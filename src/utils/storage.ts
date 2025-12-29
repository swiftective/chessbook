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
const last_accessed_book = storage.defineItem<LastAccessBook>("local:last-accessed-book", {
  fallback: {},
});

// from book
const last_accessed_study = storage.defineItem<LastAccessStudy>("local:last-accessed-study", {
  fallback: {},
});

export { last_accessed_book, last_accessed_study };
