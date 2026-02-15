import { Dexie, EntityTable } from "dexie";

interface Book {
  id: number;
  title: string;
  coverImage?: Uint8Array;
  pages: string[];
}

const db = new Dexie("chessbookdb") as Dexie & {
  books: EntityTable<Book, "id">;
};

db.version(1).stores({
  books: "++id, title, coverImage, pages",
});

export type { Book };
export { db };
