// Battle HP is a simulation float, not money. Never pass it to exact currency math.
const format=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1});
export function battleNumber(value){
  const amount=Math.max(0,Math.ceil(value));
  const unit=[[1e16,'경'],[1e12,'조'],[1e8,'억'],[1e4,'만']].find(([size])=>amount>=size);
  return unit?format.format(amount/unit[0])+unit[1]:format.format(amount);
}
