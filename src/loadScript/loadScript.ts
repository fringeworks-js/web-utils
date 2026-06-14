import type { LoadScriptOptions, LoadScriptStatus } from './types';

// ロード済みのスクリプトを管理するMap
const scripts = new Map<string, string>();
// ロード中のスクリプトを管理するMap
const loading = new Map<string, Promise<LoadScriptStatus>>();

/**
 * 動的に外部のJavaScriptをロードする関数
 * @param src ロードするJavaScriptのURL
 * @param options オプション
 * @returns ロードの状態
 */
export default async function loadScript(
  src: string,
  options: LoadScriptOptions = {},
): Promise<LoadScriptStatus> {
  const {
    id = `loadscript-${performance.now()}`,
    async = true,
    defer = true,
    reload,
    onLoad,
    onError,
    onAbort,
  } = options;

  if (loading.has(src)) {
    return loading.get(src);
  }

  const existingId = scripts.get(src);
  if (existingId != null && !reload) {
    // 既にロードされている
    onLoad?.();
    return 'loaded';
  }

  const promise = new Promise<LoadScriptStatus>((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    script.id = id;
    script.onload = (event) => {
      scripts.set(src, id);
      onLoad?.(event);
      resolve('loaded');
    };
    script.onerror = (event) => {
      _removeScript(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError?.(event as any);
      resolve('error');
    };
    script.onabort = (event) => {
      _removeScript(id);
      onAbort?.(event);
      resolve('aborted');
    };

    if (existingId != null && reload) {
      _removeScript(existingId);
    }

    document.body.appendChild(script);
  }).finally(() => {
    loading.delete(src);
  });

  loading.set(src, promise);

  return promise;
}

function _removeScript(id: string) {
  const script = document.getElementById(id);
  if (script) {
    script.remove();
  }
}
