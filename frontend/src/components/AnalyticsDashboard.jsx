import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

const AnalyticsDashboard = () => {
    const {
        isDashboardOpen,
        setIsDashboardOpen,
        dashboardData,
        fetchDashboardData
    } = useMap();
    
    const [selectedAoiId, setSelectedAoiId] = useState('');
    const [aoiOptions, setAoiOptions] = useState([]);

    useEffect(() => {
        if (isDashboardOpen) {
            // Load saved AOIs list from localStorage or database
            const savedAois = JSON.parse(localStorage.getItem('selectedAOI'));
            const results = JSON.parse(localStorage.getItem('analysisResults'));
            if (results) {
                setAoiOptions([{ id: results.aoi_id, name: 'Drawn Geometry 1' }]);
            }
            fetchDashboardData(selectedAoiId);
        }
    }, [isDashboardOpen, selectedAoiId]);

    if (!isDashboardOpen) return null;

    const data = dashboardData || {
        summary: {
            population: 0,
            area_hectares: 0,
            road_density_index: 0,
            hospitals_count: 0,
            schools_count: 0,
            flood_risk_pct: 0,
            avg_temperature_c: 0,
            avg_rainfall_mm: 0,
            avg_pollution_aqi: 0
        },
        time_series: [],
        land_use: []
    };

    const handleExportCSV = () => {
        if (!data.time_series.length) {
            toast.error("No dashboard data to export.");
            return;
        }
        
        // Build CSV string
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Month,NDVI (Health),Rainfall (mm),Temperature (C),Pollution (AQI)\n";
        
        data.time_series.forEach(item => {
            csvContent += `${item.month},${item.ndvi},${item.rainfall_mm},${item.temperature_c},${item.pollution_aqi}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "gis_dashboard_analytics.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exported successfully!");
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gray-950/90 border-b border-gray-800 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        <h2 className="text-xl font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                            Enterprise GIS Analytics Dashboard
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Region filter */}
                        {aoiOptions.length > 0 && (
                            <select
                                value={selectedAoiId}
                                onChange={(e) => setSelectedAoiId(e.target.value)}
                                className="bg-gray-800 border border-gray-700 text-xs px-3 py-1.5 rounded-xl text-white outline-none focus:border-sky-500 transition-colors"
                            >
                                <option value="">Global/All ROIs</option>
                                {aoiOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                            </select>
                        )}
                        
                        <button
                            onClick={handleExportCSV}
                            className="bg-sky-600 hover:bg-sky-500 text-xs font-bold px-3 py-1.5 rounded-xl shadow transition-all active:scale-95"
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => setIsDashboardOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
                    
                    {/* KPI Widget Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { title: "Residents (Est. Population)", val: data.summary.population.toLocaleString(), unit: "people", color: "text-sky-400" },
                            { title: "ROI Coverage Area", val: data.summary.area_hectares.toFixed(1), unit: "hectares", color: "text-emerald-400" },
                            { title: "Transport/Road Density", val: data.summary.road_density_index, unit: "index score", color: "text-amber-400" },
                            { title: "Healthcare Facilities", val: `${data.summary.hospitals_count} Hosp / ${data.summary.schools_count} School`, unit: "essential amenities", color: "text-rose-400" }
                        ].map((widget, i) => (
                            <div key={i} className="bg-gray-800/40 border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{widget.title}</span>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className={`text-xl font-bold ${widget.color}`}>{widget.val}</span>
                                    <span className="text-[10px] text-gray-400 font-normal">{widget.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Chart 1: NDVI & Rainfall correlation */}
                        <div className="bg-gray-800/20 border border-gray-800 p-4 rounded-3xl space-y-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">NDVI & Rainfall Monthly correlation</span>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.time_series}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                                        <YAxis yAxisId="left" stroke="#10b981" fontSize={10} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} />
                                        <Line yAxisId="left" type="monotone" dataKey="ndvi" name="NDVI Health" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="rainfall_mm" name="Rainfall (mm)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Temp and Air Pollution */}
                        <div className="bg-gray-800/20 border border-gray-800 p-4 rounded-3xl space-y-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Temperature & Pollution (AQI)</span>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.time_series}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                                        <YAxis stroke="#9ca3af" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} />
                                        <Bar dataKey="temperature_c" name="Temp (°C)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="pollution_aqi" name="AQI (Pollution)" fill="#6b7280" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 3: Land Cover Splits pie chart */}
                        {data.land_use.length > 0 && (
                            <div className="bg-gray-800/20 border border-gray-800 p-4 rounded-3xl space-y-3 md:col-span-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Land Cover Composition Split (%)</span>
                                <div className="flex flex-col md:flex-row items-center justify-around p-2 gap-4">
                                    <div className="h-48 w-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data.land_use}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {data.land_use.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        {data.land_use.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                <span className="text-gray-300 font-medium">{item.name}</span>
                                                <span className="font-bold font-mono text-gray-200">({item.value}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-950 px-6 py-4 flex items-center justify-between border-t border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
                    <span>Authorized spatial clearance</span>
                    <span>GeoQuery AI Analytics v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
