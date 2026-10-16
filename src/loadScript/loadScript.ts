import type { LoadScriptOptions } from './types';

// ロード済みのスクリプトの要素を管理するMap（キーは絶対URL）
const scripts = new Map<string, HTMLScriptElement>();
// ロード中のスクリプトを管理するMap（キーは絶対URL）
const loading = new Map<string, Promise<void>>();

/**
 * 動的に外部のJavaScriptをロードする関数。\
 * 同じURLのスクリプトは、ロード中であれば同じPromiseを返し、ロード済みであれば再度ロードしない
 * （`reload` を指定した場合を除く）。URLは絶対URLに変換して比較する
 * @param src ロードするJavaScriptのURL
 * @param options オプション
 * @returns ロードが完了すると解決するPromise。ロードに失敗した場合は`NetworkError`でrejectする
 */
export default function loadScript(
  src: string,
  options: LoadScriptOptions = {},
): Promise<void> {
  const { id, reload, crossOrigin, integrity, nonce } = options;
  const key = new URL(src, document.baseURI).href;

  const loadingPromise = loading.get(key);
  if (loadingPromise) {
    return loadingPromise;
  }

  const existing = scripts.get(key);
  if (existing && !reload) {
    return Promise.resolve();
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if (id != null) {
      script.id = id;
    }
    if (crossOrigin != null) {
      script.crossOrigin = crossOrigin;
    }
    if (integrity != null) {
      script.integrity = integrity;
    }
    if (nonce != null) {
      script.nonce = nonce;
    }
    script.onload = () => {
      scripts.set(key, script);
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(
        new DOMException(`Failed to load script "${src}".`, 'NetworkError'),
      );
    };

    if (existing) {
      scripts.delete(key);
      existing.remove();
    }

    document.head.appendChild(script);
  }).finally(() => {
    loading.delete(key);
  });

  loading.set(key, promise);

  return promise;
}
