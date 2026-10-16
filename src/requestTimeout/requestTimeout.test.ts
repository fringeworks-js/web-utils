import requestTimeout from './requestTimeout';

/**
 * requestAnimationFrame と performance.now を差し替え、
 * `frame(now)` で任意の時刻のフレームを進められるようにする
 */
function setupFrames() {
  let callbacks = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let current = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => current);
  const requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    callbacks.set(++frameId, cb);
    return frameId;
  });
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    callbacks.delete(id);
  });
  return {
    requestAnimationFrame,
    frame(now: number) {
      current = now;
      const pending = callbacks;
      callbacks = new Map();
      pending.forEach((cb) => cb(now));
    },
  };
}

describe('requestTimeout', () => {
  let frames: ReturnType<typeof setupFrames>;

  beforeEach(() => {
    frames = setupFrames();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('指定した時間後のフレームでコールバックが呼ばれる', () => {
    const fn = vi.fn();
    requestTimeout(fn, 200);
    frames.frame(190);
    expect(fn).not.toHaveBeenCalled();
    frames.frame(205);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('コールバックは1回だけ呼ばれる', () => {
    const fn = vi.fn();
    requestTimeout(fn, 100);
    frames.frame(100);
    frames.frame(200);
    frames.frame(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('返り値の関数でキャンセルできる', () => {
    const fn = vi.fn();
    const cancel = requestTimeout(fn, 200);
    frames.frame(100);
    cancel();
    frames.frame(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it('NaNや負の値は0として扱い、次のフレームで呼ばれる', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    requestTimeout(fn1, NaN);
    requestTimeout(fn2, -100);
    frames.frame(0);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('Infinityの場合は実行せず、フレームも要求しない', () => {
    const fn = vi.fn();
    requestTimeout(fn, Infinity);
    expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    frames.frame(1e9);
    expect(fn).not.toHaveBeenCalled();
  });

  describe('signal', () => {
    it('abortするとキャンセルされる', () => {
      const fn = vi.fn();
      const controller = new AbortController();
      requestTimeout(fn, 200, { signal: controller.signal });
      frames.frame(100);
      controller.abort();
      frames.frame(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('abort済みの場合は実行せず、フレームも要求しない', () => {
      const fn = vi.fn();
      const controller = new AbortController();
      controller.abort();
      requestTimeout(fn, 100, { signal: controller.signal });
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
      frames.frame(200);
      expect(fn).not.toHaveBeenCalled();
    });

    it('実行後とキャンセル後にイベントリスナーを削除する', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const remove1 = vi.spyOn(c1.signal, 'removeEventListener');
      const remove2 = vi.spyOn(c2.signal, 'removeEventListener');
      requestTimeout(() => {}, 100, { signal: c1.signal });
      const cancel = requestTimeout(() => {}, 100, { signal: c2.signal });
      frames.frame(100);
      cancel();
      expect(remove1).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(remove2).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });
});
