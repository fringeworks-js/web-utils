# @fringeworks/web-utils

`@fringeworks/web-utils` は、要素の取得・外部スクリプトの読み込み・フレームに合わせたタイマーなど、ブラウザー向けの小さなユーティリティ関数を集めた、誰かにとっては便利なライブラリです。

**[English README is available here](./README.md)**

## インストール

```bash
npm install @fringeworks/web-utils
```

## 使い方

関数と型は、ルートと関数単位のどちらのパスからでも同じ名前で import できます。

```ts
import { loadScript, type LoadScriptOptions } from '@fringeworks/web-utils';
import { loadScript } from '@fringeworks/web-utils/loadScript';
```

関数単位のパスでは、その関数を default import することもできます。

```ts
import loadScript from '@fringeworks/web-utils/loadScript';
```

## API

| 関数                                                 | 説明                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `getElementById(id)`                                 | 受け取る側の型から戻り値の型を推論する `getElementById`        |
| `loadScript(src, options?)`                          | 外部の JavaScript を読み込む                                   |
| `playInterpolator(interpolator, callback, options?)` | interpolator を `requestAnimationFrame` を使って時間で再生する |
| `requestInterval(callback, delay, options?)`         | `requestAnimationFrame` を使って、一定の間隔で繰り返し実行する |
| `requestTimeout(callback, delay, options?)`          | `requestAnimationFrame` を使って、指定の時間後に実行する       |

### `getElementById`

```ts
getElementById<T extends Element = HTMLElement>(id: string): T | null
```

`document.getElementById` と同じく、`id` の要素を返します。見つからない場合は `null` を返します。\
戻り値の型は、代入する変数や渡す先の引数の型から推論されます。推論する先が無い場合は `HTMLElement | null` になります。型を変換するだけで、実行時に要素の種類は確認しません。

```ts
const input: HTMLInputElement | null = getElementById('name');
const icon = getElementById<SVGSVGElement>('icon');
```

### `loadScript`

```ts
loadScript(src: string, options?: LoadScriptOptions): Promise<void>
```

`<script>` 要素を `document.head` に追加して外部の JavaScript を読み込み、読み込みが完了すると解決する `Promise` を返します。読み込みに失敗した場合は、追加した `<script>` 要素を削除し、`NetworkError` の `DOMException` で reject します。

同じ URL のスクリプトは、読み込み中であれば同じ `Promise` を返し、読み込み済みであれば再度読み込まずに解決します。URL は絶対 URL に変換して比べるため、相対 URL と絶対 URL も同じスクリプトとして扱います。失敗した URL は、次の呼び出しで再度読み込みます。

```ts
await loadScript('https://example.com/sdk.js', {
  crossOrigin: 'anonymous',
  integrity: 'sha384-...',
});

// 順番に実行する必要がある場合は、順に待つ
await loadScript('/vendor/library.js');
await loadScript('/vendor/library-plugin.js');
```

| オプション     | 型                                 | 説明                                                                                                                                                    |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id?`          | `string`                           | `<script>` 要素の `id` 属性。省略した場合は設定しない                                                                                                   |
| `reload?`      | `boolean`                          | 読み込み済みの場合も再度読み込む。既存の `<script>` 要素を削除してから追加する。読み込み中の場合は、読み込み中の `Promise` を返す。デフォルトは `false` |
| `crossOrigin?` | `'anonymous' \| 'use-credentials'` | `<script>` 要素の `crossorigin` 属性。別のオリジンのスクリプトに `integrity` を使う場合は必要                                                           |
| `integrity?`   | `string`                           | `<script>` 要素の `integrity` 属性（サブリソース完全性）                                                                                                |
| `nonce?`       | `string`                           | `<script>` 要素の `nonce` 属性（Content Security Policy）                                                                                               |

読み込み済みかどうかの判断とオプションの扱いは、次のとおりです。

- 読み込み済みかどうかは、この関数で読み込んだ `<script>` 要素で判断します。HTML に元から書かれている `<script>` 要素は数えません
- `reload` は `<script>` 要素を入れ替えて、スクリプトをもう一度実行します。前に実行したスクリプトの処理は、そのまま残ります
- オプションは、その URL を読み込むときのものを使います。読み込み中や読み込み済みの URL を呼び出したときは、そのときのオプションを使いません（`reload` で読み込み直すときは使います）
- `integrity` の検証に失敗した場合も、ネットワークのエラーと同じ `NetworkError` で reject します
- ES モジュールを読み込むときは、標準の `import()` を使います

### `playInterpolator`

```ts
playInterpolator<T>(
  interpolator: Interpolator<T>,
  callback: (value: T, t: number) => void,
  options?: PlayInterpolatorOptions,
): () => void
```

interpolator（`t` に応じた値を返す関数）を `duration` ミリ秒かけて再生し、停止する関数を返します。フレームごとに経過時間の割合 `t`（0 〜 1）を求め、`callback(interpolator(ease(t)), t)` を呼びます。d3-interpolate や [`@fringeworks/interpolate`](https://www.npmjs.com/package/@fringeworks/interpolate) の interpolator をそのまま渡せ、d3-transition を使えない対象（地図や Canvas など）も動かせます。

- 最初のコールバックは次のフレームで呼びます。呼び出した時点では呼びません
- 最後のフレームでは `t` を 1 にして呼び、そのあと `onFinish` を呼びます
- 非表示のタブなどでフレームが止まっている間も時間は進みます。再開したときは、その時点の `t` から続けます
- `duration` が `NaN` や負の値の場合は `0` として扱い、最初のフレームで `t` を 1 にして終わります

```ts
import { interpolateFormattedNumber } from '@fringeworks/interpolate';

const stop = playInterpolator(
  interpolateFormattedNumber(0, 12000),
  (text) => {
    element.textContent = text;
  },
  { duration: 1000 },
);
```

| オプション  | 型               | 説明                                                                                 |
| ----------- | ---------------- | ------------------------------------------------------------------------------------ |
| `duration?` | `number`         | 再生する時間（ミリ秒）。デフォルトは `250`                                           |
| `ease?`     | `EasingFunction` | 経過時間の割合に適用するイージング関数。デフォルトは線形                             |
| `onFinish?` | `() => void`     | 最後まで再生したときに呼ぶ関数。戻り値の関数や `signal` で途中で止めた場合は呼ばない |
| `signal?`   | `AbortSignal`    | 中断されると停止する                                                                 |

### `requestInterval`

```ts
requestInterval(callback: () => void, delay: number, options?: RequestIntervalOptions): () => void
```

`delay` ミリ秒ごとに `callback` を実行し、停止する関数を返します。`setInterval` の代わりに `requestAnimationFrame` を使うため、実行はフレームの境目で行い、非表示のタブなどでフレームが止まっている間は実行しません。

実行の時刻は前回の予定の時刻から決めるため、フレームの誤差は積み重なりません。フレームが止まっていたなどで大きく遅れた場合は、遅れた分をまとめて実行せずに1回だけ実行し、その時点から数え直します。

`NaN` や負の値は `0`（毎フレーム実行）として扱い、`Infinity` の場合は実行しません（`immediate` による初回の実行は行います）。

```ts
const stop = requestInterval(() => updateClock(), 1000, { immediate: true });
```

| オプション   | 型            | 説明                                                                                                  |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------- |
| `immediate?` | `boolean`     | 最初の実行を `delay` を待たずに、呼び出した時点で行う。デフォルトは `false`                           |
| `maxCount?`  | `number`      | 実行回数の上限。`0` 以下の場合は実行しない。`NaN` の場合は上限なしとして扱う。デフォルトは `Infinity` |
| `signal?`    | `AbortSignal` | 中断されると停止する                                                                                  |

`immediate` による最初の実行の中では、まだ戻り値の関数を受け取れません。その中で停止したい場合は `signal` を使います。

### `requestTimeout`

```ts
requestTimeout(callback: () => void, delay: number, options?: RequestTimeoutOptions): () => void
```

`delay` ミリ秒後に `callback` を実行し、取り消す関数を返します。`setTimeout` の代わりに `requestAnimationFrame` を使うため、実行はフレームの境目で行い、非表示のタブなどでフレームが止まっている間は実行しません。`NaN` や負の値は `0`（次のフレームで実行）として扱い、`Infinity` の場合は実行しません。

```ts
const cancel = requestTimeout(() => hideToast(), 3000);
```

| オプション | 型            | 説明                           |
| ---------- | ------------- | ------------------------------ |
| `signal?`  | `AbortSignal` | 中断されるとタイマーを取り消す |

### 型

| 型                        | 説明                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `LoadScriptOptions`       | `loadScript` のオプション                                                             |
| `PlayInterpolatorOptions` | `playInterpolator` のオプション                                                       |
| `Interpolator<VALUE>`     | `t`（0 〜 1）に応じた値を返す関数 `(t: number) => VALUE`（`@fringeworks/types` の型） |
| `EasingFunction`          | イージング関数 `(t: number) => number`（`@fringeworks/types` の型）                   |
| `RequestIntervalOptions`  | `requestInterval` のオプション                                                        |
| `RequestTimeoutOptions`   | `requestTimeout` のオプション                                                         |

## 対応ブラウザー

DOM の API を使うため、ブラウザーで動きます（モジュールを import するだけなら、Node.js や SSR でも読み込めます）。下記のメジャーなブラウザーのバージョンに対応しています。

| ブラウザー      | 対応バージョン      |
| --------------- | ------------------- |
| Google Chrome   | 88 (2021年1月) 以降 |
| Microsoft Edge  | 88 (2021年1月) 以降 |
| Apple Safari    | 14 (2020年9月) 以降 |
| Mozilla Firefox | 85 (2021年1月) 以降 |

## ライセンス

MIT
