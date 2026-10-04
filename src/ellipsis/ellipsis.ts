const isHalfWidth = /[\u0020-\u007E]/;

/**
 * 文字列をエレメントのサイズに収まる長さに編集して返す
 * @param text 文字列
 * @param element 文字列の描画対象のエレメント
 * @returns エレメントに収まる長さの文字列
 */
export default function ellipsis(
  text: string | null | undefined,
  element: HTMLElement,
) {
  if (text == null || !text.length) {
    return text;
  }

  const width = element.clientWidth;
  if (width < 4) {
    return '';
  }
  const height = element.clientHeight;

  const el = element.cloneNode() as HTMLElement;
  const style = el.style;
  style.visibility = 'hidden';
  style.position = 'absolute';
  style.transform = 'translateX(-1000000px)';
  style.width = `${width}px`;
  style.height = `${height}px`;

  let result = (el.textContent = text);
  let isTrimed = false;
  while (el.scrollHeight > el.clientHeight && el.scrollWidth > el.clientWidth) {
    isTrimed = true;
    if (result.length > 3) {
      el.textContent = result = result.substring(0, result.length - 1);
    } else {
      result = '';
      break;
    }
  }

  if (isTrimed) {
    if (result.length > 3) {
      while (_isUnwrappable(result[result.length - 1])) {
        result = result.substring(0, result.length - 1);
      }
    }
    result += '...';
  }

  el.remove();
  return result;
}

function _isUnwrappable(char: string) {
  return isHalfWidth.test(char) && char !== ' ';
}
