import requestInterval from './requestInterval';

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
  const frame = (now: number) => {
    current = now;
    const pending = callbacks;
    callbacks = new Map();
    pending.forEach((cb) => cb(now));
  };
  return {
    requestAnimationFrame,
    frame,
    // start から end まで、step ミリ秒ごとにフレームを進める
    frames(start: number, end: number, step = 16) {
      for (let now = start; now <= end; now += step) {
        frame(now);
      }
    },
  };
}

describe('requestInterval', () => {
  let frames: ReturnType<typeof setupFrames>;

  beforeEach(() => {
    frames = setupFrames();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('指定した間隔でコールバックが呼ばれる', () => {
    const fn = vi.fn();
    requestInterval(fn, 100);
    frames.frames(16, 350);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('immediate: trueで最初にすぐ呼ばれる', () => {
    const fn = vi.fn();
    requestInterval(fn, 100, { immediate: true });
    expect(fn).toHaveBeenCalledTimes(1);
    frames.frames(16, 120);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('返り値の関数で停止できる', () => {
    const fn = vi.fn();
    const stop = requestInterval(fn, 100);
    frames.frames(16, 150);
    stop();
    frames.frames(160, 400);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('コールバックの中でstopすると以降は呼ばれない', () => {
    const fn = vi.fn(() => stop());
    const stop = requestInterval(fn, 100);
    frames.frames(16, 500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  describe('maxCount', () => {
    it('呼ばれる回数を制限できる', () => {
      const fn = vi.fn();
      requestInterval(fn, 100, { maxCount: 2 });
      frames.frames(16, 500);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('immediate: trueかつmaxCount: 1のとき最初の1回のみ呼ばれ、フレームも要求しない', () => {
      const fn = vi.fn();
      requestInterval(fn, 100, { immediate: true, maxCount: 1 });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it.each([0, -1])('%sの場合は実行しない', (maxCount) => {
      const fn = vi.fn();
      requestInterval(fn, 100, { immediate: true, maxCount });
      frames.frames(16, 500);
      expect(fn).not.toHaveBeenCalled();
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('NaNの場合は上限なしとして扱う', () => {
      const fn = vi.fn();
      requestInterval(fn, 100, { maxCount: NaN });
      frames.frames(16, 1000);
      expect(fn).toHaveBeenCalledTimes(9);
    });
  });

  describe('delay', () => {
    it.each([NaN, -100, 0])('%sの場合は毎フレーム呼ばれる', (delay) => {
      const fn = vi.fn();
      requestInterval(fn, delay);
      frames.frames(16, 160);
      expect(fn).toHaveBeenCalledTimes(10);
    });

    it('Infinityの場合は実行せず、フレームも要求しない', () => {
      const fn = vi.fn();
      requestInterval(fn, Infinity);
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
      frames.frame(1e9);
      expect(fn).not.toHaveBeenCalled();
    });

    it('Infinityでもimmediate: trueによる初回の実行は行う', () => {
      const fn = vi.fn();
      requestInterval(fn, Infinity, { immediate: true });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('間隔のずれ', () => {
    it('フレームの誤差が積み重ならない', () => {
      // 16msごとのフレームで100ms間隔の場合、112, 208, 304, 400, 512, 608, 704, 800, 912ms に呼ばれる
      // （前回の実行時刻を基準にすると、112msごとになり8回になる）
      const fn = vi.fn();
      requestInterval(fn, 100);
      frames.frames(16, 1000);
      expect(fn).toHaveBeenCalledTimes(9);
    });

    it('大きく遅れた場合は、まとめて実行せずに今の時刻から数え直す', () => {
      const fn = vi.fn();
      requestInterval(fn, 100);
      frames.frame(100);
      expect(fn).toHaveBeenCalledTimes(1);
      // 非表示のタブなどでフレームが止まっていた
      frames.frame(1000);
      expect(fn).toHaveBeenCalledTimes(2);
      frames.frame(1050);
      expect(fn).toHaveBeenCalledTimes(2);
      frames.frame(1100);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('signal', () => {
    it('abortすると停止する', () => {
      const fn = vi.fn();
      const controller = new AbortController();
      requestInterval(fn, 100, { signal: controller.signal });
      frames.frames(16, 150);
      controller.abort();
      frames.frames(160, 500);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('immediate: trueの最初のコールバックの中でabortすると以降は呼ばれない', () => {
      const controller = new AbortController();
      const fn = vi.fn(() => controller.abort());
      requestInterval(fn, 100, { immediate: true, signal: controller.signal });
      frames.frames(16, 500);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('abort済みの場合は実行せず、フレームも要求しない', () => {
      const fn = vi.fn();
      const controller = new AbortController();
      controller.abort();
      requestInterval(fn, 100, { immediate: true, signal: controller.signal });
      frames.frames(16, 500);
      expect(fn).not.toHaveBeenCalled();
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('回数制限に達した後と停止後にイベントリスナーを削除する', () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const remove1 = vi.spyOn(c1.signal, 'removeEventListener');
      const remove2 = vi.spyOn(c2.signal, 'removeEventListener');
      requestInterval(() => {}, 100, { maxCount: 1, signal: c1.signal });
      const stop = requestInterval(() => {}, 100, { signal: c2.signal });
      frames.frame(100);
      stop();
      expect(remove1).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(remove2).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });
});
