// Korean calendar day number (UTC+9). Daily limits reset at Korean midnight.
export function rewardDay(now){return Math.floor((now+9*3600000)/86400000);}
