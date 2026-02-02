import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap as useLeafletMap } from 'react-leaflet';
import { useMap } from '../context/MapContext';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';

// Fix Leaflet's default icon path issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const GeomanControls = () => {
    const map = useLeafletMap();
    const { setSelectedAOI, setAnalysisResults, isCompareMode, setSecondaryAOI, setSecondaryAnalysisResults } = useMap();

    useEffect(() => {
        // Initialize Geoman controls
        map.pm.addControls({
            position: 'topleft',
            drawCircle: false,
            drawCircleMarker: false,
            drawMarker: false,
            drawPolyline: false,
            drawText: false,
            cutPolygon: false,
            rotateMode: false,
        });

        // Set global options
        map.pm.setGlobalOptions({
            limitMarkersToCount: 20,
        });

        // Handle shape creation
        map.on('pm:create', (e) => {
            const layer = e.layer;
            const geojson = layer.toGeoJSON();

            // Clear previous shapes to enforce single AOI
            map.eachLayer((l) => {
                if (l._leaflet_id !== layer._leaflet_id && l.pm && !l._url) {
                    map.removeLayer(l);
                }
            });

            // Set new AOI
            if (isCompareMode) {
                setSecondaryAOI(geojson.geometry);
            } else {
                setSelectedAOI(geojson.geometry);
                setAnalysisResults(null);
            }

            // Support editing
            layer.on('pm:edit', (e) => {
                const updatedGeojson = e.layer.toGeoJSON();
                if (isCompareMode) {
                    setSecondaryAOI(updatedGeojson.geometry);
                } else {
                    setSelectedAOI(updatedGeojson.geometry);
                }
            });
        });

        // Handle removal
        map.on('pm:remove', (e) => {
            setSelectedAOI(null);
            setAnalysisResults(null);
        });

        return () => {
            map.pm.removeControls();
        };
    }, [map, setSelectedAOI, setAnalysisResults, isCompareMode, setSecondaryAOI]);

    return null;
};

import SearchControl from './SearchControl';

const MapView = () => {
    return (
        <MapContainer
            center={[22.2587, 71.1924]} // Gujarat, India
            zoom={7}
            className="h-full w-full z-0"
            style={{ background: '#ffffff' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeomanControls />
            <SearchControl />
        </MapContainer>
    );
};

export default MapView;
