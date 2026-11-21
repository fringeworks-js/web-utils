import requestTimeout from './requestTimeout';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('requestTimeout（ブラウザー）', () => {
  it('delay ミリ秒が過ぎてから、フレームの境目で実行する', async () => {
    const start = performance.now();
    const elapsed = await new Promise<number>((resolve) => {
      requestTimeout(() => resolve(performance.now() - start), 50);
    });
    // フレームの時刻は呼び出した時刻より少し前になることがあるため、少しの誤差を許す
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it('取り消すと実行しない', async () => {
    const callback = vi.fn();
    const cancel = requestTimeout(callback, 20);
    cancel();
    await wait(100);
    expect(callback).not.toHaveBeenCalled();
  });

  it('signal で中断すると実行しない', async () => {
    const callback = vi.fn();
    const controller = new AbortController();
    requestTimeout(callback, 20, { signal: controller.signal });
    controller.abort();
    await wait(100);
    expect(callback).not.toHaveBeenCalled();
  });
});
