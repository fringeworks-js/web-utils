# @fringeworks/web-utils

`@fringeworks/web-utils` is a library some will find handy, offering small utility functions for the browser, such as getting elements, loading external scripts, and frame-synced timers.

**[日本語のREADMEはこちら](./README.ja.md)**

## Installation

```bash
npm install @fringeworks/web-utils
# or
pnpm add @fringeworks/web-utils
```

## Usage

Functions and types can be imported by the same name from either the root or a per-function path.

```ts
import { loadScript, type LoadScriptOptions } from '@fringeworks/web-utils';
import { loadScript } from '@fringeworks/web-utils/loadScript';
```

A per-function path also provides the function as the default export.

```ts
import loadScript from '@fringeworks/web-utils/loadScript';
```

## API

| Function                                     | Description                                                        |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `getElementById(id)`                         | `getElementById` that infers its return type from where it is used |
| `loadScript(src, options?)`                  | Loads an external JavaScript file                                  |
| `requestInterval(callback, delay, options?)` | Runs repeatedly at an interval, using `requestAnimationFrame`      |
| `requestTimeout(callback, delay, options?)`  | Runs after a given time, using `requestAnimationFrame`             |

### `getElementById`

```ts
getElementById<T extends Element = HTMLElement>(id: string): T | null
```

Returns the element with the given `id`, like `document.getElementById`, or `null` if none is found.\
The return type is inferred from the variable it is assigned to or the parameter it is passed to. With nothing to infer from, it is `HTMLElement | null`. It only casts the type; the element type is not checked at runtime.

```ts
const input: HTMLInputElement | null = getElementById('name');
const icon = getElementById<SVGSVGElement>('icon');
```

### `loadScript`

```ts
loadScript(src: string, options?: LoadScriptOptions): Promise<void>
```

Loads an external JavaScript file by adding a `<script>` element to `document.head`, and returns a `Promise` that resolves when loading completes. If loading fails, the added `<script>` element is removed and the `Promise` rejects with a `DOMException` named `NetworkError`.

For the same URL, it returns the same `Promise` while loading is in progress, and resolves without loading again once loaded. URLs are compared after being resolved to absolute URLs, so a relative URL and its absolute form are treated as the same script. A URL that failed is loaded again on the next call.

```ts
await loadScript('https://example.com/sdk.js', {
  crossOrigin: 'anonymous',
  integrity: 'sha384-...',
});

// When execution order matters, wait for each in turn
await loadScript('/vendor/library.js');
await loadScript('/vendor/library-plugin.js');
```

| Option         | Type                               | Description                                                                                                                                                                            |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id?`          | `string`                           | The `id` attribute of the `<script>` element. Not set when omitted                                                                                                                     |
| `reload?`      | `boolean`                          | Loads again even if already loaded, removing the existing `<script>` element before adding a new one. While loading is in progress, returns the pending `Promise`. Defaults to `false` |
| `crossOrigin?` | `'anonymous' \| 'use-credentials'` | The `crossorigin` attribute of the `<script>` element. Required when using `integrity` with a cross-origin script                                                                      |
| `integrity?`   | `string`                           | The `integrity` attribute of the `<script>` element (Subresource Integrity)                                                                                                            |
| `nonce?`       | `string`                           | The `nonce` attribute of the `<script>` element (Content Security Policy)                                                                                                              |

The following are not supported:

- `<script>` elements written in the HTML are not treated as loaded
- Reloading with `reload` does not undo what the script has already done
- For the same URL, options of later calls are not used (except `reload`)
- A failed `integrity` check also results in `NetworkError`, the same as a network error
- Loading ES modules. Use the standard `import()` instead

### `requestInterval`

```ts
requestInterval(callback: () => void, delay: number, options?: RequestIntervalOptions): () => void
```

Runs `callback` every `delay` milliseconds and returns a function that stops it. Because it uses `requestAnimationFrame` instead of `setInterval`, `callback` runs at frame boundaries and does not run while frames are paused, such as in a hidden tab.

Each run time is based on the previous scheduled time, so frame-timing errors do not accumulate. When it falls far behind, for example because frames were paused, it runs once instead of catching up on the missed runs, and counts again from that point.

`NaN` and negative values are treated as `0` (runs every frame). With `Infinity`, `callback` never runs (except for the first run by `immediate`).

```ts
const stop = requestInterval(() => updateClock(), 1000, { immediate: true });
```

| Option       | Type          | Description                                                                                                 |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `immediate?` | `boolean`     | Runs the first time on the call instead of after `delay`. Defaults to `false`                               |
| `maxCount?`  | `number`      | Maximum number of runs. Nothing runs when `0` or less. `NaN` is treated as no limit. Defaults to `Infinity` |
| `signal?`    | `AbortSignal` | Stops when aborted                                                                                          |

The returned function is not yet available during the first run by `immediate`. To stop from within that run, use `signal`.

### `requestTimeout`

```ts
requestTimeout(callback: () => void, delay: number, options?: RequestTimeoutOptions): () => void
```

Runs `callback` after `delay` milliseconds and returns a function that cancels it. Because it uses `requestAnimationFrame` instead of `setTimeout`, `callback` runs at a frame boundary and does not run while frames are paused, such as in a hidden tab. `NaN` and negative values are treated as `0` (runs on the next frame). With `Infinity`, `callback` never runs.

```ts
const cancel = requestTimeout(() => hideToast(), 3000);
```

| Option    | Type          | Description                    |
| --------- | ------------- | ------------------------------ |
| `signal?` | `AbortSignal` | Cancels the timer when aborted |

### Types

| Type                     | Description                   |
| ------------------------ | ----------------------------- |
| `LoadScriptOptions`      | Options for `loadScript`      |
| `RequestIntervalOptions` | Options for `requestInterval` |
| `RequestTimeoutOptions`  | Options for `requestTimeout`  |

## License

MIT
