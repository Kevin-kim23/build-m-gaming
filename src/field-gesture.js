// Reward on release, after deciding tap versus swipe. No storage, timers or DOM reads.
export function createFieldGesture({max=4,threshold=8,staleMs=5000}={}) {
  const points=new Map();
  return {
    down(id,x,y,time) {
      for(const [key,p] of points)if(time-p.time>staleMs)points.delete(key);
      if(points.has(id)||points.size>=max)return false;
      points.set(id,{x,y,time,moved:false});return true;
    },
    move(id,x,y) {
      const p=points.get(id);if(!p)return false;
      if(Math.hypot(x-p.x,y-p.y)>threshold)for(const item of points.values())item.moved=true;
      return p.moved;
    },
    up(id,x,y) {
      this.move(id,x,y);
      const p=points.get(id);points.delete(id);return !!p&&!p.moved;
    },
    cancel(id) {points.delete(id);},
    scroll() {for(const p of points.values())p.moved=true;},
    clear() {points.clear();},
  };
}
