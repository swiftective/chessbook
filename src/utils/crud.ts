import { browser } from "#imports";
import { Book } from "./db";

async function get_book(id: number, coverImage?: boolean) {
  const message = await browser.runtime.sendMessage({
    action: "get-book",
    data: { id, coverImage: coverImage ? true : false },
  });

  if (message.data) {
    return message.data;
  }
}

async function get_books() {
  const message = await browser.runtime.sendMessage({
    action: "get-books",
  });

  return message.data;
}

async function add_book(book: Omit<Book, "id">) {
  const message = await browser.runtime.sendMessage({
    action: "add-book",
    data: book,
  });
}

async function delete_book(id: number) {
  const message = await browser.runtime.sendMessage({
    action: "delete-book",
    data: { id },
  });
}

async function update_page(book_id: number, pg_num: number, contents: string) {
  const message = await browser.runtime.sendMessage({
    action: "update-page",
    data: { book_id, pg_num, contents },
  });
}

export { get_books, get_book, add_book, delete_book, update_page };
