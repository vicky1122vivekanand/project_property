import { useState } from "react";
import api from "../api/axios";
import StarRating from "./StarRating";

const FeedbackForm = ({ request, onSubmitted, onClose }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/feedback", {
        maintenanceRequest: request._id,
        rating,
        comment,
      });
      onSubmitted(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div>
        <p className="text-sm text-gray-600 mb-2">
          How satisfied were you with the resolution of "{request.issueTitle}"?
        </p>
        <StarRating value={rating} onChange={setRating} size="text-3xl" />
      </div>

      <div>
        <label className="label">Comments (optional)</label>
        <textarea
          className="input"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more about your experience..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : "Submit feedback"}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;
