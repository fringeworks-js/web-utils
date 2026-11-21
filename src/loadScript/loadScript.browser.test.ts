import loadScript from './loadScript';

// 実行した回数を数えるスクリプト（fixtures/count.js）
const SCRIPT_PATH = '/fixtures/count.js';

declare global {
  interface Window {
    __webUtilsLoadCount?: number;
  }
}

// モジュールのキャッシュは URL ごとなので、テストごとに別の URL にする（クエリは同じファイルを指す）
let counter = 0;
const uniqueSrc = () => `${SCRIPT_PATH}?case=${++counter}`;

const findScripts = (src: string) =>
  [...document.querySelectorAll('script')].filter(
    (script) => script.src === new URL(src, document.baseURI).href,
  );

/**
 * スクリプトの内容から、integrity 属性の値（sha384）を作る
 */
async function createIntegrity(src: string) {
  const content = await (await fetch(src)).arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-384', content);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return `sha384-${base64}`;
}

describe('loadScript（ブラウザー）', () => {
  beforeEach(() => {
    window.__webUtilsLoadCount = 0;
  });

  it('スクリプトを読み込んで実行し、<script> を head に残す', async () => {
    const src = uniqueSrc();
    await loadScript(src, { id: 'loaded-script' });
    expect(window.__webUtilsLoadCount).toBe(1);
    const [script] = findScripts(src);
    expect(script?.parentElement).toBe(document.head);
    expect(script?.id).toBe('loaded-script');
  });

  it('同じ URL は1回だけ実行する（相対 URL と絶対 URL も同じとみなす）', async () => {
    const src = uniqueSrc();
    await Promise.all([loadScript(src), loadScript(src)]);
    await loadScript(new URL(src, document.baseURI).href);
    expect(window.__webUtilsLoadCount).toBe(1);
    expect(findScripts(src)).toHaveLength(1);
  });

  it('reload で、<script> を入れ替えてもう一度実行する', async () => {
    const src = uniqueSrc();
    await loadScript(src);
    const [first] = findScripts(src);
    await loadScript(src, { reload: true });
    expect(window.__webUtilsLoadCount).toBe(2);
    const scripts = findScripts(src);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).not.toBe(first);
  });

  it('属性を <script> に付ける', async () => {
    const src = uniqueSrc();
    await loadScript(src, {
      crossOrigin: 'anonymous',
      integrity: await createIntegrity(src),
      nonce: 'test-nonce',
    });
    const [script] = findScripts(src);
    expect(script?.crossOrigin).toBe('anonymous');
    expect(script?.integrity).toMatch(/^sha384-/);
    expect(script?.nonce).toBe('test-nonce');
    expect(window.__webUtilsLoadCount).toBe(1);
  });

  it('読み込めない場合は NetworkError で reject し、<script> を取り除く', async () => {
    const src = '/fixtures/missing.js';
    await expect(loadScript(src)).rejects.toMatchObject({
      name: 'NetworkError',
    });
    expect(findScripts(src)).toHaveLength(0);
  });

  it('integrity が合わない場合も NetworkError で reject し、実行しない', async () => {
    const src = uniqueSrc();
    await expect(
      loadScript(src, {
        crossOrigin: 'anonymous',
        integrity:
          'sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }),
    ).rejects.toMatchObject({ name: 'NetworkError' });
    expect(window.__webUtilsLoadCount).toBe(0);
    expect(findScripts(src)).toHaveLength(0);
  });

  it('失敗した URL は、次の呼び出しで読み込み直す', async () => {
    const src = uniqueSrc();
    await expect(
      loadScript(src, {
        crossOrigin: 'anonymous',
        integrity:
          'sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }),
    ).rejects.toMatchObject({ name: 'NetworkError' });
    await loadScript(src);
    expect(window.__webUtilsLoadCount).toBe(1);
  });
});
