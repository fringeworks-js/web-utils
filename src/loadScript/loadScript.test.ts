import loadScript from './loadScript';

// モジュールレベルのキャッシュを汚染しないよう、テストごとに一意のURLを使う
let urlCounter = 0;
const uniqueSrc = () => `https://example.com/script-${++urlCounter}.js`;

type MockScript = {
  src: string;
  id: string;
  crossOrigin: string | null;
  integrity: string;
  nonce: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  remove: ReturnType<typeof vi.fn>;
};

function createMockScript(): MockScript {
  return {
    src: '',
    id: '',
    crossOrigin: null,
    integrity: '',
    nonce: '',
    onload: null,
    onerror: null,
    remove: vi.fn(),
  };
}

describe('loadScript', () => {
  let mockScript: MockScript;
  let createElement: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;
  let getElementById: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockScript = createMockScript();
    createElement = vi.fn(() => (mockScript = createMockScript()));
    appendChild = vi.fn();
    getElementById = vi.fn();
    vi.stubGlobal('document', {
      baseURI: 'https://example.com/page/',
      createElement,
      head: { appendChild },
      body: { appendChild: vi.fn() },
      getElementById,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('スクリプトをロードすると解決する', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!();
    await expect(promise).resolves.toBeUndefined();
  });

  it('script要素をheadに追加する', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!();
    await promise;
    expect(appendChild).toHaveBeenCalledWith(mockScript);
  });

  it('エラー時はNetworkErrorでrejectし、作成したscript要素を削除する', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onerror!();
    await expect(promise).rejects.toMatchObject({ name: 'NetworkError' });
    expect(mockScript.remove).toHaveBeenCalledTimes(1);
  });

  it('同一URLを同時にロードした場合、同じPromiseを返す', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    const p2 = loadScript(src);
    expect(p2).toBe(p1);
    expect(createElement).toHaveBeenCalledTimes(1);
    mockScript.onload!();
    await Promise.all([p1, p2]);
  });

  it('同一URLを同時にロードしてエラーになった場合、どちらもrejectする', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    const p2 = loadScript(src);
    mockScript.onerror!();
    await expect(p1).rejects.toMatchObject({ name: 'NetworkError' });
    await expect(p2).rejects.toMatchObject({ name: 'NetworkError' });
  });

  it('既にロード済みのスクリプトは再度ロードせずに解決する', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!();
    await p1;

    await expect(loadScript(src)).resolves.toBeUndefined();
    expect(createElement).toHaveBeenCalledTimes(1);
  });

  it('相対URLと絶対URLを同じスクリプトとして扱う', async () => {
    const p1 = loadScript('./relative.js');
    mockScript.onload!();
    await p1;

    await loadScript('https://example.com/page/relative.js');
    expect(createElement).toHaveBeenCalledTimes(1);
  });

  it('idを省略した場合、script要素のidを設定しない', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!();
    await promise;
    expect(mockScript.id).toBe('');
  });

  it('idオプションでscript要素のIDを指定できる', async () => {
    const promise = loadScript(uniqueSrc(), { id: 'my-script' });
    mockScript.onload!();
    await promise;
    expect(mockScript.id).toBe('my-script');
  });

  it('crossOrigin・integrity・nonceをscript要素に設定する', async () => {
    const promise = loadScript(uniqueSrc(), {
      crossOrigin: 'anonymous',
      integrity: 'sha384-abc',
      nonce: 'n0nce',
    });
    mockScript.onload!();
    await promise;
    expect(mockScript.crossOrigin).toBe('anonymous');
    expect(mockScript.integrity).toBe('sha384-abc');
    expect(mockScript.nonce).toBe('n0nce');
  });

  it('crossOrigin・integrity・nonceを省略した場合は設定しない', async () => {
    const promise = loadScript(uniqueSrc());
    mockScript.onload!();
    await promise;
    expect(mockScript.crossOrigin).toBeNull();
    expect(mockScript.integrity).toBe('');
    expect(mockScript.nonce).toBe('');
  });

  it('reloadオプションで既存のscript要素を削除して再ロードする', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!();
    await p1;
    const first = mockScript;

    const p2 = loadScript(src, { reload: true });
    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(mockScript).not.toBe(first);
    mockScript.onload!();
    await expect(p2).resolves.toBeUndefined();
    expect(mockScript.remove).not.toHaveBeenCalled();
  });

  it('ロード中にreloadを指定した場合、ロード中のPromiseを返す', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    const p2 = loadScript(src, { reload: true });
    expect(p2).toBe(p1);
    expect(createElement).toHaveBeenCalledTimes(1);
    mockScript.onload!();
    await p2;
  });

  it('削除する要素をidで探さない（同じidの別の要素を削除しない）', async () => {
    const other = { remove: vi.fn() };
    getElementById.mockReturnValue(other);

    const src = uniqueSrc();
    const p1 = loadScript(src, { id: 'map' });
    mockScript.onload!();
    await p1;

    const p2 = loadScript(src, { id: 'map', reload: true });
    mockScript.onerror!();
    await expect(p2).rejects.toThrow();

    expect(other.remove).not.toHaveBeenCalled();
    expect(getElementById).not.toHaveBeenCalled();
  });

  it('エラー後に同じURLを再度ロードできる', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onerror!();
    await expect(p1).rejects.toThrow();

    const p2 = loadScript(src);
    expect(createElement).toHaveBeenCalledTimes(2);
    mockScript.onload!();
    await expect(p2).resolves.toBeUndefined();
  });

  it('reloadに失敗した場合、次の呼び出しで再度ロードする', async () => {
    const src = uniqueSrc();
    const p1 = loadScript(src);
    mockScript.onload!();
    await p1;

    const p2 = loadScript(src, { reload: true });
    mockScript.onerror!();
    await expect(p2).rejects.toThrow();

    // キャッシュから返さず、新しいscript要素を作成する
    const p3 = loadScript(src);
    expect(createElement).toHaveBeenCalledTimes(3);
    mockScript.onload!();
    await expect(p3).resolves.toBeUndefined();
  });
});
