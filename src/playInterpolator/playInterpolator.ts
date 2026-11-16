import type { PlayInterpolatorOptions } from './types';

/**
 * interpolator（`t` に応じた値を返す関数）を、requestAnimationFrame を使って時間で再生する関数。\
 * フレームごとに経過時間の割合 `t`（0 〜 1）を求め、`callback(interpolator(ease(t)), t)` を呼ぶ。
 * 最初のコールバックは次のフレームで呼ぶ。\
 * 非表示のタブなどでフレームが止まっている間も時間は進み、再開した時はその時点の `t` から続ける
 * @param interpolator `t` に応じた値を返す関数（d3-interpolate や @fringeworks/interpolate のものなど）
 * @param callback フレームごとに、値と経過時間の割合を受け取る関数
 * @param options オプション
 * @returns 停止用関数
 */
export default function playInterpolator<T>(
  interpolator: (t: number) => T,
  callback: (value: T, t: number) => void,
  options: PlayInterpolatorOptions = {},
): () => void {
  const { duration = 250, ease, onFinish, signal } = options;
  if (signal?.aborted) {
    return () => {};
  }

  // NaN もこちらに入り、0として扱われる
  const length = duration > 0 ? duration : 0;
  const start = performance.now();
  let requestId: number | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (requestId !== undefined) {
      cancelAnimationFrame(requestId);
    }
    signal?.removeEventListener('abort', stop);
  };
  const tick = (now: number) => {
    requestId = undefined;
    const t = length > 0 ? Math.min(Math.max((now - start) / length, 0), 1) : 1;
    callback(interpolator(ease ? ease(t) : t), t);
    // コールバックの中で停止された
    if (stopped) {
      return;
    }
    if (t >= 1) {
      signal?.removeEventListener('abort', stop);
      stopped = true;
      onFinish?.();
      return;
    }
    requestId = requestAnimationFrame(tick);
  };

  signal?.addEventListener('abort', stop);
  requestId = requestAnimationFrame(tick);
  return stop;
}
