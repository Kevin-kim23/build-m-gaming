const numberFormat = new Intl.NumberFormat('ko-KR');
export const fmt = (value) => numberFormat.format(value);
