import { type KeyboardEvent, useEffect, useRef } from 'react';

export function ConfirmRemoveModal({
  itemName,
  itemType,
  onCancel,
  onConfirm,
}: {
  itemName: string;
  itemType: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    return () => {
      previouslyFocusedElement.current?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onCancel();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const cancelButton = cancelButtonRef.current;
    const confirmButton = confirmButtonRef.current;
    if (!cancelButton || !confirmButton) {
      return;
    }

    if (event.shiftKey && document.activeElement === confirmButton) {
      event.preventDefault();
      cancelButton.focus();
    } else if (!event.shiftKey && document.activeElement === cancelButton) {
      event.preventDefault();
      confirmButton.focus();
    }
  }

  return (
    <div
      aria-describedby="remove-modal-description"
      aria-labelledby="remove-modal-title"
      aria-modal="true"
      className="modal-backdrop"
      onKeyDown={handleKeyDown}
      role="dialog"
    >
      <div className="modal">
        <h2 id="remove-modal-title">Remove {itemType}?</h2>
        <p id="remove-modal-description">
          This will remove <strong>{itemName}</strong> from your draft. You can still use Reset to
          return to the last saved snapshot before saving changes.
        </p>
        <div className="modal-actions">
          <button className="danger" onClick={onConfirm} ref={confirmButtonRef} type="button">
            Remove
          </button>
          <button className="ghost" onClick={onCancel} ref={cancelButtonRef} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
