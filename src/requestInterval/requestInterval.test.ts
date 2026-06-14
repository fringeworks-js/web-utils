import requestInterval from './requestInterval';

function setupRaf() {
  const rafHandles = new Map<number, ReturnType<typeof setTimeout>>();
  let frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++frameId;
    const tid = setTimeout(() => {
      rafHandles.delete(id);
      cb(performance.now());
    }, 16);
    rafHandles.set(id, tid);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    const tid = rafHandles.get(id);
    if (tid !== undefined) {
      clearTimeout(tid);
      rafHandles.delete(id);
    }
  });
}

describe('requestInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupRaf();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('指定した間隔でコールバックが呼ばれる', async () => {
    const fn = vi.fn();
    requestInterval(fn, 100);
    await vi.advanceTimersByTimeAsync(350);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('immediate: trueで最初にすぐ呼ばれる', async () => {
    const fn = vi.fn();
    requestInterval(fn, 100, { immediate: true });
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('maxCountで呼ばれる回数を制限できる', async () => {
    const fn = vi.fn();
    requestInterval(fn, 100, { maxCount: 2 });
    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stopで停止できる', async () => {
    const fn = vi.fn();
    const stop = requestInterval(fn, 100);
    await vi.advanceTimersByTimeAsync(150);
    stop();
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('argsでコールバックに引数を渡せる', async () => {
    const fn = vi.fn();
    requestInterval(fn, 100, { args: [1, 2], maxCount: 1 });
    await vi.advanceTimersByTimeAsync(120);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });

  it('immediate: trueかつmaxCount: 1のとき最初の1回のみ呼ばれる', async () => {
    const fn = vi.fn();
    const stop = requestInterval(fn, 100, { immediate: true, maxCount: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
