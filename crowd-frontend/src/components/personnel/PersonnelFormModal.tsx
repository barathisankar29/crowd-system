import { useEffect, useState } from "react";
import { createPersonnel, updatePersonnel } from "../../api/personnel";
import { ApiError } from "../../api/client";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import type { Personnel, PersonnelStatus } from "../../types/personnel";

const ZONE_OPTIONS = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F", "Zone G", "Zone H", "Zone I"];
const STATUS_OPTIONS: PersonnelStatus[] = ["on-duty", "responding", "break", "off-duty", "inactive"];

const EMPTY_DRAFT = {
  id: "",
  name: "",
  rank: "",
  phone: "",
  email: "",
  department: "",
  zone: "",
  shift: "",
  status: "on-duty" as PersonnelStatus,
};

export function PersonnelFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Personnel | null;
  onClose: () => void;
  onSaved: (personnel: Personnel) => void;
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Resets the form to a clean slate each time the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setDraft(
      editing
        ? {
            id: editing.id,
            name: editing.name,
            rank: editing.rank,
            phone: editing.phone,
            email: editing.email,
            department: editing.department,
            zone: editing.zone,
            shift: editing.shift,
            status: editing.status,
          }
        : EMPTY_DRAFT
    );
  }, [open, editing]);

  const set = (field: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = editing ? await updatePersonnel(editing.id, draft) : await createPersonnel(draft);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? `Edit ${editing.name}` : "Add Personnel"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="personnel-form" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add personnel"}
          </button>
        </>
      }
    >
      <form id="personnel-form" onSubmit={handleSubmit}>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="pf-id">Personnel ID</label>
            <input
              id="pf-id"
              className="form-input"
              value={draft.id}
              disabled={!!editing}
              onChange={set("id")}
              placeholder="SC-009"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pf-name">Name</label>
            <input id="pf-name" className="form-input" value={draft.name} onChange={set("name")} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="pf-rank">Rank / Role</label>
            <input id="pf-rank" className="form-input" value={draft.rank} onChange={set("rank")} placeholder="Patrol Officer" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pf-department">Department</label>
            <input id="pf-department" className="form-input" value={draft.department} onChange={set("department")} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" className="form-input" value={draft.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pf-email">Email</label>
            <input id="pf-email" type="email" className="form-input" value={draft.email} onChange={set("email")} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="pf-zone">Assigned Zone</label>
            <Select
              id="pf-zone"
              value={draft.zone}
              onChange={(value) => setDraft((prev) => ({ ...prev, zone: value }))}
              placeholder="Select a zone…"
              options={ZONE_OPTIONS.map((z) => ({ value: z, label: z }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pf-shift">Shift</label>
            <input id="pf-shift" className="form-input" value={draft.shift} onChange={set("shift")} placeholder="Morning" />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="pf-status">Availability / Status</label>
          <Select
            id="pf-status"
            value={draft.status}
            onChange={(value) => setDraft((prev) => ({ ...prev, status: value as PersonnelStatus }))}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace("-", " ") }))}
          />
        </div>
      </form>
    </Modal>
  );
}
