const STYLES = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
  Booked: "bg-blue-100 text-blue-800 border-blue-200",
  "Checked-In": "bg-green-100 text-green-800 border-green-200",
  "Checked-Out": "bg-gray-100 text-gray-700 border-gray-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
  Low: "bg-gray-100 text-gray-700 border-gray-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Urgent: "bg-red-100 text-red-700 border-red-200",
  Available: "bg-green-100 text-green-800 border-green-200",
  Unavailable: "bg-red-100 text-red-700 border-red-200",
};

const StatusBadge = ({ status }) => {
  const style = STYLES[status] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
