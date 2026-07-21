import { useEffect, useState } from "react";
import api from "../api/axios";
import socket from "../api/socket";
import { useAuth } from "../context/AuthContext";
import MaintenanceList from "../components/MaintenanceList";
import MaintenanceForm from "../components/MaintenanceForm";
import FeedbackForm from "../components/FeedbackForm";
import Modal from "../components/Modal";

const Maintenance = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [feedbackByRequestId, setFeedbackByRequestId] = useState({});
  const [rateTarget, setRateTarget] = useState(null);

  const canUpdateStatus = ["staff", "owner", "admin"].includes(user?.role);
  const canAssignStaff = ["owner", "admin"].includes(user?.role);
  const canCreateRequest = ["tenant", "owner"].includes(user?.role);
  const isTenant = user?.role === "tenant";
  const [hasBooking, setHasBooking] = useState(true); // assume true until checked, to avoid a flash of the warning

  const subtitle =
    user?.role === "tenant"
      ? "Track the status of requests you've raised. New requests go to your property owner first."
      : user?.role === "staff"
      ? "These are the requests your owner has assigned to you."
      : "New requests come to you first — assign them to staff to get them moving.";

  const filterChips = ["All", "Pending", "In Progress", "Completed", ...(canAssignStaff ? ["Unassigned"] : [])];

  const fetchRequests = () => {
    api
      .get("/maintenance")
      .then((res) => setRequests(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();

    if (canAssignStaff && user?.property) {
      api
        .get("/users", { params: { role: "staff", property: user.property } })
        .then((res) => setStaffList(res.data.data))
        .catch(() => setStaffList([]));
    }

    if (isTenant) {
      api
        .get("/bookings", { params: { mine: true } })
        .then((res) => setHasBooking(res.data.data.length > 0))
        .catch(() => setHasBooking(true)); // fail open, let the backend be the source of truth

      api
        .get("/feedback", { params: { mine: true } })
        .then((res) => {
          const map = {};
          res.data.data.forEach((f) => {
            const reqId = f.maintenanceRequest?._id || f.maintenanceRequest;
            map[reqId] = f;
          });
          setFeedbackByRequestId(map);
        })
        .catch(() => setFeedbackByRequestId({}));
    }

    const handleCreated = (newRequest) => {
      setRequests((prev) => [newRequest, ...prev]);
    };
    const handleUpdated = (updatedRequest) => {
      setRequests((prev) => {
        // Staff should only ever keep requests currently assigned to them -
        // if this update reassigns it elsewhere, drop it from their view.
        const stillVisibleToMe =
          user.role !== "staff" ||
          (updatedRequest.assignedTo && updatedRequest.assignedTo._id === user._id);

        if (!stillVisibleToMe) {
          return prev.filter((r) => r._id !== updatedRequest._id);
        }

        const exists = prev.some((r) => r._id === updatedRequest._id);
        if (exists) {
          return prev.map((r) => (r._id === updatedRequest._id ? updatedRequest : r));
        }
        // Wasn't in the list before (e.g. staff just got this assigned to them)
        return [updatedRequest, ...prev];
      });
    };

    socket.on("maintenance:created", handleCreated);
    socket.on("maintenance:updated", handleUpdated);

    return () => {
      socket.off("maintenance:created", handleCreated);
      socket.off("maintenance:updated", handleUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/maintenance/${id}/status`, { status });
      // UI updates via the socket event, no need to duplicate
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleAssign = async (id, staffId) => {
    try {
      await api.put(`/maintenance/${id}/assign`, { assignedTo: staffId || null });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign staff");
    }
  };

  const handleFeedbackSubmitted = (feedback) => {
    setFeedbackByRequestId((prev) => ({ ...prev, [feedback.maintenanceRequest]: feedback }));
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Unassigned") return !r.assignedTo;
    return r.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Maintenance requests</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {canCreateRequest &&
          (isTenant && !hasBooking ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs">
              Book an amenity at least once to unlock maintenance requests.
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + New request
            </button>
          ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        {filterChips.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              statusFilter === s
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading requests...</p>
      ) : (
        <MaintenanceList
          requests={filteredRequests}
          canUpdate={canUpdateStatus}
          onStatusChange={handleStatusChange}
          canAssignStaff={canAssignStaff}
          staffList={staffList}
          onAssign={handleAssign}
          showFeedbackColumn={isTenant}
          feedbackByRequestId={feedbackByRequestId}
          onRateClick={setRateTarget}
          emptyMessage={
            user?.role === "tenant"
              ? "You haven't raised any requests yet."
              : user?.role === "staff"
              ? "Nothing assigned to you yet — new requests go to the owner first."
              : "No maintenance requests yet."
          }
        />
      )}

      {showForm && (
        <Modal title="New maintenance request" onClose={() => setShowForm(false)}>
          <MaintenanceForm
            propertyId={user?.property}
            onCreated={() => {}}
            onClose={() => setShowForm(false)}
          />
        </Modal>
      )}

      {rateTarget && (
        <Modal title="Rate your experience" onClose={() => setRateTarget(null)}>
          <FeedbackForm
            request={rateTarget}
            onSubmitted={handleFeedbackSubmitted}
            onClose={() => setRateTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Maintenance;
