/**
 * `playInterpolator` のオプション
 */
export type PlayInterpolatorOptions = {
  /**
   * 再生する時間（ミリ秒）。`NaN` や負の値は 0（最初のフレームで終わる）として扱う
   *
   * @default 250
   */
  duration?: number;

  /**
   * 経過時間の割合（0 〜 1）に適用するイージング関数。未指定の場合は線形
   */
  ease?: (t: number) => number;

  /**
   * 最後まで再生したとき（`t` が 1 のコールバックの後）に呼ぶ関数。途中で止めた場合は呼ばない
   */
  onFinish?: () => void;

  /**
   * 再生を止めるための AbortSignal
   */
  signal?: AbortSignal;
};
