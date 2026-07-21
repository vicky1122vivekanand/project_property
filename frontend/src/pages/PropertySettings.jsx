import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const PropertySettings = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", address: "", unit: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.property) {
      setLoading(false);
      return;
    }
    api
      .get(`/properties/${user.property}`)
      .then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name || "",
          address: p.address || "",
          unit: p.unit || "",
          description: p.description || "",
        });
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load property"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.put(`/properties/${user.property}`, form);
      setSuccess("Property details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update property");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Loading property details...</div>;
  }

  if (!user?.property) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No property is linked to your account yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Property settings</h1>
        <p className="text-sm text-gray-500 mt-1">View and update the details of your property.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">{success}</div>
        )}
        <div>
          <label className="label">Property name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" name="address" value={form.address} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Unit / block (optional)</label>
          <input className="input" name="unit" value={form.unit} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" name="description" rows={3} value={form.description} onChange={handleChange} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
};

export default PropertySettings;
