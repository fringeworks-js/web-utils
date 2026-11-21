import playInterpolator from './playInterpolator';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('playInterpolator（ブラウザー）', () => {
  it('t を 0 〜 1 で進め、最後に t が 1 のコールバックのあと onFinish を呼ぶ', async () => {
    const calls: { value: number; t: number }[] = [];
    const onFinish = vi.fn();
    await new Promise<void>((resolve) => {
      playInterpolator(
        (t) => t * 100,
        (value, t) => {
          calls.push({ value, t });
        },
        {
          duration: 100,
          onFinish: () => {
            onFinish();
            resolve();
          },
        },
      );
    });
    expect(calls.length).toBeGreaterThan(1);
    expect(calls[calls.length - 1]).toEqual({ value: 100, t: 1 });
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i]!.t).toBeGreaterThanOrEqual(calls[i - 1]!.t);
    }
    for (const { value, t } of calls) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
      expect(value).toBeCloseTo(t * 100);
    }
    await wait(50);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('ease を通した t で interpolator を呼び、callback には元の t を渡す', async () => {
    const calls: { value: number; t: number }[] = [];
    await new Promise<void>((resolve) => {
      playInterpolator(
        (t) => t,
        (value, t) => {
          calls.push({ value, t });
        },
        { duration: 50, ease: (t) => t * t, onFinish: resolve },
      );
    });
    for (const { value, t } of calls) {
      expect(value).toBeCloseTo(t * t);
    }
  });

  it('止めると、それ以降のコールバックと onFinish を呼ばない', async () => {
    const callback = vi.fn();
    const onFinish = vi.fn();
    const stop = playInterpolator((t) => t, callback, {
      duration: 1000,
      onFinish,
    });
    await wait(50);
    stop();
    const count = callback.mock.calls.length;
    await wait(50);
    expect(callback).toHaveBeenCalledTimes(count);
    expect(onFinish).not.toHaveBeenCalled();
  });
});
