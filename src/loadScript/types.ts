/**
 * loadScriptのオプション
 */
export type LoadScriptOptions = {
  /**
   * script要素のid属性
   * @default `loadscript-${performance.now()}`
   */
  id?: string;

  /**
   * script要素のasync属性
   * @default true
   */
  async?: boolean;

  /**
   * script要素のdefer属性
   */
  defer?: boolean;

  /**
   * 対象のscript要素が既に存在する場合、再度ロードするかどうか
   */
  reload?: boolean;

  /**
   * ロード完了時のコールバック
   * @param event イベントオブジェクト。既にロード済みの場合はundefined
   * @returns
   */
  onLoad?: (event?: Event) => void;

  /**
   * エラー時のコールバック
   * @param event イベントオブジェクト
   * @returns
   */
  onError?: (event: Event) => void;

  /**
   * 中止時のコールバック
   * @param event イベントオブジェクト
   * @returns
   */
  onAbort?: (event: Event) => void;
};

/**
 * ロードの状態
 */
export type LoadScriptStatus = 'error' | 'aborted' | 'loaded' | 'loading';
