import StatusBadge from "./StatusBadge";

const BookingList = ({ bookings, onStatusChange, canManage }) => {
  if (!bookings.length) {
    return (
      <div className="card text-center py-10">
        <p className="text-gray-500 text-sm">No bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Amenity</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Booked by</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            {canManage && <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <tr key={b._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{b.amenity?.name || "-"}</td>
              <td className="px-4 py-3 text-gray-600">{b.bookedBy?.name || "-"}</td>
              <td className="px-4 py-3 text-gray-600">{b.bookingDate}</td>
              <td className="px-4 py-3 text-gray-600">{b.checkInTime}</td>
              <td className="px-4 py-3 text-gray-600">{b.checkOutTime}</td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
              {canManage && (
                <td className="px-4 py-3 space-x-2">
                  {b.status === "Booked" && (
                    <button
                      onClick={() => onStatusChange(b._id, "Checked-In")}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Check-in
                    </button>
                  )}
                  {b.status === "Checked-In" && (
                    <button
                      onClick={() => onStatusChange(b._id, "Checked-Out")}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Check-out
                    </button>
                  )}
                  {(b.status === "Booked" || b.status === "Checked-In") && (
                    <button
                      onClick={() => onStatusChange(b._id, "Cancelled")}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingList;
