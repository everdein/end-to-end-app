export function RemoveButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="action-button danger-icon"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      Remove
    </button>
  );
}
