import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DrawAnalyzePanel = ({ analysisResults }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    
    if (!analysisResults) return null;
    
    const sa = analysisResults.spatial_analysis;
    if (!sa) {
        return (
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center text-xs text-gray-400">
                Detailed spatial metrics not compiled. Re-run analysis on a new region.
            </div>
        );
    }

    const handleDownloadReport = async (format) => {
        setIsDownloading(true);
        const loadToast = toast.loading(`Compiling Enterprise ${format.toUpperCase()} Report...`);
        
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/report/generate', {
                format: format,
                analysis_data: {
                    centroid: sa.centroid,
                    area: sa.area,
                    perimeter_m: sa.perimeter_m,
                    flood_risk: sa.flood_risk,
                    population_estimation: sa.population_estimation,
                    land_use: sa.land_use,
                    amenities: sa.amenities
                }
            }, { responseType: 'blob' });
            
            // Create download link
            const blob = new Blob([response.data], { 
                type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `geoquery_report_${analysisResults.aoi_id.substring(0,6)}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success(`${format.toUpperCase()} downloaded successfully!`, { id: loadToast });
        } catch (error) {
            console.error("Report generation failed:", error);
            toast.error("Failed to generate report on backend.", { id: loadToast });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-4 border-t border-gray-800 pt-4 mt-2">
            <h3 className="text-xs font-bold tracking-widest text-sky-400 uppercase">
                📐 Advanced Spatial Analysis
            </h3>
            
            {/* Area & Perimeter KPIs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl flex flex-col">
                    <span className="text-gray-500 font-medium">ROI Area</span>
                    <span className="text-base font-bold text-sky-300 mt-1">
                        {sa.area.hectares} <span className="text-[10px] font-normal text-gray-400">ha</span>
                    </span>
                </div>
                <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl flex flex-col">
                    <span className="text-gray-500 font-medium">ROI Perimeter</span>
                    <span className="text-base font-bold text-sky-300 mt-1">
                        {sa.perimeter_m.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">m</span>
                    </span>
                </div>
            </div>

            {/* Centroid info */}
            <div className="p-2.5 bg-gray-800/20 border border-gray-800/50 rounded-xl flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>Centroid Lat: {sa.centroid.latitude}</span>
                <span>Lon: {sa.centroid.longitude}</span>
            </div>
            
            {/* Population & Flood Risk Callouts */}
            <div className="space-y-2 text-xs">
                <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-gray-500">Est. Population</span>
                        <span className="text-sm font-bold text-sky-200 mt-0.5">{sa.population_estimation.toLocaleString()} residents</span>
                    </div>
                    <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                
                <div className={`p-3 border rounded-xl flex justify-between items-center ${
                    sa.flood_risk.level === 'High' 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                    <div className="flex flex-col">
                        <span className="text-gray-500">Flood Hazard Index</span>
                        <span className="text-sm font-bold mt-0.5">{sa.flood_risk.level} ({sa.flood_risk.score_pct}%)</span>
                    </div>
                    <span className="text-xl">⚠️</span>
                </div>
            </div>
            
            {/* Land Use Split Progress Bars */}
            <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-gray-400">Land Cover splits</span>
                <div className="space-y-2.5 pt-1">
                    {[
                        { label: 'Built-up', val: sa.land_use.urban, color: 'bg-rose-500' },
                        { label: 'Vegetation', val: sa.land_use.vegetation, color: 'bg-emerald-500' },
                        { label: 'Agriculture', val: sa.land_use.agriculture, color: 'bg-amber-500' },
                        { label: 'Water bodies', val: sa.land_use.water, color: 'bg-sky-500' }
                    ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-300">{item.label}</span>
                                <span className="font-bold text-gray-200">{item.val}%</span>
                            </div>
                            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                <div className={`${item.color} h-full`} style={{ width: `${item.val}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nearby Amenities */}
            <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-xl space-y-2.5 text-xs">
                <span className="font-semibold text-gray-400">Infrastructure Detection</span>
                
                <div className="flex justify-between items-center border-b border-gray-800 pb-1.5 text-gray-300">
                    <span>🏥 Nearby Hospitals</span>
                    <span className="font-mono text-sky-400">{sa.amenities.hospitals.length} found</span>
                </div>
                {sa.amenities.hospitals.slice(0, 2).map((h, i) => (
                    <div key={i} className="text-[11px] text-gray-400 pl-2">
                        • {h.name} <span className="text-sky-300/80">({h.distance_m.toFixed(0)}m)</span>
                    </div>
                ))}
                
                <div className="flex justify-between items-center border-b border-gray-800 pb-1.5 pt-1 text-gray-300">
                    <span>🏫 Nearby Schools</span>
                    <span className="font-mono text-sky-400">{sa.amenities.schools.length} found</span>
                </div>
                {sa.amenities.schools.slice(0, 2).map((s, i) => (
                    <div key={i} className="text-[11px] text-gray-400 pl-2">
                        • {s.name} <span className="text-sky-300/80">({s.distance_m.toFixed(0)}m)</span>
                    </div>
                ))}
            </div>

            {/* Export Reports Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                    onClick={() => handleDownloadReport('pdf')}
                    disabled={isDownloading}
                    className="py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                    📂 Export PDF
                </button>
                <button
                    onClick={() => handleDownloadReport('docx')}
                    disabled={isDownloading}
                    className="py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                    📝 Export Word
                </button>
            </div>
        </div>
    );
};

export default DrawAnalyzePanel;
