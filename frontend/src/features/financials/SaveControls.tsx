import { FINANCIALS_EXPORT_PATH } from '../../api/endpoints/financials';

export function SaveControls({
  exportHref = FINANCIALS_EXPORT_PATH,
  isDirty,
  onReset,
  onSave,
  saving,
}: {
  exportHref?: string;
  isDirty: boolean;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="save-actions">
      <button disabled={saving || !isDirty} onClick={onSave} type="button">
        Save Changes
      </button>
      <button className="ghost" disabled={!isDirty} onClick={onReset} type="button">
        Reset
      </button>
      <a
        aria-label="Export saved financial snapshot backup"
        className="button-link ghost"
        href={exportHref}
      >
        Export Backup
      </a>
    </div>
  );
}
