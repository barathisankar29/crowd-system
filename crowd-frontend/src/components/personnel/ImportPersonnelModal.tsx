import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { confirmPersonnelImport, previewPersonnelImport } from "../../api/personnel";
import { ApiError } from "../../api/client";
import { Modal } from "../ui/Modal";
import type { ImportPreviewResult, ImportRowResult, ImportSummary } from "../../types/personnel";

type Step = "upload" | "preview" | "summary";

export function ImportPersonnelModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFileError(null);
    setPreview(null);
    setExcluded(new Set());
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setFileError(null);
    try {
      const result = await previewPersonnelImport(file);
      if (result.fileError) {
        setFileError(result.fileError);
        return;
      }
      setPreview(result);
      setExcluded(new Set(result.rows.filter((r) => r.errors.length > 0).map((r) => r.rowNumber)));
      setStep("preview");
    } catch (err) {
      setFileError(err instanceof ApiError ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (row: ImportRowResult) => {
    if (row.errors.length > 0) return; // error rows can never be included
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(row.rowNumber)) next.delete(row.rowNumber);
      else next.add(row.rowNumber);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const rowsToImport = preview.rows.filter((r) => r.errors.length === 0 && !excluded.has(r.rowNumber));
    setBusy(true);
    try {
      const result = await confirmPersonnelImport(rowsToImport);
      setSummary(result);
      setStep("summary");
      onImported();
    } catch (err) {
      setFileError(err instanceof ApiError ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const includedCount = preview ? preview.rows.filter((r) => r.errors.length === 0 && !excluded.has(r.rowNumber)).length : 0;

  return (
    <Modal open={open} title="Import Personnel from Excel" onClose={handleClose}>
      {step === "upload" && (
        <div>
          <div
            style={{
              border: "1.5px dashed var(--border-strong)", borderRadius: "var(--radius-md)", padding: "36px 20px",
              textAlign: "center", cursor: "pointer",
            }}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud size={28} color="var(--muted)" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>
              {busy ? "Reading file…" : "Click to choose a .xlsx file"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Columns: Personnel ID, Name, Rank, Phone, Email, Department, Zone, Shift, Status
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          {fileError && (
            <div className="form-error" style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
              <XCircle size={14} /> {fileError}
            </div>
          )}
        </div>
      )}

      {step === "preview" && preview && (
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} found — {includedCount} will be imported.
            Rows with errors are excluded automatically; use the checkbox to skip a row you don't want.
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Row</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Zone</th>
                  <th>Action</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const hasError = row.errors.length > 0;
                  const isExcluded = excluded.has(row.rowNumber);
                  return (
                    <tr key={row.rowNumber} style={{ opacity: hasError || isExcluded ? 0.55 : 1 }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!hasError && !isExcluded}
                          disabled={hasError}
                          onChange={() => toggleRow(row)}
                        />
                      </td>
                      <td className="mono">{row.rowNumber}</td>
                      <td>{row.data.id || "—"}</td>
                      <td>{row.data.name || "—"}</td>
                      <td>{row.data.zone || "—"}</td>
                      <td style={{ textTransform: "capitalize" }}>{row.action}</td>
                      <td>
                        {row.errors.map((e) => (
                          <div key={e} style={{ display: "flex", gap: 5, alignItems: "center", color: "var(--high)", fontSize: 11 }}>
                            <XCircle size={12} /> {e}
                          </div>
                        ))}
                        {row.warnings.map((w) => (
                          <div key={w} style={{ display: "flex", gap: 5, alignItems: "center", color: "var(--moderate)", fontSize: 11 }}>
                            <AlertTriangle size={12} /> {w}
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
              Choose a different file
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || includedCount === 0} onClick={handleConfirm}>
              {busy ? "Importing…" : `Confirm import (${includedCount})`}
            </button>
          </div>
        </div>
      )}

      {step === "summary" && summary && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <CheckCircle2 size={32} color="var(--safe)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Import complete</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total", value: summary.total },
              { label: "Imported", value: summary.imported },
              { label: "Updated", value: summary.updated },
              { label: "Failed", value: summary.failed },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--chip-bg)", borderRadius: "var(--radius-sm)", padding: "10px 6px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleClose}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
