import type { RequestIntervalOptions } from './types';

/**
 * setIntervalの代わりにrequestAnimationFrameを使用し繰り返し処理を行う関数
 *
 * @param callback
 * @param delay
 * @param options
 * @returns
 */
export default function requestInterval<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
  options: RequestIntervalOptions<A> = {},
) {
  const { args = [] as A, immediate = false, maxCount = Infinity } = options;

  let requestId: number;
  let last = performance.now();
  let count = 0;

  // 停止用の関数
  const stop = () => {
    if (requestId !== undefined) {
      cancelAnimationFrame(requestId);
    }
  };

  // 即座に実行する場合
  if (immediate && count < maxCount) {
    callback(...args);
    count++;
    if (count >= maxCount) {
      return stop;
    }
  }

  function fnc(now: number) {
    if (now - last >= delay) {
      callback(...args);
      count++;
      last = now;

      // 回数制限に達したら停止
      if (count >= maxCount) {
        stop();
        return;
      }
    }
    requestId = requestAnimationFrame(fnc);
  }

  requestId = requestAnimationFrame(fnc);

  return stop;
}
