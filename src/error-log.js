// Keeps the most recent errors on the device so a player can copy them into a bug report.
// No network, no analytics. Written only when an error happens, never on a timer.
// This module must never call reportError (that would loop); its own failures go to console.warn.
export const ERROR_LOG_KEY = 'budae-kiugi-error-log';

const trim = (value, limit) => String(value ?? '').slice(0, limit);

export function createErrorLog({ storage = null, now = Date.now, max = 30, maxChars = 12000, dedupeMs = 3000 } = {}) {
  let memory = [];
  function read() {
    if (!storage) return memory;
    try {
      const list = JSON.parse(storage.getItem(ERROR_LOG_KEY) ?? '[]');
      return Array.isArray(list) ? list.filter((e) => e && typeof e === 'object' && typeof e.area === 'string') : [];
    } catch (error) {
      console.warn('[부대 키우기] error-log.read', error);
      return [];
    }
  }
  function write(entries) {
    memory = entries;
    if (!storage) return;
    try { storage.setItem(ERROR_LOG_KEY, JSON.stringify(entries)); } catch (error) { console.warn('[부대 키우기] error-log.write', error); }
  }
  return {
    list: read,
    add({ area, message, stack }) {
      const at = now(), entries = read().slice(-max);
      const area_ = trim(area, 60), message_ = trim(message, 300), last = entries.at(-1);
      if (last && last.area === area_ && last.message === message_ && at - last.at < dedupeMs) {
        last.count = (last.count ?? 1) + 1;
        last.at = at;
      } else {
        entries.push({ at, area: area_, message: message_, stack: stack ? trim(stack, 800) : undefined, count: 1 });
      }
      // Keep the stored text small: drop the oldest entries until it fits.
      while (entries.length > 1 && JSON.stringify(entries).length > maxChars) entries.shift();
      write(entries.slice(-max));
    },
    clear() { write([]); },
  };
}

export function formatTime(at) {
  const d = new Date(at), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Plain text the player can paste into a message. Contains no save data.
export function formatReport({ version, platform, status, saveVersion, viewport, userAgent, entries }) {
  const lines = [
    `부대 키우기 v${version} (${platform})`,
    `저장 상태: ${status}`,
    `저장 형식: ${saveVersion}`,
    `화면: ${viewport}`,
    `기기: ${userAgent}`,
    `오류 ${entries.length}개`,
  ];
  entries.forEach((e, i) => {
    lines.push(`[${i + 1}] ${formatTime(e.at)} ${e.area}${(e.count ?? 1) > 1 ? ` ×${e.count}` : ''}: ${e.message}`);
    if (e.stack) lines.push(...String(e.stack).split('\n').slice(0, 4).map((line) => `    ${line.trim()}`));
  });
  return lines.join('\n');
}

function browserStorage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (error) {
    console.warn('[부대 키우기] error-log.storage', error);
    return null;
  }
}
export const errorLog = createErrorLog({ storage: browserStorage() });
