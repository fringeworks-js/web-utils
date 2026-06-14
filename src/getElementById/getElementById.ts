/**
 * ジェネリクス付きのgetElementById
 * @param id
 * @returns
 */
export default function getElementById<T extends HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T;
}
