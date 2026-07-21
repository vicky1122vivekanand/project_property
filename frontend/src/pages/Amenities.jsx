import { useEffect, useState } from "react";
import api from "../api/axios";
import socket from "../api/socket";
import { useAuth } from "../context/AuthContext";
import AmenityCard from "../components/AmenityCard";
import BookingForm from "../components/BookingForm";
import BookingList from "../components/BookingList";
import Modal from "../components/Modal";

const Amenities = () => {
  const { user } = useAuth();
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const canManageBookings = ["staff", "owner", "admin"].includes(user?.role);
  const canBook = ["tenant", "staff"].includes(user?.role);
  const [view, setView] = useState(() => (["owner", "admin"].includes(user?.role) ? "bookings" : "amenities")); // 'amenities' | 'bookings'

  const fetchData = async () => {
    try {
      const [amenityRes, bookingRes] = await Promise.all([
        api.get("/amenities"),
        api.get("/bookings", { params: canManageBookings ? {} : { mine: true } }),
      ]);
      setAmenities(amenityRes.data.data);
      setBookings(bookingRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load amenities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleBookingCreated = (booking) => {
      setBookings((prev) => {
        // Only add to "my bookings" view if relevant; simplest: refetch bookings list
        return prev;
      });
      fetchData();
    };
    const handleBookingUpdated = () => fetchData();
    const handleAmenityUpdated = (updatedAmenity) => {
      setAmenities((prev) => prev.map((a) => (a._id === updatedAmenity._id ? { ...a, ...updatedAmenity } : a)));
    };

    socket.on("booking:created", handleBookingCreated);
    socket.on("booking:updated", handleBookingUpdated);
    socket.on("amenity:updated", handleAmenityUpdated);

    return () => {
      socket.off("booking:created", handleBookingCreated);
      socket.off("booking:updated", handleBookingUpdated);
      socket.off("amenity:updated", handleAmenityUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update booking");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Amenities</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canBook
              ? "Check availability and book shared amenities conflict-free."
              : "Manage bookings and monitor amenity usage for your property."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("amenities")}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              view === "amenities" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            {canBook ? "Browse" : "Amenities list"}
          </button>
          <button
            onClick={() => setView("bookings")}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              view === "bookings" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            {canManageBookings ? "All bookings" : "My bookings"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : view === "amenities" ? (
        amenities.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-gray-500 text-sm">No amenities available for your property yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {amenities.map((a) => (
              <AmenityCard key={a._id} amenity={a} onBookClick={setSelectedAmenity} canBook={canBook} />
            ))}
          </div>
        )
      ) : (
        <BookingList bookings={bookings} onStatusChange={handleStatusChange} canManage={canManageBookings} />
      )}

      {selectedAmenity && (
        <Modal title={`Book ${selectedAmenity.name}`} onClose={() => setSelectedAmenity(null)}>
          <BookingForm
            amenity={selectedAmenity}
            onCreated={() => fetchData()}
            onClose={() => setSelectedAmenity(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Amenities;
