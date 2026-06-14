/**
 * valueが数値の場合、単位を付与して文字列に変換する
 * それ以外はそのまま返す
 * @param value
 * @param unit
 * @returns
 */
export default function unit(
  value: string | number | null | undefined,
  unit: string = 'px',
) {
  if (typeof value === 'number') {
    return `${value}${unit}`;
  } else {
    return value;
  }
}
