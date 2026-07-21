import { useEffect, useState } from "react";
import api from "../api/axios";

const todayStr = () => new Date().toISOString().slice(0, 10);

const BookingForm = ({ amenity, onCreated, onClose }) => {
  const [form, setForm] = useState({
    bookingDate: todayStr(),
    checkInTime: amenity.openTime,
    checkOutTime: amenity.closeTime,
    notes: "",
  });
  const [existingBookings, setExistingBookings] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get(`/amenities/${amenity._id}`, {
          params: { date: form.bookingDate },
        });
        setExistingBookings(res.data.data.bookings.filter((b) => b.status !== "Cancelled"));
      } catch {
        setExistingBookings([]);
      }
    };
    fetchBookings();
  }, [amenity._id, form.bookingDate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/bookings", { amenity: amenity._id, ...form });
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div>
        <label className="label">Date</label>
        <input
          type="date"
          className="input"
          name="bookingDate"
          min={todayStr()}
          value={form.bookingDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Check-in</label>
          <input
            type="time"
            className="input"
            name="checkInTime"
            value={form.checkInTime}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="label">Check-out</label>
          <input
            type="time"
            className="input"
            name="checkOutTime"
            value={form.checkOutTime}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input" name="notes" rows={2} value={form.notes} onChange={handleChange} />
      </div>

      {existingBookings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-medium text-amber-800 mb-1">Already booked on this date:</p>
          <ul className="text-xs text-amber-700 space-y-0.5">
            {existingBookings.map((b) => (
              <li key={b._id}>
                {b.checkInTime} - {b.checkOutTime} ({b.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Booking..." : "Confirm booking"}
        </button>
      </div>
    </form>
  );
};

export default BookingForm;
