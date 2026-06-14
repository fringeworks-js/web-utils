import getElementById from './getElementById';

describe('getElementById', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('存在する要素をIDで取得する', () => {
    const el = { id: 'test-id' } as HTMLElement;
    vi.stubGlobal('document', { getElementById: vi.fn().mockReturnValue(el) });
    expect(getElementById('test-id')).toBe(el);
  });

  it('存在しないIDの場合nullを返す', () => {
    vi.stubGlobal('document', { getElementById: vi.fn().mockReturnValue(null) });
    expect(getElementById('non-existent')).toBeNull();
  });

  it('指定したIDでdocument.getElementByIdを呼び出す', () => {
    const mockGetById = vi.fn().mockReturnValue(null);
    vi.stubGlobal('document', { getElementById: mockGetById });
    getElementById('my-id');
    expect(mockGetById).toHaveBeenCalledWith('my-id');
  });

  it('型パラメータで指定した型にキャストして返す', () => {
    const input = { id: 'my-input', value: 'hello' } as HTMLInputElement;
    vi.stubGlobal('document', { getElementById: vi.fn().mockReturnValue(input) });
    const result = getElementById<HTMLInputElement>('my-input');
    expect(result?.value).toBe('hello');
  });
});
