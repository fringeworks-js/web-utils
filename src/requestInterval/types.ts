export type RequestIntervalOptions = {
  /**
   * 初回を即時に実行するか
   *
   * - false: 最初の実行はdelay後
   * - true: 最初の実行は即時
   *
   * @default false
   */
  immediate?: boolean;

  /**
   * 実行回数の上限。0以下の場合は実行しない。`NaN` の場合は上限なしとして扱う
   *
   * @default Infinity
   */
  maxCount?: number;

  /**
   * 繰り返しを停止するための AbortSignal
   */
  signal?: AbortSignal;
};
