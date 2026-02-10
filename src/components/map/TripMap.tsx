import { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '@/services/logicTravelApi';
import type { BuilderDay } from '@/store/useTripStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = markerIcon;

interface TripMapProps {
  day: BuilderDay | null;
  placesById: Map<string, Place>;
}

export const TripMap = ({ day, placesById }: TripMapProps) => {
  const coordinates = useMemo(() => {
    if (!day) return [];
    return day.events
      .map((event) => {
        const place = placesById.get(event.placeId);
        if (!place?.location?.coordinates) return null;
        const [lon, lat] = place.location.coordinates;
        return {
          event,
          place,
          lat,
          lon,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [day, placesById]);

  const mapCenter: [number, number] = coordinates.length
    ? [coordinates[0].lat, coordinates[0].lon]
    : [28.6139, 77.209];

  const polylinePositions = coordinates.map((item) => [item.lat, item.lon] as [number, number]);

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">Route Map</CardTitle>
      </CardHeader>
      <CardContent className="h-[52vh] p-3">
        <div className="h-full overflow-hidden rounded-xl border border-border">
          <MapContainer center={mapCenter} zoom={11} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {coordinates.map(({ event, place, lat, lon }, index) => (
              <Marker key={`${event.clientId}_${place._id}`} position={[lat, lon]}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">{index + 1}. {place.name}</p>
                    <p>{event.startTime || '--:--'} - {event.endTime || '--:--'}</p>
                    <p>Status: {event.validationStatus || 'VALID'}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{ color: '#0f766e', weight: 4, opacity: 0.8 }}
              />
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};

