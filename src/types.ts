/**
 * CSSカスタムプロパティ(変数)
 */
export type CSSCustomProperties = {
  [key: `--${string}`]: string | undefined;
};
