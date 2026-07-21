import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../api/socket";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = () => {
    api
      .get("/dashboard/overview")
      .then((res) => setOverview(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();

    // Real-time refresh whenever maintenance or bookings change - events are
    // targeted server-side, so this only fires for updates relevant to me.
    const refresh = () => fetchOverview();
    socket.on("maintenance:created", refresh);
    socket.on("maintenance:updated", refresh);
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    socket.on("feedback:created", refresh);

    return () => {
      socket.off("maintenance:created", refresh);
      socket.off("maintenance:updated", refresh);
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
      socket.off("feedback:created", refresh);
    };
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-gray-500 text-sm">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
      </div>
    );
  }

  const { maintenance, amenities, satisfaction } = overview;
  const role = user?.role;

  const SatisfactionCard = ({ label = "Satisfaction score" }) => (
    <StatCard
      label={label}
      value={satisfaction.avgRating !== null ? `${satisfaction.avgRating} / 5` : "No ratings yet"}
      hint={`Target: ≥ 4/5 · ${satisfaction.count} rating${satisfaction.count === 1 ? "" : "s"}`}
      accent={
        satisfaction.meetsTarget === null ? "text-gray-500" : satisfaction.meetsTarget ? "text-green-600" : "text-amber-600"
      }
    />
  );

  const Header = ({ subtitle }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 border border-primary-200 px-2.5 py-0.5 text-xs font-medium capitalize">
          {role} view
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );

  const QuickAction = ({ label, onClick }) => (
    <button
      onClick={onClick}
      className="card text-left hover:border-primary-300 hover:shadow-md transition-all"
    >
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-xs text-primary-600 mt-1">Go &rarr;</p>
    </button>
  );

  // ---------- TENANT DASHBOARD ----------
  // Focused entirely on the tenant's own activity: their requests, their
  // bookings, and quick actions to raise a request or book an amenity.
  if (role === "tenant") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header subtitle="Here's what's happening with your requests and bookings." />

        {satisfaction.pendingFeedbackCount > 0 && (
          <button
            onClick={() => navigate("/maintenance")}
            className="w-full text-left mb-8 rounded-xl border border-primary-300 bg-primary-50 px-5 py-4 hover:bg-primary-100 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-primary-900">
                {satisfaction.pendingFeedbackCount} completed request
                {satisfaction.pendingFeedbackCount > 1 ? "s" : ""} waiting for your rating
              </p>
              <p className="text-sm text-primary-700 mt-0.5">
                Let your owner know how the resolution went — it only takes a second.
              </p>
            </div>
            <span className="text-primary-700 font-medium text-sm">Rate now &rarr;</span>
          </button>
        )}

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">My maintenance requests</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Pending" value={maintenance.pending} accent="text-amber-600" />
          <StatCard label="In Progress" value={maintenance.inProgress} accent="text-blue-600" />
          <StatCard label="Completed" value={maintenance.completed} accent="text-green-600" />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">My amenity bookings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard label="Total bookings" value={amenities.totalBookings} />
          <StatCard label="Today's bookings" value={amenities.todaysBookings} />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickAction label="Raise a maintenance request" onClick={() => navigate("/maintenance")} />
          <QuickAction label="Book an amenity" onClick={() => navigate("/amenities")} />
        </div>
      </div>
    );
  }

  // ---------- STAFF DASHBOARD ----------
  // Only shows what's assigned to this staff member - their workload, not
  // the whole property's requests, which they never see anyway.
  if (role === "staff") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header subtitle="Here's your current maintenance workload." />

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">My assigned tasks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending" value={maintenance.pending} accent="text-amber-600" />
          <StatCard label="In Progress" value={maintenance.inProgress} accent="text-blue-600" />
          <StatCard label="Completed" value={maintenance.completed} accent="text-green-600" />
          <StatCard label="Completion rate" value={`${maintenance.completionRate}%`} accent="text-primary-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard
            label="My avg. resolution time"
            value={`${maintenance.avgResolutionHours} hrs`}
            hint="Target: ≤ 48 hours"
          />
          <StatCard label="Total assigned to me" value={maintenance.totalRequests} />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Tenant satisfaction (my resolved requests)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <SatisfactionCard label="My satisfaction score" />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Amenities (property-wide)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard label="Total bookings" value={amenities.totalBookings} />
          <StatCard label="Today's bookings" value={amenities.todaysBookings} />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction label="View my assigned requests" onClick={() => navigate("/maintenance")} />
          <QuickAction label="Manage amenity bookings" onClick={() => navigate("/amenities")} />
          <QuickAction label="Read tenant feedback" onClick={() => navigate("/feedback")} />
        </div>
      </div>
    );
  }

  // ---------- OWNER / ADMIN DASHBOARD ----------
  // Full property-wide picture, plus a highlighted alert for anything still
  // waiting to be assigned to staff - this is the one place that surfaces
  // that queue front and center.
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Header subtitle="Here's the full real-time picture of your property." />

      {maintenance.unassignedCount > 0 && (
        <button
          onClick={() => navigate("/maintenance")}
          className="w-full text-left mb-8 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-amber-900">
              {maintenance.unassignedCount} request{maintenance.unassignedCount > 1 ? "s" : ""} waiting to be
              assigned
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              New requests come to you first — assign them to staff to get them moving.
            </p>
          </div>
          <span className="text-amber-700 font-medium text-sm">Assign now &rarr;</span>
        </button>
      )}

      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Maintenance overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending" value={maintenance.pending} accent="text-amber-600" />
        <StatCard label="In Progress" value={maintenance.inProgress} accent="text-blue-600" />
        <StatCard label="Completed" value={maintenance.completed} accent="text-green-600" />
        <StatCard
          label="Completion rate"
          value={`${maintenance.completionRate}%`}
          hint="Target: ≥ 90%"
          accent="text-primary-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Avg. resolution time"
          value={`${maintenance.avgResolutionHours} hrs`}
          hint="Target: ≤ 48 hours"
        />
        <StatCard label="Total requests" value={maintenance.totalRequests} />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">User satisfaction</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <SatisfactionCard />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Amenity overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active amenities" value={amenities.totalAmenities} />
        <StatCard label="Total bookings" value={amenities.totalBookings} />
        <StatCard label="Today's bookings" value={amenities.todaysBookings} />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction label="Manage amenities" onClick={() => navigate("/manage-amenities")} />
        <QuickAction label="Property settings" onClick={() => navigate("/property-settings")} />
        <QuickAction label="Messages" onClick={() => navigate("/messages")} />
        <QuickAction label="Read tenant feedback" onClick={() => navigate("/feedback")} />
      </div>
    </div>
  );
};

export default Dashboard;
