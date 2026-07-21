import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

const emptyForm = {
  name: "",
  description: "",
  capacity: 1,
  openTime: "08:00",
  closeTime: "22:00",
};

const ManageAmenities = () => {
  const { user } = useAuth();
  const [amenities, setAmenities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState({}); // amenityId -> reason text while marking unavailable
  const [togglingId, setTogglingId] = useState(null);

  const fetchAmenities = () => {
    api
      .get("/amenities", { params: { property: user?.property } })
      .then((res) => setAmenities(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load amenities"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAmenities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/amenities", { ...form, property: user.property, capacity: Number(form.capacity) });
      setForm(emptyForm);
      setSuccess("Amenity created successfully.");
      fetchAmenities();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create amenity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (amenity) => {
    const goingUnavailable = amenity.availabilityStatus !== "Unavailable";
    setError("");
    setTogglingId(amenity._id);
    try {
      const res = await api.put(`/amenities/${amenity._id}/availability`, {
        availabilityStatus: goingUnavailable ? "Unavailable" : "Available",
        unavailabilityReason: goingUnavailable ? reasonDrafts[amenity._id] || "" : "",
      });
      setAmenities((prev) => prev.map((a) => (a._id === amenity._id ? res.data.data : a)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update availability");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Manage amenities</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add shared amenities for your property and control their overall availability status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="card space-y-4 lg:col-span-1 h-fit">
          <h2 className="font-semibold text-gray-900 text-sm">Add new amenity</h2>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
              {success}
            </div>
          )}
          <div>
            <label className="label">Name</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Gym" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" name="description" rows={2} value={form.description} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Capacity (concurrent bookings)</label>
            <input
              type="number"
              min={1}
              className="input"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Opens at</label>
              <input type="time" className="input" name="openTime" value={form.openTime} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Closes at</label>
              <input type="time" className="input" name="closeTime" value={form.closeTime} onChange={handleChange} required />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Adding..." : "Add amenity"}
          </button>
        </form>

        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading amenities...</p>
          ) : amenities.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 text-sm">No amenities added yet. Use the form to add your first one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {amenities.map((a) => {
                const isAvailable = a.availabilityStatus !== "Unavailable";
                return (
                  <div key={a._id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{a.name}</p>
                          <StatusBadge status={a.availabilityStatus || "Available"} />
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Capacity: {a.capacity} · Hours: {a.openTime} - {a.closeTime}
                        </p>
                        {!isAvailable && a.unavailabilityReason && (
                          <p className="text-xs text-red-600 mt-1">Reason: {a.unavailabilityReason}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {isAvailable ? (
                        <>
                          <input
                            type="text"
                            placeholder="Reason (optional, e.g. under repair)"
                            className="input text-xs py-1.5 flex-1"
                            value={reasonDrafts[a._id] || ""}
                            onChange={(e) => setReasonDrafts({ ...reasonDrafts, [a._id]: e.target.value })}
                          />
                          <button
                            onClick={() => handleToggleAvailability(a)}
                            disabled={togglingId === a._id}
                            className="btn-danger text-xs px-3 py-1.5 whitespace-nowrap"
                          >
                            {togglingId === a._id ? "Updating..." : "Mark unavailable"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleToggleAvailability(a)}
                          disabled={togglingId === a._id}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          {togglingId === a._id ? "Updating..." : "Mark available again"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAmenities;
