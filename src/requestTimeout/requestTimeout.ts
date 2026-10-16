import type { RequestTimeoutOptions } from './types';

/**
 * setTimeoutの代わりにrequestAnimationFrameを使用して、指定した時間後にコールバック関数を実行する関数。\
 * 実行はフレームの境目で行い、非表示のタブなどでrequestAnimationFrameが止まっている間は実行しない。\
 * `NaN` や負の値は `setTimeout` と同じく0として扱い、`Infinity` の場合は実行しない
 * @param callback コールバック関数
 * @param delay 遅延時間（ミリ秒）
 * @param options オプション
 * @returns キャンセル用関数
 */
export default function requestTimeout(
  callback: () => void,
  delay: number,
  options: RequestTimeoutOptions = {},
): () => void {
  const { signal } = options;
  if (signal?.aborted || delay === Infinity) {
    return () => {};
  }

  // NaN もこちらに入り、0として扱われる
  const wait = delay > 0 ? delay : 0;
  const start = performance.now();
  let requestId: number;

  const cancel = () => {
    cancelAnimationFrame(requestId);
    signal?.removeEventListener('abort', cancel);
  };
  const tick = (now: number) => {
    if (now - start >= wait) {
      signal?.removeEventListener('abort', cancel);
      callback();
    } else {
      requestId = requestAnimationFrame(tick);
    }
  };

  signal?.addEventListener('abort', cancel);
  requestId = requestAnimationFrame(tick);
  return cancel;
}
