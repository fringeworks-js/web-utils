# @fringeworks/web-utils

`@fringeworks/web-utils` is a library some will find handy, offering small utility functions for the browser, such as getting elements, loading external scripts, and frame-synced timers.

**[日本語のREADMEはこちら](./README.ja.md)**

## Installation

```bash
npm install @fringeworks/web-utils
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

| Function                                             | Description                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `getElementById(id)`                                 | `getElementById` that infers its return type from where it is used |
| `loadScript(src, options?)`                          | Loads an external JavaScript file                                  |
| `playInterpolator(interpolator, callback, options?)` | Plays an interpolator over time using `requestAnimationFrame`      |
| `requestInterval(callback, delay, options?)`         | Runs repeatedly at an interval, using `requestAnimationFrame`      |
| `requestTimeout(callback, delay, options?)`          | Runs after a given time, using `requestAnimationFrame`             |

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

How it decides whether a script is loaded, and how it uses options:

- Whether a script is loaded is decided by the `<script>` elements this function added. `<script>` elements written in the HTML are not counted
- `reload` replaces the `<script>` element and runs the script again. What the script has already done stays as it is
- Options are used when the URL is loaded. When called for a URL that is loading or already loaded, the options of that call are not used (they are used when reloading with `reload`)
- A failed `integrity` check also rejects with `NetworkError`, the same as a network error
- To load ES modules, use the standard `import()`

### `playInterpolator`

```ts
playInterpolator<T>(
  interpolator: Interpolator<T>,
  callback: (value: T, t: number) => void,
  options?: PlayInterpolatorOptions,
): () => void
```

Plays an interpolator (a function that returns a value for `t`) over `duration` milliseconds and returns a function that stops it. On each frame, it computes the elapsed fraction `t` (0 to 1) and calls `callback(interpolator(ease(t)), t)`. You can pass interpolators from d3-interpolate or [`@fringeworks/interpolate`](https://www.npmjs.com/package/@fringeworks/interpolate) as is, and animate targets d3-transition does not handle (maps, Canvas, and so on).

- The first callback is called on the next frame, not at the time of the call
- On the last frame, the callback is called with `t` of 1, and then `onFinish` is called
- Time keeps passing while frames are paused, such as in a hidden tab. When frames resume, playback continues from the `t` at that time
- A `duration` of `NaN` or a negative value is treated as `0`, and playback ends on the first frame with `t` of 1

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

| Option      | Type             | Description                                                                                        |
| ----------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `duration?` | `number`         | The playback time in milliseconds. Defaults to `250`                                               |
| `ease?`     | `EasingFunction` | An easing function applied to the elapsed fraction. Defaults to linear                             |
| `onFinish?` | `() => void`     | Called when playback reaches the end. Not called when stopped by the returned function or `signal` |
| `signal?`   | `AbortSignal`    | Stops playback when aborted                                                                        |

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

| Type                      | Description                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `LoadScriptOptions`       | Options for `loadScript`                                                                                    |
| `PlayInterpolatorOptions` | Options for `playInterpolator`                                                                              |
| `Interpolator<VALUE>`     | A function that returns a value for `t` (0 to 1): `(t: number) => VALUE` (a type from `@fringeworks/types`) |
| `EasingFunction`          | An easing function: `(t: number) => number` (a type from `@fringeworks/types`)                              |
| `RequestIntervalOptions`  | Options for `requestInterval`                                                                               |
| `RequestTimeoutOptions`   | Options for `requestTimeout`                                                                                |

## Supported browsers

These functions use DOM APIs, so they run in browsers (importing the module alone also works in Node.js and SSR). The following versions of the major browsers are supported.

| Browser         | Supported versions    |
| --------------- | --------------------- |
| Google Chrome   | 88 (January 2021) +   |
| Microsoft Edge  | 88 (January 2021) +   |
| Apple Safari    | 14 (September 2020) + |
| Mozilla Firefox | 85 (January 2021) +   |

## License

MIT
