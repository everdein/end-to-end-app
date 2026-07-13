export type FrontendErrorKind = 'global-error' | 'render-error' | 'unhandled-rejection';

export function createErrorReferenceId() {
  return `web-${globalThis.crypto.randomUUID()}`;
}

export function reportFrontendError(
  kind: FrontendErrorKind,
  error: unknown,
  referenceId = createErrorReferenceId()
) {
  const errorType = error instanceof Error ? error.name : 'UnknownError';

  // Do not add the error message, stack, application state, or request data here.
  // Financial values and credentials must never be copied into telemetry.
  console.error('Frontend error captured', { errorType, kind, referenceId });
  return referenceId;
}

let globalReportingInstalled = false;

export function installGlobalErrorReporting() {
  if (globalReportingInstalled) {
    return;
  }

  globalReportingInstalled = true;
  globalThis.addEventListener('error', (event) => {
    reportFrontendError('global-error', event.error);
  });
  globalThis.addEventListener('unhandledrejection', (event) => {
    reportFrontendError('unhandled-rejection', event.reason);
  });
}
