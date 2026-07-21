import StatusBadge from "./StatusBadge";
import StarRating from "./StarRating";

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];

const MaintenanceList = ({
  requests,
  canUpdate,
  onStatusChange,
  canAssignStaff,
  staffList = [],
  onAssign,
  emptyMessage = "No maintenance requests yet.",
  showFeedbackColumn = false,
  feedbackByRequestId = {},
  onRateClick,
}) => {
  if (!requests.length) {
    return (
      <div className="card text-center py-10">
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Issue</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Property</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Requested by</th>
            {canAssignStaff && <th className="px-4 py-3 text-left font-medium text-gray-500">Assigned to</th>}
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            {showFeedbackColumn && <th className="px-4 py-3 text-left font-medium text-gray-500">Satisfaction</th>}
            <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{r.issueTitle}</p>
                <p className="text-gray-500 text-xs mt-0.5 max-w-xs truncate">{r.issueDescription}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">{r.property?.name || "-"}</td>
              <td className="px-4 py-3 text-gray-600">{r.category}</td>
              <td className="px-4 py-3">
                <StatusBadge status={r.priority} />
              </td>
              <td className="px-4 py-3 text-gray-600">{r.requestedBy?.name || "-"}</td>
              {canAssignStaff && (
                <td className="px-4 py-3">
                  <select
                    value={r.assignedTo?._id || ""}
                    onChange={(e) => onAssign(r._id, e.target.value)}
                    className="rounded-lg border border-gray-300 text-xs px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
              )}
              <td className="px-4 py-3">
                {canUpdate ? (
                  <select
                    value={r.status}
                    onChange={(e) => onStatusChange(r._id, e.target.value)}
                    className="rounded-lg border border-gray-300 text-xs px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={r.status} />
                )}
              </td>
              {showFeedbackColumn && (
                <td className="px-4 py-3">
                  {r.status !== "Completed" ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : feedbackByRequestId[r._id] ? (
                    <StarRating value={feedbackByRequestId[r._id].rating} readOnly size="text-sm" />
                  ) : (
                    <button
                      onClick={() => onRateClick(r)}
                      className="text-xs text-primary-600 hover:underline font-medium"
                    >
                      Rate now
                    </button>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaintenanceList;
