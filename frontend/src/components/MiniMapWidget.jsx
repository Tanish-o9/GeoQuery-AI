import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';

const MiniMapWidget = () => {
    const { mapInstance } = useMap();
    const [center, setCenter] = useState([23.22, 72.63]); // Default Sector Gandhi Nagar
    const [zoom, setZoom] = useState(12);

    useEffect(() => {
        if (!mapInstance) return;

        const updateCoordinates = () => {
            const c = mapInstance.getCenter();
            setCenter([c.lat, c.lng]);
            setZoom(mapInstance.getZoom());
        };

        mapInstance.on('move', updateCoordinates);
        mapInstance.on('zoomend', updateCoordinates);

        // Run initially
        updateCoordinates();

        return () => {
            mapInstance.off('move', updateCoordinates);
            mapInstance.off('zoomend', updateCoordinates);
        };
    }, [mapInstance]);

    return (
        <div className="absolute bottom-5 left-5 z-[1000] w-52 bg-gray-900/90 border border-gray-800 rounded-xl p-3.5 shadow-xl text-white font-mono text-[10px] space-y-2 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-gray-800 pb-1.5 font-bold uppercase tracking-wider text-sky-400">
                <span>🛰️ GPS Centroid</span>
                <span className="text-[9px] bg-sky-950 px-1 py-0.5 rounded text-sky-300">EPSG:4326</span>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-500">Latitude:</span>
                    <span className="text-gray-200 font-bold">{center[0].toFixed(5)}° N</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Longitude:</span>
                    <span className="text-gray-200 font-bold">{center[1].toFixed(5)}° E</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Map Zoom:</span>
                    <span className="text-gray-200 font-bold">{zoom} / 18</span>
                </div>
            </div>

            <div className="border-t border-gray-800 pt-2 flex justify-between items-center text-[9px] text-gray-550">
                <span>Scale: ~{(156543 / Math.pow(2, zoom - 1)).toFixed(0)}m / pixel</span>
            </div>
        </div>
    );
};

export default MiniMapWidget;
