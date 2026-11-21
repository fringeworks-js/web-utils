import requestInterval from './requestInterval';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('requestInterval（ブラウザー）', () => {
  it('delay ミリ秒ごとに、maxCount 回まで実行する', async () => {
    const times: number[] = [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      requestInterval(
        () => {
          times.push(performance.now());
          if (times.length === 3) {
            resolve();
          }
        },
        30,
        { maxCount: 3 },
      );
    });
    await wait(100);
    expect(times).toHaveLength(3);
    // n 回目は、呼び出しから delay × n が過ぎてから実行する。
    // 予定の時刻を基準に次を決めるため、1回が遅れると次との間は delay より短くなることがある。
    // フレームの時刻は呼び出した時刻より少し前になることがあるため、少しの誤差を許す
    times.forEach((time, i) => {
      expect(time - start).toBeGreaterThanOrEqual(30 * (i + 1) - 5);
    });
  });

  it('immediate で、最初の実行を呼び出した時点で行う', () => {
    const callback = vi.fn();
    const stop = requestInterval(callback, 1000, { immediate: true });
    expect(callback).toHaveBeenCalledTimes(1);
    stop();
  });

  it('停止すると、それ以降は実行しない', async () => {
    const callback = vi.fn();
    const stop = requestInterval(callback, 0);
    await wait(50);
    stop();
    const count = callback.mock.calls.length;
    expect(count).toBeGreaterThan(0);
    await wait(50);
    expect(callback).toHaveBeenCalledTimes(count);
  });

  it('signal で中断すると、それ以降は実行しない', async () => {
    const callback = vi.fn();
    const controller = new AbortController();
    requestInterval(callback, 0, { signal: controller.signal });
    await wait(50);
    controller.abort();
    const count = callback.mock.calls.length;
    await wait(50);
    expect(callback).toHaveBeenCalledTimes(count);
  });
});
