import React, { useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend
} from 'recharts';

const AdvancedGisWidget = () => {
    const {
        selectedAOI,
        routingPath,
        setRoutingPath,
        ndviPoints,
        setNdviPoints,
        congestionSegments,
        setCongestionSegments,
        mapInstance
    } = useMap();

    const [activeSubTab, setActiveSubTab] = useState('ndvi'); // 'ndvi', 'history', 'risk', 'emergency', 'scorecard', 'upload'
    const [isLoading, setIsLoading] = useState(false);

    // 1. NDVI State
    const [ndviStats, setNdviStats] = useState(null);

    // 2. Historical comparison State
    const [histData, setHistData] = useState(null);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [histYears, setHistYears] = useState({ year1: 2015, year2: 2025 });

    // 3. Flood & Traffic States
    const [floodInputs, setFloodInputs] = useState({ rain: 150, elev: 45, river: 350, hist: 3 });
    const [floodReport, setFloodReport] = useState(null);
    const [trafficInputs, setTrafficInputs] = useState({ weather: 'Rainy', hour: 8 });
    const [trafficReport, setTrafficReport] = useState(null);

    // 4. Emergency State
    const [emergencyService, setEmergencyService] = useState('Hospitals');
    const [emergencyReport, setEmergencyReport] = useState(null);

    // 5. Scorecard & Sprawl States
    const [scoreData, setScoreData] = useState(null);
    const [sprawlInputs, setSprawlInputs] = useState({ pop: 45000, rate: 2.8 });
    const [sprawlReport, setSprawlReport] = useState(null);

    // 6. Upload State
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadReport, setUploadReport] = useState(null);

    const checkAoi = () => {
        if (!selectedAOI) {
            toast.error("Please draw a polygon boundary on the map first!");
            return false;
        }
        return true;
    };

    // NDVI stress
    const handleComputeNdvi = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        const l = toast.loading("Generating GEE NDVI Stress Heatpoints...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/ndvi-heatmap', { geometry: selectedAOI });
            setNdviPoints(res.data.heatpoints || []);
            setNdviStats(res.data);
            toast.success("NDVI stress points rendered on map!", { id: l });
        } catch (e) {
            toast.error("Failed to compile GEE NDVI stress grid.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Historical comparison
    const handleComputeComparison = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        const l = toast.loading("Processing historical satellite datasets...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/historical-compare', {
                geometry: selectedAOI,
                year1: histYears.year1,
                year2: histYears.year2
            });
            setHistData(res.data);
            setSelectedYear(histYears.year2);
            toast.success("Historical satellite dataset loaded!", { id: l });
        } catch (e) {
            toast.error("Failed to run historical satellite comparison.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Flood Risk
    const handlePredictFlood = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        const l = toast.loading("Calculating flood probabilities...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/predict/flood', {
                geometry: selectedAOI,
                rainfall_mm: parseFloat(floodInputs.rain),
                elevation_m: parseFloat(floodInputs.elev),
                river_distance_m: parseFloat(floodInputs.river),
                historical_floods_count: parseInt(floodInputs.hist)
            });
            setFloodReport(res.data);
            toast.success("Flood hazard calculations completed!", { id: l });
            
            // Zoom to shelter if found
            if (res.data.shelters && res.data.shelters.length > 0 && mapInstance) {
                const sh = res.data.shelters[0];
                mapInstance.flyTo([sh.lat, sh.lng], 13);
            }
        } catch (e) {
            toast.error("Failed to calculate flood hazards.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Traffic congestion
    const handlePredictTraffic = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        const l = toast.loading("Running congestion simulations...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/predict/traffic', {
                geometry: selectedAOI,
                weather: trafficInputs.weather,
                hour: parseInt(trafficInputs.hour)
            });
            setTrafficReport(res.data);
            
            // Map congestion path polylines
            const segs = res.data.segments.map(s => ({
                coords: s.coords,
                color: s.color
            }));
            setCongestionSegments(segs);
            toast.success("Congestion indices mapped!", { id: l });
        } catch (e) {
            toast.error("Failed to simulate traffic congestion.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Emergency Routing
    const handleCalculateEmergencyRoute = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        const l = toast.loading("Routing safe fast bypass...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/routing/emergency', {
                geometry: selectedAOI,
                service_type: emergencyService
            });
            setEmergencyReport(res.data);
            
            // Set the routing path
            setRoutingPath(res.data.route_points);
            toast.success("Fast response routing mapped successfully!", { id: l });

            // Zoom to routing path
            if (mapInstance && res.data.route_points.length > 0) {
                mapInstance.flyTo(res.data.route_points[0], 13);
            }
        } catch (e) {
            toast.error("Failed to calculate emergency routing bypass.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Smart City scorecard
    const handleEvaluateSmartCity = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/smart-city', { geometry: selectedAOI });
            setScoreData(res.data);
            toast.success("Smart city scoring calculated!");
        } catch (e) {
            toast.error("Failed to evaluate smart city scorecard.");
        } finally {
            setIsLoading(false);
        }
    };

    // Urban expansion
    const handlePredictSprawl = async () => {
        if (!checkAoi()) return;
        setIsLoading(true);
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/predict/urban-expansion', {
                geometry: selectedAOI,
                initial_pop: parseInt(sprawlInputs.pop),
                growth_rate_pct: parseFloat(sprawlInputs.rate)
            });
            setSprawlReport(res.data);
            toast.success("Expansion projection calculated!");
        } catch (e) {
            toast.error("Failed to project expansion boundaries.");
        } finally {
            setIsLoading(false);
        }
    };

    // Upload
    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadedFile) {
            toast.error("Please select a file to upload.");
            return;
        }
        setIsLoading(true);
        const l = toast.loading("Processing classification masks...");
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("resolution", "10m/pixel");
        
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadReport(res.data);
            toast.success("Classification successful!", { id: l });
        } catch (error) {
            toast.error("Image classification model error.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearOverlays = () => {
        setRoutingPath(null);
        setNdviPoints([]);
        setCongestionSegments([]);
        setNdviStats(null);
        setFloodReport(null);
        setTrafficReport(null);
        setEmergencyReport(null);
        toast.success("Active GIS overlays cleared.");
    };

    // Get current animated year data
    const getAnimatedYearData = () => {
        if (!histData) return [];
        const target = selectedYear === histYears.year1 ? histData.year1 : histData.year2;
        return [
            { name: 'Forest', value: target.forest },
            { name: 'Water', value: target.water },
            { name: 'Agriculture', value: target.agriculture },
            { name: 'Buildings', value: target.buildings },
            { name: 'Roads', value: target.roads }
        ];
    };

    return (
        <div className="space-y-4 border-t border-gray-800 pt-5 mt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-widest text-sky-400 uppercase">
                    🚀 Advanced GIS Modules
                </h3>
                <button
                    onClick={handleClearOverlays}
                    className="text-[9px] text-gray-500 hover:text-red-400 uppercase tracking-wider font-semibold transition-colors"
                >
                    Clear Overlays
                </button>
            </div>

            {/* Sub Tabs Selection Header */}
            <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-xl text-[10px] font-semibold text-center select-none">
                {[
                    { key: 'ndvi', label: 'NDVI Stress' },
                    { key: 'history', label: 'Years Comp' },
                    { key: 'risk', label: 'Hazards' },
                    { key: 'emergency', label: 'Response' },
                    { key: 'scorecard', label: 'Smart Index' },
                    { key: 'upload', label: 'Img Classification' }
                ].map(tab => (
                    <div
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        className={`cursor-pointer py-1.5 rounded-lg transition-all ${
                            activeSubTab === tab.key
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </div>
                ))}
            </div>

            {/* Content areas based on Active Tab */}
            <div className="bg-gray-800/10 border border-gray-800/40 p-3.5 rounded-2xl space-y-4">
                
                {/* 1. NDVI Stress View */}
                {activeSubTab === 'ndvi' && (
                    <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-gray-400 block uppercase">Vegetation stress index (NDVI)</span>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Generates a high-precision grid model overlay within the boundary representing healthy fields, stressed soils, and canopy gaps.
                        </p>
                        
                        <button
                            onClick={handleComputeNdvi}
                            disabled={isLoading}
                            className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
                        >
                            {isLoading ? 'Computing grid...' : '🌿 Compute NDVI Stress Grid'}
                        </button>
                        
                        {ndviStats && (
                            <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
                                <div className="grid grid-cols-3 gap-1.5 text-center font-semibold text-[10px]">
                                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300">
                                        <p>Healthy</p>
                                        <p className="text-sm font-bold mt-0.5">{ndviStats.statistics.healthy_pct}%</p>
                                    </div>
                                    <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300">
                                        <p>Poor</p>
                                        <p className="text-sm font-bold mt-0.5">{ndviStats.statistics.poor_pct}%</p>
                                    </div>
                                    <div className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
                                        <p>Stressed</p>
                                        <p className="text-sm font-bold mt-0.5">{ndviStats.statistics.stress_pct}%</p>
                                    </div>
                                </div>
                                <div className="bg-sky-500/5 border-l-2 border-sky-400 p-2.5 rounded-r-lg text-[11px] text-sky-200/90 italic">
                                    "{ndviStats.interpretation}"
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Historical comparison View */}
                {activeSubTab === 'history' && (
                    <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-gray-400 block uppercase">Historical Years satellite compare</span>
                        <div className="flex gap-2 items-center text-xs">
                            <input
                                type="number"
                                value={histYears.year1}
                                onChange={(e) => setHistYears(prev => ({ ...prev, year1: parseInt(e.target.value) }))}
                                className="w-1/2 bg-gray-900 border border-gray-800 focus:border-sky-500 rounded-xl px-2 py-1 text-center outline-none text-white"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="number"
                                value={histYears.year2}
                                onChange={(e) => setHistYears(prev => ({ ...prev, year2: parseInt(e.target.value) }))}
                                className="w-1/2 bg-gray-900 border border-gray-800 focus:border-sky-500 rounded-xl px-2 py-1 text-center outline-none text-white"
                            />
                        </div>

                        <button
                            onClick={handleComputeComparison}
                            disabled={isLoading}
                            className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
                        >
                            📊 Compare Satellite Indices
                        </button>

                        {histData && (
                            <div className="space-y-3 pt-2 border-t border-gray-800 text-xs">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                                    <span>Select Timeline Year:</span>
                                    <span className="text-sky-400 font-bold text-sm font-mono">{selectedYear}</span>
                                </div>
                                
                                {/* Sliders */}
                                <input
                                    type="range"
                                    min={histYears.year1}
                                    max={histYears.year2}
                                    step={histYears.year2 - histYears.year1}
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full accent-sky-400 cursor-pointer"
                                />

                                {/* Bar Chart */}
                                <div className="h-40 w-full bg-gray-900/50 p-1 rounded-xl">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getAnimatedYearData()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                            <XAxis dataKey="name" fontSize={9} stroke="#9ca3af" />
                                            <YAxis fontSize={9} stroke="#9ca3af" />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', fontSize: 10 }} />
                                            <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="bg-sky-500/5 border-l-2 border-sky-400 p-2.5 rounded-r-lg text-[11px] text-sky-200/90 italic">
                                    "{histData.interpretation}"
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Hazards and predictions View */}
                {activeSubTab === 'risk' && (
                    <div className="space-y-4">
                        {/* A. Flood prediction */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold text-gray-400 block uppercase border-b border-gray-800 pb-1">🌊 Flood Hazard Modeling</span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Rainfall (mm)</span>
                                    <input
                                        type="number"
                                        value={floodInputs.rain}
                                        onChange={(e) => setFloodInputs(prev => ({ ...prev, rain: parseFloat(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Elevation (m)</span>
                                    <input
                                        type="number"
                                        value={floodInputs.elev}
                                        onChange={(e) => setFloodInputs(prev => ({ ...prev, elev: parseFloat(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">River Dist (m)</span>
                                    <input
                                        type="number"
                                        value={floodInputs.river}
                                        onChange={(e) => setFloodInputs(prev => ({ ...prev, river: parseFloat(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Hist. Floods</span>
                                    <input
                                        type="number"
                                        value={floodInputs.hist}
                                        onChange={(e) => setFloodInputs(prev => ({ ...prev, hist: parseInt(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePredictFlood}
                                disabled={isLoading}
                                className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow"
                            >
                                Calculate Evacuation Risk
                            </button>

                            {floodReport && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-gray-400">Probability:</span>
                                        <span className="text-base font-bold text-rose-400">{floodReport.probability}%</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-gray-400">Risk Zone:</span>
                                        <span className="font-semibold text-rose-300">{floodReport.risk_zone}</span>
                                    </div>
                                    <div className="text-[10px] text-rose-200/90 border-t border-rose-500/20 pt-1 leading-relaxed">
                                        ⚠️ **Evac Plan**: {floodReport.evacuation_suggestions}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* B. Traffic prediction */}
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                            <span className="text-[11px] font-semibold text-gray-400 block uppercase pb-1">🚗 Road Network Traffic Predictor</span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Hour of Day</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="23"
                                        value={trafficInputs.hour}
                                        onChange={(e) => setTrafficInputs(prev => ({ ...prev, hour: parseInt(e.target.value) }))}
                                        className="accent-amber-400 cursor-pointer"
                                    />
                                    <span className="text-center font-mono text-[10px] text-amber-300 font-bold">{trafficInputs.hour}:00</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Weather</span>
                                    <select
                                        value={trafficInputs.weather}
                                        onChange={(e) => setTrafficInputs(prev => ({ ...prev, weather: e.target.value }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white"
                                    >
                                        <option value="Sunny">Sunny</option>
                                        <option value="Rainy">Rainy</option>
                                        <option value="Stormy">Stormy</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handlePredictTraffic}
                                disabled={isLoading}
                                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow"
                            >
                                Simulate Road Congestion
                            </button>

                            {trafficReport && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-gray-400">Congestion Score:</span>
                                        <span className="text-sm font-bold text-amber-400">{trafficReport.congestion_score}% ({trafficReport.status})</span>
                                    </div>
                                    <div className="text-[10px] text-amber-200/90 border-t border-amber-500/20 pt-1 leading-relaxed">
                                        🗺️ **Alt Routing**: {trafficReport.alternate_route.route_name} saves **{trafficReport.alternate_route.savings_minutes} min**.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Emergency Routing View */}
                {activeSubTab === 'emergency' && (
                    <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-gray-400 block uppercase">🚨 Dispatch Responder Planner</span>
                        <div className="flex gap-2 text-xs">
                            <span className="text-gray-400 flex items-center">Dispatch Unit:</span>
                            <select
                                value={emergencyService}
                                onChange={(e) => setEmergencyService(e.target.value)}
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-white"
                            >
                                <option value="Hospitals">Hospital Ambulance</option>
                                <option value="Police">Police Cruiser</option>
                                <option value="FireStations">Fire Station Engine</option>
                            </select>
                        </div>

                        <button
                            onClick={handleCalculateEmergencyRoute}
                            disabled={isLoading}
                            className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all"
                        >
                            🚒 Plot Congestion Bypass Route
                        </button>

                        {emergencyReport && (
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-400">Destination:</span>
                                    <span className="font-semibold text-indigo-300">{emergencyReport.destination}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-400">Bypass ETA:</span>
                                    <span className="text-sm font-bold text-indigo-400">{Math.round(emergencyReport.eta_seconds / 60)} minutes</span>
                                </div>
                                <div className="text-[10px] text-indigo-200/90 border-t border-indigo-500/20 pt-1">
                                    🔒 **Bypass Action**: Route avoids active floodways & central bottlenecks.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. Scorecard and Projection View */}
                {activeSubTab === 'scorecard' && (
                    <div className="space-y-4">
                        {/* A. Scorecard */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-semibold text-gray-400 block uppercase border-b border-gray-800 pb-1">📊 Smart City scoring index</span>
                            
                            <button
                                onClick={handleEvaluateSmartCity}
                                disabled={isLoading}
                                className="w-full py-1.5 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow"
                            >
                                Compile scoring metrics
                            </button>

                            {scoreData && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold px-1">
                                        <span>Overall Rating:</span>
                                        <span className="text-sky-400">Score {scoreData.overall_score}/100 (Tier {scoreData.tier})</span>
                                    </div>
                                    
                                    {/* Recharts Radar chart */}
                                    <div className="h-44 w-full bg-gray-900/50 p-1 rounded-xl flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={scoreData.scores}>
                                                <PolarGrid stroke="#374151" />
                                                <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={8} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#374151" tick={false} />
                                                <Radar name="Metrics Index" dataKey="value" stroke="#38bdf8" fillColor="#38bdf8" fillOpacity={0.4} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* B. Sprawl Projection */}
                        <div className="space-y-2 border-t border-gray-800 pt-3">
                            <span className="text-[11px] font-semibold text-gray-400 block uppercase pb-1">📈 20-Year Urban Sprawl Forecaster</span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Pop (Residents)</span>
                                    <input
                                        type="number"
                                        value={sprawlInputs.pop}
                                        onChange={(e) => setSprawlInputs(prev => ({ ...prev, pop: parseInt(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 text-[10px]">Growth Rate %</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={sprawlInputs.rate}
                                        onChange={(e) => setSprawlInputs(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-white text-center"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePredictSprawl}
                                disabled={isLoading}
                                className="w-full py-1.5 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow"
                            >
                                Forecast Expansion Radius
                            </button>

                            {sprawlReport && (
                                <div className="text-[10px] space-y-1.5 pt-2 border-t border-gray-800">
                                    <table className="w-full text-left text-gray-400">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-[9px] uppercase">
                                                <th className="pb-1">Timeline</th>
                                                <th className="pb-1">Population</th>
                                                <th className="pb-1 text-right">Sprawl Area</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-850">
                                            {sprawlReport.projections.map(proj => (
                                                <tr key={proj.years}>
                                                    <td className="py-1.5 font-semibold text-gray-200">+{proj.years} yrs</td>
                                                    <td className="py-1.5">{proj.estimated_population.toLocaleString()}</td>
                                                    <td className="py-1.5 text-right font-mono text-emerald-400">+{proj.built_up_percentage_increase}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    <div className="bg-sky-500/5 border-l-2 border-sky-400 p-2 rounded-r-lg text-[10px] text-sky-200/90 italic leading-relaxed pt-1.5">
                                        "{sprawlReport.interpretation}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. Upload View */}
                {activeSubTab === 'upload' && (
                    <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-gray-400 block uppercase">🖼️ AI Land Classification upload</span>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Upload high-res aerial imagery (JPEG/PNG) to extract and classify buildings, road pixels, water canopy, and forestry masks.
                        </p>
                        
                        <form onSubmit={handleUploadSubmit} className="space-y-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setUploadedFile(e.target.files[0])}
                                className="w-full text-xs text-gray-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-gray-800 file:text-sky-400 file:cursor-pointer"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !uploadedFile}
                                className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-650 text-white rounded-xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Processing image...' : '⚡ Classify Crop & Urban Cover'}
                            </button>
                        </form>

                        {uploadReport && (
                            <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
                                <span className="font-semibold text-gray-400">Detected segment distribution</span>
                                <div className="space-y-1.5">
                                    {[
                                        { label: 'Buildings', val: uploadReport.classification_summary.buildings_pct, color: 'bg-rose-500' },
                                        { label: 'Roads', val: uploadReport.classification_summary.roads_pct, color: 'bg-gray-500' },
                                        { label: 'Water', val: uploadReport.classification_summary.water_pct, color: 'bg-sky-500' },
                                        { label: 'Forest', val: uploadReport.classification_summary.forest_pct, color: 'bg-emerald-500' },
                                        { label: 'Agriculture', val: uploadReport.classification_summary.agriculture_pct, color: 'bg-amber-500' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="space-y-0.5">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-300">{item.label}</span>
                                                <span className="font-bold text-gray-200">{item.val}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                                                <div className={`${item.color} h-full`} style={{ width: `${item.val}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-sky-500/5 border-l-2 border-sky-400 p-2.5 rounded-r-lg text-[10px] text-sky-200/90 italic leading-relaxed pt-1.5">
                                    "{uploadReport.interpretation}"
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
            </div>
        </div>
    );
};

export default AdvancedGisWidget;
