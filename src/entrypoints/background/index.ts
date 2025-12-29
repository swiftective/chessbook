import { browser, defineBackground } from "#imports";
import { db, Book } from "../../utils/db";

type OnComplete = (message: { data?: any; error?: string }) => void;

async function add_book(
  message: {
    action: "add-book";
    data: Omit<Book, "id">;
  },
  on_complete: OnComplete,
) {
  try {
    const id = await db.books.add(message.data);
    on_complete({ data: `${id} is the book` });
  } catch (e) {
    console.warn(e);
  }
}

async function get_books(on_complete: OnComplete) {
  const books = await db.books.toArray();

  const res = books.map(({ id, title, coverImage }) => ({
    id,
    title,
    coverImage,
  }));

  on_complete({
    data: res,
  });
}

async function delete_book(
  message: { action: "delete-book"; data: { id: number } },
  on_complete: OnComplete,
) {
  await db.books.where("id").equals(message.data.id).delete();

  on_complete({ data: `item was deleted` });
}

async function get_book(
  message: { action: "get-book"; data: { id: number; coverImage: boolean } },
  on_complete: OnComplete,
) {
  const results = await db.books.where("id").equals(message.data.id).toArray();

  const book = results[0];

  if (!book) {
    on_complete({ error: "No such book exists!" });
  } else {
    const data: Omit<Book, "coverImage"> & { coverImage?: Uint8Array } = {
      id: results[0].id,
      title: results[0].title,
      pages: results[0].pages,
    };

    if (message.data.coverImage) {
      data["coverImage"] = results[0].coverImage;
    }

    on_complete({ data });
  }
}

async function update_page(
  message: {
    action: "update-page";
    data: { book_id: number; pg_num: number; contents: string };
  },
  on_complete: OnComplete,
) {
  const books = await db.books.where("id").equals(message.data.book_id).toArray();
  const book = books[0];

  const pages = book.pages;

  pages[message.data.pg_num - 1] = message.data.contents;

  db.books.update(message.data.book_id, {
    pages,
  });

  on_complete({ data: "item was updated" });
}

export default defineBackground({
  main() {
    console.log("Background loaded!");

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case "add-book":
          add_book(message, sendResponse);
          return true;

        case "get-books":
          get_books(sendResponse);
          return true;

        case "delete-book":
          delete_book(message, sendResponse);
          return true;

        case "get-book":
          get_book(message, sendResponse);
          return true;

        case "update-page":
          update_page(message, sendResponse);
          return true;

        default:
          break;
      }

      return false;
    });
  },
});
