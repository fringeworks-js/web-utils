import ellipsis from './ellipsis';

// テキスト長がoverflowThresholdを超えるとスクロールが発生するモック要素を生成する
function createMockElement(clientWidth = 100, clientHeight = 50, overflowThreshold = Infinity) {
  return {
    clientWidth,
    clientHeight,
    cloneNode: () => {
      let text = '';
      return {
        style: {} as CSSStyleDeclaration,
        get scrollHeight() {
          return text.length > overflowThreshold ? clientHeight + 10 : 0;
        },
        get clientHeight() {
          return clientHeight;
        },
        get scrollWidth() {
          return text.length > overflowThreshold ? clientWidth + 10 : 0;
        },
        get clientWidth() {
          return clientWidth;
        },
        set textContent(t: string) {
          text = t;
        },
        get textContent() {
          return text;
        },
        remove: vi.fn(),
      };
    },
  } as unknown as HTMLElement;
}

describe('ellipsis', () => {
  it('nullを渡すとnullを返す', () => {
    expect(ellipsis(null, createMockElement())).toBeNull();
  });

  it('undefinedを渡すとundefinedを返す', () => {
    expect(ellipsis(undefined, createMockElement())).toBeUndefined();
  });

  it('空文字を渡すと空文字を返す', () => {
    expect(ellipsis('', createMockElement())).toBe('');
  });

  it('clientWidthが4未満の場合、空文字を返す', () => {
    expect(ellipsis('テキスト', createMockElement(3))).toBe('');
  });

  it('テキストが収まる場合、そのまま返す', () => {
    const el = createMockElement(100, 50, Infinity);
    expect(ellipsis('あいうえお', el)).toBe('あいうえお');
  });

  it('テキストがあふれる場合、省略して"..."を付与する', () => {
    // overflowThreshold=5: 6文字以上でオーバーフロー、5文字以下で収まる
    const el = createMockElement(100, 50, 5);
    // "あいうえおか"(6文字) → 省略 → "あいうえお"(5文字) + "..."
    expect(ellipsis('あいうえおか', el)).toBe('あいうえお...');
  });

  it('テキストが大幅にあふれる場合、3文字以下まで削られると"..."のみになる', () => {
    // overflowThreshold=2: 3文字以上でオーバーフロー
    // "あいう"(3文字) → 削除できない(length<=3) → result="" → "..."
    const el = createMockElement(100, 50, 2);
    expect(ellipsis('あいう', el)).toBe('...');
  });

  it('長いテキストでも省略して"..."を付与する', () => {
    const el = createMockElement(100, 50, 5);
    const result = ellipsis('あいうえおかきくけこ', el);
    expect(result).toMatch(/\.\.\.$/);
    expect(result!.length).toBeLessThan(10);
  });

  it('末尾がASCII文字の場合、省略前に取り除いて"..."を付与する', () => {
    // overflowThreshold=4: "テストa"(4文字)まで削れるが、末尾の'a'はASCIIなので除去される
    // 結果: "テスト" + "..."
    const el = createMockElement(100, 50, 4);
    expect(ellipsis('テストabc', el)).toBe('テスト...');
  });
});
