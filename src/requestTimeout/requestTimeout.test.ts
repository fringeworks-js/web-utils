import requestTimeout from './requestTimeout';

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

describe('requestTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupRaf();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('指定した時間後にコールバックが呼ばれる', async () => {
    const fn = vi.fn();
    requestTimeout(fn, 200);
    await vi.advanceTimersByTimeAsync(190);
    expect(fn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancelでコールバックをキャンセルできる', async () => {
    const fn = vi.fn();
    const cancel = requestTimeout(fn, 200);
    await vi.advanceTimersByTimeAsync(100);
    cancel();
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('コールバックは1回だけ呼ばれる', async () => {
    const fn = vi.fn();
    requestTimeout(fn, 100);
    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
