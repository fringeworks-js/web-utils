import getElementById from './getElementById';

describe('getElementById の型', () => {
  it('型を指定しない場合はHTMLElement | nullを返す', () => {
    expectTypeOf(getElementById('id')).toEqualTypeOf<HTMLElement | null>();
  });

  it('受け取る変数の型から推論する', () => {
    const input: HTMLInputElement | null = getElementById('id');
    expectTypeOf(input).toEqualTypeOf<HTMLInputElement | null>();
  });

  it('引数の型から推論する', () => {
    const focus = (el: HTMLButtonElement | null) => el;
    expectTypeOf(
      focus(getElementById('id')),
    ).toEqualTypeOf<HTMLButtonElement | null>();
  });

  it('SVG要素を指定できる', () => {
    expectTypeOf(
      getElementById<SVGSVGElement>('id'),
    ).toEqualTypeOf<SVGSVGElement | null>();
  });

  it('Element以外は指定できない', () => {
    // @ts-expect-error Elementではない
    getElementById<Text>('id');
  });

  it('指定した型と異なる型の変数には代入できない', () => {
    // @ts-expect-error HTMLDivElementはHTMLInputElementに代入できない
    const input: HTMLInputElement | null = getElementById<HTMLDivElement>('id');
    expectTypeOf(input).toEqualTypeOf<HTMLInputElement | null>();
  });
});
