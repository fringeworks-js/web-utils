import type { RequestIntervalOptions } from './types';

/**
 * setIntervalの代わりにrequestAnimationFrameを使用し繰り返し処理を行う関数。\
 * 実行はフレームの境目で行い、非表示のタブなどでrequestAnimationFrameが止まっている間は実行しない。
 * 再開した時は、止まっていた間の分をまとめて実行せず、1回だけ実行する。\
 * `NaN` や負の値は `setInterval` と同じく0（毎フレーム）として扱い、`Infinity` の場合は実行しない
 * （`immediate` による初回の実行は行う）
 * @param callback コールバック関数
 * @param delay 実行の間隔（ミリ秒）
 * @param options オプション
 * @returns 停止用関数
 */
export default function requestInterval(
  callback: () => void,
  delay: number,
  options: RequestIntervalOptions = {},
): () => void {
  const { immediate = false, maxCount = Infinity, signal } = options;
  const limit = Number.isNaN(maxCount) ? Infinity : maxCount;
  if (signal?.aborted || !(limit > 0)) {
    return () => {};
  }

  // NaN もこちらに入り、0として扱われる
  const wait = delay > 0 ? delay : 0;
  let requestId: number | undefined;
  let stopped = false;
  let count = 0;
  let last = performance.now();

  const stop = () => {
    stopped = true;
    if (requestId !== undefined) {
      cancelAnimationFrame(requestId);
    }
    signal?.removeEventListener('abort', stop);
  };
  // コールバックを実行し、続けるかを返す
  const run = () => {
    callback();
    count++;
    // 回数制限に達したか、コールバックの中で停止された
    if (count >= limit || stopped) {
      stop();
      return false;
    }
    return true;
  };
  const tick = (now: number) => {
    if (now - last >= wait) {
      // 予定の時刻を基準に進め、間隔のずれが積み重ならないようにする。
      // 大きく遅れた場合は、まとめて実行せずに今の時刻から数え直す
      last += wait;
      if (now - last >= wait) {
        last = now;
      }
      if (!run()) {
        return;
      }
    }
    requestId = requestAnimationFrame(tick);
  };

  signal?.addEventListener('abort', stop);
  if (immediate && !run()) {
    return stop;
  }
  if (wait !== Infinity) {
    requestId = requestAnimationFrame(tick);
  }
  return stop;
}
