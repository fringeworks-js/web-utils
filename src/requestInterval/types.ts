export type RequestIntervalOptions<A extends unknown[]> = {
  /**
   * コールバック関数に渡す引数
   */
  args?: A;

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
   * 実行回数の上限
   *
   * @default Infinity
   */
  maxCount?: number;
};
