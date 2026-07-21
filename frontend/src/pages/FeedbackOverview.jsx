import { useEffect, useState } from "react";
import api from "../api/axios";
import socket from "../api/socket";
import { useAuth } from "../context/AuthContext";
import StarRating from "../components/StarRating";

const FeedbackOverview = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [listRes, summaryRes] = await Promise.all([api.get("/feedback"), api.get("/feedback/summary")]);
      setFeedback(listRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // New feedback is targeted server-side to the tenant, the owner, and
    // the assigned staff member - so this only fires for people it's
    // actually relevant to.
    const refresh = () => fetchData();
    socket.on("feedback:created", refresh);
    return () => socket.off("feedback:created", refresh);
  }, []);

  const heading =
    user?.role === "staff"
      ? "Feedback on my resolved requests"
      : user?.role === "tenant"
      ? "My feedback history"
      : "Tenant feedback";

  const subtitle =
    user?.role === "staff"
      ? "See how tenants rated the requests you personally resolved."
      : user?.role === "tenant"
      ? "Ratings and comments you've submitted after requests were completed."
      : "All satisfaction ratings and comments across your property, most recent first.";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          {summary && (
            <div className="card flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Average satisfaction score</p>
                <p
                  className={`text-3xl font-semibold mt-1 ${
                    summary.meetsTarget === null
                      ? "text-gray-500"
                      : summary.meetsTarget
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {summary.avgRating !== null ? `${summary.avgRating} / 5` : "No ratings yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Target: ≥ 4/5 · {summary.count} rating{summary.count === 1 ? "" : "s"} total
                </p>
              </div>
              {summary.avgRating !== null && <StarRating value={Math.round(summary.avgRating)} readOnly size="text-2xl" />}
            </div>
          )}

          {feedback.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 text-sm">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((f) => (
                <div key={f._id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{f.maintenanceRequest?.issueTitle || "Request"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {f.maintenanceRequest?.category} · {f.submittedBy?.name || "Tenant"} ·{" "}
                        {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StarRating value={f.rating} readOnly size="text-base" />
                  </div>
                  {f.comment && <p className="text-sm text-gray-600 mt-3">{f.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeedbackOverview;
