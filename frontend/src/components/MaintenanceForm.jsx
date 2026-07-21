import { useState } from "react";
import api from "../api/axios";

const CATEGORIES = ["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const MaintenanceForm = ({ propertyId, onCreated, onClose }) => {
  const [form, setForm] = useState({
    issueTitle: "",
    issueDescription: "",
    category: "Other",
    priority: "Medium",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!propertyId) {
      setError("No property associated with your account yet.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/maintenance", { ...form, property: propertyId });
      onCreated(res.data.data);
      setForm({ issueTitle: "", issueDescription: "", category: "Other", priority: "Medium" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
      <div>
        <label className="label">Issue title</label>
        <input
          className="input"
          name="issueTitle"
          value={form.issueTitle}
          onChange={handleChange}
          placeholder="e.g. Leaking kitchen faucet"
          required
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          name="issueDescription"
          value={form.issueDescription}
          onChange={handleChange}
          rows={3}
          placeholder="Describe the issue in detail..."
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="input" name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" name="priority" value={form.priority} onChange={handleChange}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;
