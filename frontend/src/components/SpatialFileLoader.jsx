import React, { useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SpatialFileLoader = () => {
    const { setSelectedAOI, setAnalysisResults, mapInstance } = useMap();
    const [fileInfo, setFileInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        const l = toast.loading(`Validating geospatial format for ${file.name}...`);
        
        const formData = new FormData();
        formData.append("file", file);
        
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/validate-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setFileInfo({
                name: file.name,
                format: res.data.format,
                feature_count: res.data.feature_count
            });
            
            // Set the geometry in Context
            const geom = res.data.geometry;
            const targetGeometry = geom.type === 'FeatureCollection' ? geom.features[0].geometry : geom;
            setSelectedAOI(targetGeometry);
            setAnalysisResults(null);
            
            toast.success(`${res.data.format} loaded onto GIS map!`, { id: l });
            
            // Fly the Leaflet map to the geometry centroid
            if (mapInstance && targetGeometry.coordinates) {
                let center;
                if (targetGeometry.type === 'Polygon') {
                    const coords = targetGeometry.coordinates[0];
                    const lat = sum(coords.map(c => c[1])) / coords.length;
                    const lon = sum(coords.map(c => c[0])) / coords.length;
                    center = [lat, lon];
                } else if (targetGeometry.type === 'Point') {
                    center = [targetGeometry.coordinates[1], targetGeometry.coordinates[0]];
                }
                if (center) {
                    mapInstance.flyTo(center, 12, { animate: true });
                }
            }
        } catch (err) {
            console.error("Geospatial validation failed", err);
            const errMsg = err.response?.data?.detail || "Geospatial parsing failed. Check file format.";
            toast.error(errMsg, { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-16 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Upload Shapefile, GeoJSON, KML, or CSV"
            >
                📥 Import GIS File
            </button>
        );
    }

    return (
        <div className="absolute top-16 left-14 z-[1000] w-72 rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">📥 Geospatial Ingestion</span>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Dropzone */}
            <div className="p-4 space-y-3.5 text-xs">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                    Upload **Shapefile (.zip)**, **GeoJSON**, **KML**, or **CSV** (with lat/lon headers). The system will validate boundaries and mount features.
                </p>

                <div className="border border-dashed border-gray-750 hover:border-sky-500 rounded-xl p-4 bg-gray-950/50 transition-colors flex flex-col items-center justify-center text-center relative cursor-pointer group">
                    <input
                        type="file"
                        accept=".zip,.kml,.geojson,.json,.csv"
                        onChange={handleUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isLoading}
                    />
                    <svg className="w-8 h-8 text-sky-400/80 mb-2 group-hover:scale-105 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-semibold text-gray-300">Choose spatial file</span>
                    <span className="text-[9px] text-gray-500 mt-1">.zip, .geojson, .kml, .csv</span>
                </div>

                {/* File info */}
                {fileInfo && (
                    <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-1 text-[11px] leading-relaxed">
                        <div className="flex justify-between font-mono">
                            <span className="text-gray-400">File:</span>
                            <span className="text-gray-200 font-bold truncate max-w-[150px]">{fileInfo.name}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                            <span className="text-gray-400">Format:</span>
                            <span className="text-sky-300 font-bold">{fileInfo.format}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                            <span className="text-gray-400">Features:</span>
                            <span className="text-emerald-400 font-bold">{fileInfo.feature_count} detected</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">EPSG:4326 ingestion engine</span>
            </div>
        </div>
    );
};

export default SpatialFileLoader;
