import StatusBadge from "./StatusBadge";

const AmenityCard = ({ amenity, onBookClick, canBook = true }) => {
  const isAvailable = amenity.availabilityStatus !== "Unavailable";

  return (
    <div className="card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{amenity.name}</h3>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={amenity.availabilityStatus || "Available"} />
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              Capacity: {amenity.capacity}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{amenity.description}</p>
        <p className="text-xs text-gray-400 mt-3">
          Hours: {amenity.openTime} - {amenity.closeTime}
        </p>
        {amenity.property?.name && (
          <p className="text-xs text-gray-400 mt-1">Property: {amenity.property.name}</p>
        )}
        {!isAvailable && amenity.unavailabilityReason && (
          <p className="text-xs text-red-600 mt-2">Reason: {amenity.unavailabilityReason}</p>
        )}
      </div>
      {canBook &&
        (isAvailable ? (
          <button onClick={() => onBookClick(amenity)} className="btn-primary mt-4 w-full">
            Book now
          </button>
        ) : (
          <button disabled className="btn-secondary mt-4 w-full cursor-not-allowed opacity-60">
            Currently unavailable
          </button>
        ))}
    </div>
  );
};

export default AmenityCard;
