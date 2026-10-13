import {randomUUID} from 'node:crypto';

// Internal metadata only. Existing Firestore rules deny all direct client access.
export const STATE_PATH = 'costControl/monthlyBudget';
export function leaseStore(db, now = Date.now) {
  const ref = db.doc(STATE_PATH);
  return {async exclusive(run) {
    const owner = randomUUID();
    const initial = await db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data() ?? {};
      if ((data.lease?.until ?? 0) > now()) return null;
      // Runtime is capped at 300s. A dead invocation's lease expires after 360s.
      tx.set(ref, {lease: {owner, until: now() + 360_000}}, {merge: true});
      return data.state ?? {};
    });
    if (initial === null) return {status: 'busy'};
    const checkpoint = async state => db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data();
      if (data?.lease?.owner !== owner || data.lease.until <= now()) throw Error('cost-lease-lost');
      if (data.state?.hold === true) throw Error('cost-operator-hold');
      tx.update(ref, {state, updatedAt: now()});
    });
    try {return await run(initial, checkpoint);}
    finally {
      await db.runTransaction(async tx => {
        const data = (await tx.get(ref)).data();
        if (data?.lease?.owner === owner) tx.update(ref, {lease: {owner: '', until: 0}});
      });
    }
  }};
}
