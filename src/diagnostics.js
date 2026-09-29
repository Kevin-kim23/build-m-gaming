// No analytics or remote reporting. Errors stay in the local browser console.
export function reportError(area, error) {
  const details = {
    area,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    time: new Date().toISOString(),
  };
  console.error("[부대 키우기]", JSON.stringify(details));
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
