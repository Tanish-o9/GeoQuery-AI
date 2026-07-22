import React, { useEffect, useState, useRef } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const GisPlatformWidget = () => {
    const { selectedAOI, setSelectedAOI, mapInstance } = useMap();
    const [measurement, setMeasurement] = useState(null);
    const [bufferDist, setBufferDist] = useState(100); // 100 meters
    const [selectedYear, setSelectedYear] = useState(2025);
    const [timeTravelMetrics, setTimeTravelMetrics] = useState(null);
    const [interpreterResult, setInterpreterResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Track when user draws/changes selectedAOI -> measure it immediately!
    const measureShape = async () => {
        if (!selectedAOI) return;
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/measure', {
                geometry: selectedAOI
            });
            setMeasurement(res.data);
        } catch (e) {
            console.error("Measurement calculation failed", e);
        }
    };

    useEffect(() => {
        if (selectedAOI) {
            measureShape();
        } else {
            setMeasurement(null);
        }
    }, [selectedAOI]);

    // Apply Topological Buffer
    const handleApplyBuffer = async () => {
        if (!selectedAOI) {
            toast.error("Please draw a polygon boundary on the map first!");
            return;
        }
        setIsLoading(true);
        const l = toast.loading(`Calculating ${bufferDist}m buffer zone...`);
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/spatial-ops', {
                operation: "buffer",
                geometry_a: selectedAOI,
                buffer_distance_meters: bufferDist
            });
            setSelectedAOI(res.data.geometry);
            toast.success("Buffer boundary applied to map!", { id: l });
        } catch (err) {
            toast.error("Buffer calculation failed.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Apply Convex Hull
    const handleConvexHull = async () => {
        if (!selectedAOI) {
            toast.error("Please draw a polygon boundary on the map first!");
            return;
        }
        setIsLoading(true);
        const l = toast.loading("Calculating convex hull...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/spatial-ops', {
                operation: "convex_hull",
                geometry_a: selectedAOI
            });
            setSelectedAOI(res.data.geometry);
            toast.success("Convex hull boundary mapped!", { id: l });
        } catch (err) {
            toast.error("Convex hull failed.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Time Travel Timeline index loader
    const handleTimeTravelChange = async (year) => {
        setSelectedYear(year);
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/gis/time-travel?year=${year}`);
            setTimeTravelMetrics(res.data);
            toast.success(`Time Travel: Loaded ${year} historical imagery index`);
        } catch (e) {
            console.error("Time travel loader failed", e);
        }
    };

    // Satellite Interpreter upload handling
    const triggerInterpreterUpload = () => {
        fileInputRef.current?.click();
    };

    const handleInterpreterUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        const l = toast.loading(`Uploading raster tile: ${file.name}...`);
        
        const formData = new FormData();
        formData.append("file", file);
        
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/satellite-interpret', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setInterpreterResult(res.data);
            
            // Mount detected features to map selection (MultiPolygon bounds)
            if (res.data.annotations) {
                setSelectedAOI(res.data.annotations.features[2].geometry); // Mount building boundary bounds
                toast.success("Detections plotted on Leaflet canvas!", { id: l });
            }
        } catch (err) {
            toast.error("Interpreter classification failed.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-71 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open Spatial Calculations and Layers"
            >
                📐 Spatial Analytics
            </button>
        );
    }

    return (
        <div className="absolute top-16 left-[560px] z-[1000] w-80 rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">📐 Spatial Topology & Timelines</span>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Panel Area */}
            <div className="p-3.5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                
                {/* 1. Real-time Measurement metrics */}
                <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Geometry Measurements</span>
                    {measurement ? (
                        <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 space-y-1 text-[11px] font-mono leading-relaxed">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Area:</span>
                                <span className="text-emerald-400 font-bold">{measurement.area_sq_meters.toLocaleString()} m²</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Hectares:</span>
                                <span className="text-emerald-400 font-bold">{measurement.area_hectares} ha</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Perimeter:</span>
                                <span className="text-sky-300 font-bold">{measurement.perimeter_meters.toLocaleString()} m</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Centroid:</span>
                                <span className="text-gray-300 text-[10px]">{measurement.centroid[0].toFixed(4)}, {measurement.centroid[1].toFixed(4)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] text-gray-500 italic bg-gray-950/40 p-2.5 rounded-xl border border-gray-850 text-center">
                            No shape selected. Draw a boundary on the map to calculate dimensions.
                        </div>
                    )}
                </div>

                {/* 2. Spatial Operations */}
                <div className="space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Topological Operations</span>
                    
                    {/* Buffer size and action */}
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 space-y-2.5">
                        <div className="flex justify-between text-[10px] font-mono text-gray-400">
                            <span>Buffer Distance:</span>
                            <span className="text-sky-400 font-bold">{bufferDist} m</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="500"
                            step="25"
                            value={bufferDist}
                            onChange={(e) => setBufferDist(Number(e.target.value))}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleApplyBuffer}
                                disabled={isLoading}
                                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-bold rounded-lg transition-all"
                            >
                                Apply Buffer
                            </button>
                            <button
                                onClick={handleConvexHull}
                                disabled={isLoading}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-bold rounded-lg transition-all"
                            >
                                Convex Hull
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Time Travel Imagery Timeline */}
                <div className="space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">GEE Time Travel Timeline</span>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 space-y-3">
                        <div className="flex justify-between font-mono text-[10px] text-gray-400">
                            <span>Selected Year:</span>
                            <span className="text-amber-400 font-bold">{selectedYear}</span>
                        </div>
                        
                        {/* Timeline slider steps */}
                        <div className="flex justify-between text-[9px] font-bold text-gray-500 px-1">
                            {[2010, 2015, 2020, 2025].map(y => (
                                <button
                                    key={y}
                                    onClick={() => handleTimeTravelChange(y)}
                                    className={`transition-colors ${selectedYear === y ? "text-amber-400 font-extrabold text-xs" : "hover:text-gray-300"}`}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>

                        {timeTravelMetrics && (
                            <div className="border-t border-gray-900 pt-2 space-y-1 text-[10px] font-mono text-gray-400">
                                <div className="flex justify-between">
                                    <span>Forest Index NDVI:</span>
                                    <span className="text-green-400">{timeTravelMetrics.vegetation_index_ndvi_mean.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Urban Built-up Area:</span>
                                    <span className="text-orange-400">{timeTravelMetrics.urban_built_up_percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Satellite Classifier Interpreter */}
                <div className="space-y-2 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Satellite Image Interpreter</span>
                    <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-850 space-y-2">
                        <p className="text-[9px] text-gray-500 leading-normal">
                            Upload a raw raster tile image. The deep learning model classifier will segregate roads, buildings, forest, and water boundaries.
                        </p>
                        
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleInterpreterUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            onClick={triggerInterpreterUpload}
                            disabled={isLoading}
                            className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-bold rounded-lg transition-all"
                        >
                            Upload Raster Image
                        </button>

                        {interpreterResult && (
                            <div className="border-t border-gray-900 pt-2.5 space-y-1.5 text-[10px] font-mono leading-relaxed">
                                <div className="flex justify-between text-gray-400">
                                    <span>Classifier Status:</span>
                                    <span className="text-emerald-400 font-bold">{interpreterResult.status}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Processing Time:</span>
                                    <span>{interpreterResult.processing_seconds}s</span>
                                </div>
                                <div className="bg-gray-900 p-2 rounded-lg text-[9px] text-gray-500 leading-normal mt-1">
                                    • Buildings count: {interpreterResult.summary.buildings_count} detected.<br/>
                                    • River water fraction: {interpreterResult.summary.water_detected_pct}%.<br/>
                                    • Forest cover index: {interpreterResult.summary.forest_detected_pct}%.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            
            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">EPSG:32643 geometry router</span>
            </div>
        </div>
    );
};

export default GisPlatformWidget;
