import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapCenter({ center, zoom }) {
  const map = useMap();
  if (center && center[0] != null && center[1] != null) {
    map.setView(center, zoom);
  }
  return null;
}

export default function GeoMap({ latitude, longitude, label, approximate }) {
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  if (!hasCoords) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
        Map not available for this location.
      </div>
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const center = [lat, lng];
  const zoom = approximate ? 4 : 10;
  const popupTitle = label || "Location";
  const popupSub = approximate ? " (Approximate location - country center)" : "";

  return (
    <div className="h-[300px] w-full overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        key={`${lat}-${lng}`}
      >
        <MapCenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            <strong>{popupTitle}</strong>
            {popupSub && <span className="block text-muted-foreground">{popupSub}</span>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
