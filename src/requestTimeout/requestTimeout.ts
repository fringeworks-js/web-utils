/**
 * setTimeoutの代わりにrequestAnimationFrameを使用して、指定した時間後にコールバック関数を実行する関数
 * @param callback
 * @param timeout
 */
export default function requestTimeout(callback: () => void, timeout: number) {
  let requestId;
  const start = performance.now();
  function fnc(now) {
    if (now - start >= timeout) {
      callback();
    } else {
      requestId = requestAnimationFrame(fnc);
    }
  }
  requestId = requestAnimationFrame(fnc);

  return () => {
    cancelAnimationFrame(requestId);
  };
}
