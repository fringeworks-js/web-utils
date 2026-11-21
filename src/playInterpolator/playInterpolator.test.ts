import playInterpolator from './playInterpolator';

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
  return { requestAnimationFrame, frame };
}

const double = (t: number) => t * 2;

describe('playInterpolator', () => {
  let frames: ReturnType<typeof setupFrames>;

  beforeEach(() => {
    frames = setupFrames();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('フレームごとに経過時間の割合から値を求めて呼ぶ', () => {
    const callback = vi.fn();
    playInterpolator(double, callback, { duration: 100 });
    expect(callback).not.toHaveBeenCalled();

    frames.frame(25);
    expect(callback).toHaveBeenLastCalledWith(0.5, 0.25);
    frames.frame(50);
    expect(callback).toHaveBeenLastCalledWith(1, 0.5);
  });

  it('最後まで再生すると t = 1 で呼び、onFinish を呼んで止まる', () => {
    const callback = vi.fn();
    const onFinish = vi.fn();
    playInterpolator(double, callback, { duration: 100, onFinish });

    frames.frame(150);
    expect(callback).toHaveBeenLastCalledWith(2, 1);
    expect(onFinish).toHaveBeenCalledTimes(1);

    frames.frame(200);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(frames.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('既定の時間は 250 ミリ秒', () => {
    const callback = vi.fn();
    playInterpolator(double, callback);
    frames.frame(125);
    expect(callback).toHaveBeenLastCalledWith(1, 0.5);
  });

  it('ease を経過時間の割合に適用する', () => {
    const callback = vi.fn();
    playInterpolator((t) => t, callback, {
      duration: 100,
      ease: (t) => t * t,
    });
    frames.frame(50);
    expect(callback).toHaveBeenLastCalledWith(0.25, 0.5);
  });

  it.each([0, -100, NaN])(
    'duration が %s の場合は最初のフレームで終わる',
    (duration) => {
      const callback = vi.fn();
      const onFinish = vi.fn();
      playInterpolator(double, callback, { duration, onFinish });
      frames.frame(0);
      expect(callback).toHaveBeenCalledExactlyOnceWith(2, 1);
      expect(onFinish).toHaveBeenCalledTimes(1);
    },
  );

  it('返り値の関数で停止でき、onFinish は呼ばない', () => {
    const callback = vi.fn();
    const onFinish = vi.fn();
    const stop = playInterpolator(double, callback, {
      duration: 100,
      onFinish,
    });
    frames.frame(50);
    stop();
    frames.frame(150);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('コールバックの中で停止すると以降は呼ばれない', () => {
    const onFinish = vi.fn();
    const callback = vi.fn(() => stop());
    const stop = playInterpolator(double, callback, {
      duration: 100,
      onFinish,
    });
    frames.frame(150);
    frames.frame(200);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  describe('signal', () => {
    it('中断されると停止する', () => {
      const controller = new AbortController();
      const callback = vi.fn();
      playInterpolator(double, callback, {
        duration: 100,
        signal: controller.signal,
      });
      frames.frame(50);
      controller.abort();
      frames.frame(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('中断済みの場合は再生せず、フレームも要求しない', () => {
      const controller = new AbortController();
      controller.abort();
      const callback = vi.fn();
      const stop = playInterpolator(double, callback, {
        signal: controller.signal,
      });
      frames.frame(1000);
      expect(callback).not.toHaveBeenCalled();
      expect(frames.requestAnimationFrame).not.toHaveBeenCalled();
      // 返した停止用関数は、呼んでも何も起きない
      expect(() => stop()).not.toThrow();
    });

    it('最後まで再生したらリスナーを外す', () => {
      const controller = new AbortController();
      const remove = vi.spyOn(controller.signal, 'removeEventListener');
      playInterpolator(double, vi.fn(), {
        duration: 100,
        signal: controller.signal,
      });
      frames.frame(100);
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
