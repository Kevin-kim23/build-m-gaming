// Display only the price supplied by Play; never derive a payable price from a local estimate.
export function billingPriceLabel(value) {
  if(typeof value!=='string'||!value.trim())return '';
  const amount='((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]+)?)';
  const korean=value.trim().match(new RegExp(`^(?:₩\\s*|KRW\\s+)${amount}$`))
    ??value.trim().match(new RegExp(`^${amount}\\s*(?:원|₩)$`));
  return korean?`${korean[1]}₩`:value;
}
