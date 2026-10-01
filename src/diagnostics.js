// No analytics or remote reporting. Errors stay on this device: the console and a short local log
// (see error-log.js) that the info screen can show and copy.
import { errorLog } from "./error-log.js";

export function reportError(area, error) {
  const details = {
    area,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    time: new Date().toISOString(),
  };
  console.error("[부대 키우기]", JSON.stringify(details));
  errorLog.add(details);
}
export function installErrorReporting() {
  const onError = (event) =>
    reportError("uncaught", event.error ?? event.message);
  const onRejection = (event) => reportError("promise", event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
