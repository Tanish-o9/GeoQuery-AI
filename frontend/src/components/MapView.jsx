import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap as useLeafletMap, Polygon as LeafletPolygon, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { useMap } from '../context/MapContext';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import CanvasGlobe from './CanvasGlobe';

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

const MapReferenceCapture = () => {
    const map = useLeafletMap();
    const { setMapInstance, mapProjectionMode } = useMap();
    
    useEffect(() => {
        if (map) {
            setMapInstance(map);
        }
    }, [map, setMapInstance]);

    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }, [map, mapProjectionMode]);
    
    return null;
};

const GeomanControls = () => {
    const map = useLeafletMap();
    const { setSelectedAOI, setAnalysisResults, isCompareMode, setSecondaryAOI } = useMap();

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

        map.pm.setGlobalOptions({
            limitMarkersToCount: 20,
        });

        // Handle shape creation
        map.on('pm:create', (e) => {
            const layer = e.layer;
            const geojson = layer.toGeoJSON();

            // Clear previous shapes to enforce single active AOI
            map.eachLayer((l) => {
                if (l._leaflet_id !== layer._leaflet_id && l.pm && !l._url) {
                    map.removeLayer(l);
                }
            });

            if (isCompareMode) {
                setSecondaryAOI(geojson.geometry);
            } else {
                setSelectedAOI(geojson.geometry);
                setAnalysisResults(null);
            }

            layer.on('pm:edit', (e) => {
                const updatedGeojson = e.layer.toGeoJSON();
                if (isCompareMode) {
                    setSecondaryAOI(updatedGeojson.geometry);
                } else {
                    setSelectedAOI(updatedGeojson.geometry);
                }
            });
        });

        map.on('pm:remove', () => {
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
    const { 
        gisLayers, 
        chatMessages, 
        routingPath, 
        ndviPoints, 
        congestionSegments, 
        selectedAOI, 
        secondaryAOI,
        mapProjectionMode,
        searchedLocationMarker
    } = useMap();
    
    // Find active markers and polygons from AI chat instructions
    const mapMarkers = [];
    const mapPolygons = [];
    
    chatMessages.forEach(msg => {
        if (msg.commands) {
            msg.commands.forEach(cmd => {
                if (cmd.action === "marker" && cmd.target) {
                    mapMarkers.push({
                        pos: cmd.target,
                        popup: cmd.popup || "AI Highlight"
                    });
                }
                if (cmd.action === "polygon" && cmd.geometry) {
                    mapPolygons.push({
                        geom: cmd.geometry,
                        color: cmd.color || "#0284c7"
                    });
                }
            });
        }
    });

    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={[22.2587, 71.1924]} // Gujarat, India
                zoom={7}
                className="h-full w-full z-0"
                style={{ background: '#0b0f19' }}
            >
            {/* 1. Base Map Layers */}
            {gisLayers.road.visible && (
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    opacity={gisLayers.road.opacity}
                />
            )}
            
            {gisLayers.satellite.visible && (
                <TileLayer
                    attribution='&copy; ESRI World Imagery'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    opacity={gisLayers.satellite.opacity}
                />
            )}
            
            {gisLayers.terrain.visible && (
                <TileLayer
                    attribution='&copy; OpenTopoMap'
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    opacity={gisLayers.terrain.opacity}
                />
            )}
            
            {gisLayers.hybrid.visible && (
                <>
                    <TileLayer
                        attribution='&copy; ESRI Satellite Hybrid'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        opacity={gisLayers.hybrid.opacity}
                    />
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        opacity={gisLayers.hybrid.opacity}
                    />
                </>
            )}

            {/* 2. Analytical Overlays */}
            {gisLayers.heatmap.visible && (
                <TileLayer
                    attribution='CartoDB Dark Matter'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    opacity={gisLayers.heatmap.opacity}
                />
            )}
            
            {gisLayers.population.visible && (
                <TileLayer
                    attribution='CartoDB Positron'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    opacity={gisLayers.population.opacity}
                />
            )}
            
            {gisLayers.ndvi.visible && (
                <TileLayer
                    attribution='NDVI Eco Proxy (CartoDB Explorer)'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png"
                    opacity={gisLayers.ndvi.opacity}
                />
            )}

            {/* Simulating Flood Hazard zones (tint overlays) */}
            {gisLayers.flood.visible && (
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                    opacity={gisLayers.flood.opacity}
                />
            )}

            {/* Simulating Forest Canopy index */}
            {gisLayers.forest.visible && (
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                    opacity={gisLayers.forest.opacity}
                />
            )}

            {/* AI Generated Polygons highlights */}
            {mapPolygons.map((poly, idx) => {
                const coordinates = poly.geom.coordinates[0].map(c => [c[1], c[0]]); // Swap to LatLon
                return (
                    <LeafletPolygon
                        key={idx}
                        positions={coordinates}
                        pathOptions={{ color: poly.color, fillColor: poly.color, fillOpacity: 0.2, weight: 3 }}
                    />
                );
            })}

            {/* AI Generated Markers highlights */}
            {mapMarkers.map((marker, idx) => (
                <Marker key={idx} position={marker.pos}>
                    <Popup>
                        <span className="font-semibold text-xs">{marker.popup}</span>
                    </Popup>
                </Marker>
            ))}

            {/* 3. Advanced GIS Overlays */}
            {/* Emergency Response Route */}
            {routingPath && (
                <Polyline
                    positions={routingPath}
                    pathOptions={{ color: '#6366f1', weight: 5, dashArray: '5, 10', lineCap: 'round' }}
                />
            )}

            {/* Road Congestion Segments */}
            {congestionSegments.map((seg, idx) => (
                <Polyline
                    key={idx}
                    positions={seg.coords}
                    pathOptions={{ color: seg.color, weight: 6, opacity: 0.8 }}
                />
            ))}

            {/* NDVI stress heatpoints */}
            {ndviPoints.map((pt, idx) => (
                <CircleMarker
                    key={idx}
                    center={[pt.lat, pt.lng]}
                    radius={8}
                    pathOptions={{ fillColor: pt.color, color: '#111827', weight: 1.5, fillOpacity: 0.9 }}
                >
                    <Popup>
                        <div className="text-xs text-gray-900">
                            <p className="font-bold">{pt.status}</p>
                            <p>NDVI Score: {pt.value}</p>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}

            {/* Programmatic Drawn or Uploaded Shapes */}
            {selectedAOI && selectedAOI.coordinates && (
                <LeafletPolygon
                    positions={
                        selectedAOI.type === 'Polygon'
                            ? selectedAOI.coordinates[0].map(c => [c[1], c[0]])
                            : selectedAOI.type === 'MultiPolygon'
                            ? selectedAOI.coordinates[0][0].map(c => [c[1], c[0]])
                            : []
                    }
                    pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.1, weight: 3 }}
                />
            )}

            {secondaryAOI && secondaryAOI.coordinates && (
                <LeafletPolygon
                    positions={
                        secondaryAOI.type === 'Polygon'
                            ? secondaryAOI.coordinates[0].map(c => [c[1], c[0]])
                            : secondaryAOI.type === 'MultiPolygon'
                            ? secondaryAOI.coordinates[0][0].map(c => [c[1], c[0]])
                            : []
                    }
                    pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.1, weight: 3 }}
                />
            )}

            {searchedLocationMarker && (
                <Marker 
                    position={[searchedLocationMarker.lat, searchedLocationMarker.lon]}
                >
                    <Popup>
                        <div className="p-2 text-xs font-sans text-gray-900 min-w-[170px] bg-white rounded-lg">
                            <h4 className="font-bold text-sky-700 border-b border-gray-100 pb-1 mb-1.5 truncate">
                                📍 {searchedLocationMarker.name.split(',')[0]}
                            </h4>
                            <div className="space-y-1 font-semibold text-[11px] text-gray-705">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-450 font-normal">Weather:</span>
                                    <span>{searchedLocationMarker.condition}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-450 font-normal">Temp:</span>
                                    <span className="text-emerald-600 font-bold">{searchedLocationMarker.temp}°C</span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            )}

            <GeomanControls />
            <SearchControl />
            <MapReferenceCapture />
        </MapContainer>
        </div>
    );
};

export default MapView;
