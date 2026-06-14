import unit from './unit';

describe('unit', () => {
  it('数値にデフォルト単位（px）を付与する', () => {
    expect(unit(10)).toBe('10px');
  });

  it('数値に指定した単位を付与する', () => {
    expect(unit(10, 'rem')).toBe('10rem');
  });

  it('0に単位を付与する', () => {
    expect(unit(0)).toBe('0px');
  });

  it('負の数値に単位を付与する', () => {
    expect(unit(-5, 'em')).toBe('-5em');
  });

  it('小数に単位を付与する', () => {
    expect(unit(1.5, '%')).toBe('1.5%');
  });

  it('文字列はそのまま返す', () => {
    expect(unit('10px')).toBe('10px');
  });

  it('空文字はそのまま返す', () => {
    expect(unit('')).toBe('');
  });

  it('nullはそのまま返す', () => {
    expect(unit(null)).toBeNull();
  });

  it('undefinedはそのまま返す', () => {
    expect(unit(undefined)).toBeUndefined();
  });
});
