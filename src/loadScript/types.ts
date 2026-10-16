/**
 * loadScriptのオプション
 */
export type LoadScriptOptions = {
  /**
   * script要素のid属性。省略した場合は設定しない
   */
  id?: string;

  /**
   * 既にロード済みの場合も、再度ロードするかどうか
   *
   * 既存のscript要素を削除してから、新しいscript要素を追加する。
   * 既に実行されたスクリプトの処理は取り消されない
   */
  reload?: boolean;

  /**
   * script要素のcrossorigin属性
   */
  crossOrigin?: 'anonymous' | 'use-credentials';

  /**
   * script要素のintegrity属性（サブリソース完全性）
   */
  integrity?: string;

  /**
   * script要素のnonce属性（Content Security Policy）
   */
  nonce?: string;
};
