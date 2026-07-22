import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

const ScenarioWidget = () => {
    const [rainfall, setRainfall] = useState(20); // +20% rainfall
    const [popMultiplier, setPopMultiplier] = useState(2.0); // 2x pop
    const [newRoad, setNewRoad] = useState(false);
    const [simData, setSimData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleRunSimulation = async () => {
        setIsLoading(true);
        const l = toast.loading("Simulating scenario outcomes...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/ai/simulate', {
                rainfall_pct_change: rainfall,
                population_multiplier: popMultiplier,
                new_road_built: newRoad
            });
            setSimData(res.data);
            toast.success("Simulation complete!", { id: l });
        } catch (e) {
            toast.error("Simulation failed. Check backend connection.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-49 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open Scenario Simulator"
            >
                🔮 What-If Simulator
            </button>
        );
    }

    const chartData = simData ? [
        { name: "Flood Risk (%)", "Base Level": 35.0, "Simulated Level": simData.metrics.flood_risk_score },
        { name: "Traffic Congestion (%)", "Base Level": 42.0, "Simulated Level": simData.metrics.traffic_congestion_score },
        { name: "Overall Suitability (%)", "Base Level": 78.0, "Simulated Level": simData.metrics.overall_suitability_index }
    ] : [];

    return (
        <div className="absolute top-16 left-88 z-[1000] w-96 rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">🔮 Scenario Simulator</span>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content controls */}
            <div className="p-4 space-y-4 text-xs">
                
                {/* Rainfall Change % */}
                <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-gray-400 font-semibold">Rainfall Shift:</span>
                        <span className={rainfall >= 0 ? "text-rose-400 font-bold" : "text-sky-400 font-bold"}>
                            {rainfall >= 0 ? `+${rainfall}%` : `${rainfall}%`}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-50"
                        max="100"
                        step="5"
                        value={rainfall}
                        onChange={(e) => setRainfall(Number(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                </div>

                {/* Population Multiplier */}
                <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-gray-400 font-semibold">Population Shift:</span>
                        <span className="text-amber-400 font-bold">{popMultiplier}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={popMultiplier}
                        onChange={(e) => setPopMultiplier(Number(e.target.value))}
                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                </div>

                {/* New Road Construction */}
                <div className="flex items-center justify-between font-mono text-[11px] bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    <span className="text-gray-400 font-semibold">Build Arterial Bypass Road</span>
                    <button
                        onClick={() => setNewRoad(!newRoad)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            newRoad ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
                        }`}
                    >
                        {newRoad ? "ENABLED" : "DISABLED"}
                    </button>
                </div>

                {/* Action button */}
                <button
                    onClick={handleRunSimulation}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-650 hover:scale-[1.02] active:scale-95 text-white text-xs font-bold rounded-xl shadow transition-all"
                >
                    {isLoading ? "Running Simulations..." : "Evaluate Outcomes"}
                </button>

                {/* Chart visualization */}
                {simData && (
                    <div className="space-y-3.5 border-t border-gray-800 pt-3">
                        
                        {/* Simulation Bar Chart */}
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={8} />
                                    <YAxis stroke="#9ca3af" fontSize={8} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                    <Legend wrapperStyle={{ fontSize: 8 }} />
                                    <Bar dataKey="Base Level" fill="#64748b" />
                                    <Bar dataKey="Simulated Level" fill="#38bdf8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Explanation description */}
                        <p className="bg-sky-500/5 border-l-2 border-sky-400 p-2.5 rounded-r-lg text-[10px] text-sky-300/90 leading-relaxed font-mono italic">
                            {simData.interpretation}
                        </p>
                    </div>
                )}

            </div>
            
            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">MCDA Predictive Overlay</span>
            </div>
        </div>
    );
};

export default ScenarioWidget;
