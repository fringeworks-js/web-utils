/**
 * 戻り値の型を受け取る側の型から推論する`document.getElementById`。\
 * 型を変換するだけで、実行時に要素の種類は確認しない
 * @param id 要素のid
 * @returns 要素。見つからない場合はnull
 * @example
 * const input: HTMLInputElement | null = getElementById('name');
 * const svg = getElementById<SVGSVGElement>('icon');
 */
export default function getElementById<T extends Element = HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null;
}
