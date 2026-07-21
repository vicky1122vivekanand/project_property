const StarRating = ({ value = 0, onChange, readOnly = false, size = "text-lg" }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`flex items-center gap-0.5 ${size}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          className={`leading-none ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"} ${
            star <= value ? "text-amber-500" : "text-gray-300"
          }`}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default StarRating;
