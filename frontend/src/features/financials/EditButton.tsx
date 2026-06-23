export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className="action-button edit-icon" onClick={onClick} type="button">
      Edit
    </button>
  );
}
