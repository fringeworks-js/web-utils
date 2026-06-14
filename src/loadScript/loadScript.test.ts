import loadScript from './loadScript';

// モジュールレベルのキャッシュを汚染しないよう、テストごとに一意のURLを使う
let urlCounter = 0;
const uniqueSrc = () => `https://example.com/script-${++urlCounter}.js`;

type MockScript = {
  src: string;
  async: boolean;
  defer: boolean;
  id: string;
  onload: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onabort: ((event: Event) => void) | null;
  remove: ReturnType<typeof vi.fn>;
};

function createMockScript(): MockScript {
  return {
    src: '',
    async: false,
    defer: false,
    id: '',
    onload: null,
    onerror: null,
    onabort: null,
    remove: vi.fn(),
  };
}

describe('loadScript', () => {
  let mockScript: MockScript;

  beforeEach(() => {
    mockScript = createMockScript();
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockScript),
      body: { appendChild: vi.fn() },
      getElementById: vi.fn().mockReturnValue(mockScript),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('スクリプトをロードして"loaded"を返す', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!({} as Event);
    expect(await promise).toBe('loaded');
  });

  it('エラー時に"error"を返す', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onerror!({} as Event);
    expect(await promise).toBe('error');
  });

  it('中断時に"aborted"を返す', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onabort!({} as Event);
    expect(await promise).toBe('aborted');
  });

  it('同一URLを同時にロードした場合、同じPromiseを返す', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    const p2 = loadScript(src);
    mockScript.onload!({} as Event);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('loaded');
    expect(r2).toBe('loaded');
  });

  it('既にロード済みのスクリプトはキャッシュから"loaded"を返す', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!({} as Event);
    await p1;

    const onLoad = vi.fn();
    const result = await loadScript(src, { onLoad });
    expect(result).toBe('loaded');
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('キャッシュ済みのスクリプトはonLoadにイベントオブジェクトなしで呼ばれる', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!({} as Event);
    await p1;

    const onLoad = vi.fn();
    await loadScript(src, { onLoad });
    expect(onLoad).toHaveBeenCalledWith();
  });

  it('onLoadコールバックがイベントオブジェクト付きで呼ばれる', async () => {
    const event = { type: 'load' } as Event;
    const onLoad = vi.fn();
    const promise = loadScript(uniqueSrc(), { onLoad });
    mockScript.onload!(event);
    await promise;
    expect(onLoad).toHaveBeenCalledWith(event);
  });

  it('onErrorコールバックが呼ばれる', async () => {
    const event = { type: 'error' } as Event;
    const onError = vi.fn();
    const promise = loadScript(uniqueSrc(), { onError });
    mockScript.onerror!(event);
    await promise;
    expect(onError).toHaveBeenCalledWith(event);
  });

  it('onAbortコールバックが呼ばれる', async () => {
    const event = { type: 'abort' } as Event;
    const onAbort = vi.fn();
    const promise = loadScript(uniqueSrc(), { onAbort });
    mockScript.onabort!(event);
    await promise;
    expect(onAbort).toHaveBeenCalledWith(event);
  });

  it('script要素のasync/defer属性が設定される', async () => {
    const promise = loadScript(uniqueSrc(), { async: false, defer: false });
    mockScript.onload!({} as Event);
    await promise;
    expect(mockScript.async).toBe(false);
    expect(mockScript.defer).toBe(false);
  });

  it('デフォルトでasync/deferがtrueに設定される', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!({} as Event);
    await promise;
    expect(mockScript.async).toBe(true);
    expect(mockScript.defer).toBe(true);
  });

  it('idオプションでscript要素のIDを指定できる', async () => {
    const promise = loadScript(uniqueSrc(), { id: 'my-script' });
    mockScript.onload!({} as Event);
    await promise;
    expect(mockScript.id).toBe('my-script');
  });

  it('reloadオプションで既存スクリプトを再ロードできる', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!({} as Event);
    await p1;

    const p2 = loadScript(src, { reload: true });
    mockScript.onload!({} as Event);
    expect(await p2).toBe('loaded');
  });

  it('エラー時にscript要素が見つからなくてもクラッシュしない', async () => {
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockScript),
      body: { appendChild: vi.fn() },
      getElementById: vi.fn().mockReturnValue(null),
    });
    const promise = loadScript(uniqueSrc());
    mockScript.onerror!({} as Event);
    expect(await promise).toBe('error');
  });
});
