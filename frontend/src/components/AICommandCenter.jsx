import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import KnowledgeGraphWidget from './KnowledgeGraphWidget';
import ScenarioWidget from './ScenarioWidget';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

// Mock live cost and token time series data
const COST_CHART_DATA = [
    { time: '09:00', tokens: 1200, cost: 0.024 },
    { time: '10:00', tokens: 2800, cost: 0.056 },
    { time: '11:00', tokens: 4100, cost: 0.082 },
    { time: '12:00', tokens: 5300, cost: 0.106 },
    { time: '13:00', tokens: 8200, cost: 0.164 },
    { time: '14:00', tokens: 10400, cost: 0.208 },
    { time: '15:00', tokens: 12800, cost: 0.256 },
    { time: '16:00', tokens: 14100, cost: 0.282 },
    { time: '17:00', tokens: 16900, cost: 0.338 }
];

const AICommandCenter = () => {
    const { isCommandCenterOpen, setIsCommandCenterOpen, userProfile } = useMap();
    const [systemMetrics, setSystemMetrics] = useState({
        cpu: 18,
        memory: 42,
        responseTime: 824,
        activeTasks: 3
    });
    
    // Simulate real-time metrics fluctuation
    useEffect(() => {
        if (!isCommandCenterOpen) return;
        const interval = setInterval(() => {
            setSystemMetrics(prev => ({
                cpu: Math.round(15 + Math.random() * 8),
                memory: Math.round(41 + Math.random() * 2),
                responseTime: Math.round(800 + Math.random() * 50),
                activeTasks: Math.random() > 0.7 ? Math.round(2 + Math.random() * 2) : prev.activeTasks
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, [isCommandCenterOpen]);

    if (!isCommandCenterOpen) return null;

    return (
        <div className="fixed inset-0 z-[2100] bg-slate-950 text-white font-sans flex flex-col overflow-hidden animate-[fadeIn_0.3s_ease]">
            
            {/* Header Status Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <h1 className="text-lg font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent uppercase font-mono">
                        PALANTIR FOUNDRY • AI COMMAND CENTER
                    </h1>
                </div>
                
                <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">ROLE:</span>
                        <span className="text-emerald-400 font-bold">{userProfile?.role || 'Viewer'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">DB CONNs:</span>
                        <span className="text-sky-400 font-bold">PostGIS (5432) | ChromaDB (FAISS)</span>
                    </div>
                    <button
                        onClick={() => setIsCommandCenterOpen(false)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-all font-sans font-bold"
                    >
                        ✕ Close (ESC)
                    </button>
                </div>
            </div>

            {/* Main Command Grid Layout */}
            <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 xl:grid-cols-4 gap-6 scrollbar-thin">
                
                {/* COLUMN 1: AI AGENTS TIMELINE & LIVE LOG FEED */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    {/* Active AI Agents Feed */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            🤖 LangGraph Active Agents
                        </h2>
                        
                        <div className="space-y-3">
                            {[
                                { name: "Planner Agent", desc: "Orchestrating search workflows", status: "Idle", color: "text-slate-500 bg-slate-500/10" },
                                { name: "GIS Agent", desc: "Topological buffers & intersection operations", status: "Active", color: "text-emerald-400 bg-emerald-500/10" },
                                { name: "GEE Earth Agent", desc: "Raster NDVI vegetation calculations", status: "Idle", color: "text-slate-500 bg-slate-500/10" },
                                { name: "Weather Agent", desc: "Meteorological monsoon forecasting", status: "Idle", color: "text-slate-500 bg-slate-500/10" },
                                { name: "Recommendation Agent", desc: "Weighted site scoring matrix models", status: "Active", color: "text-emerald-400 bg-emerald-500/10" }
                            ].map((agent, idx) => (
                                <div key={idx} className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-bold text-slate-200">{agent.name}</h4>
                                        <p className="text-[10px] text-slate-500 leading-normal">{agent.desc}</p>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${agent.color}`}>
                                        {agent.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Query Timelines and Logs */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col gap-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            📜 Live Execution Logs
                        </h2>
                        
                        <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-[9px] text-slate-400 overflow-y-auto space-y-2 h-[200px] xl:h-auto border border-slate-900">
                            <p className="text-slate-600">[17:39:12] Initializing FAISS Vector Store Indexes...</p>
                            <p className="text-emerald-500">✓ ChromaDB (FAISS) initialized with 1 active document</p>
                            <p className="text-slate-600">[17:40:57] [Planner Agent] Assessing input: "Recommend suitable solar farm sites"</p>
                            <p className="text-sky-400">[17:40:58] [Spatial Query Agent] Geocoding target boundaries via GeoNames</p>
                            <p className="text-purple-400">[17:40:58] [Recommendation Agent] Executing multi-criteria scoring matrix</p>
                            <p className="text-amber-500">[17:40:58] [Report Agent] Compiling layout PDF statistics...</p>
                            <p className="text-emerald-400">✓ LangGraph workflow finished in 824ms (confidence: 94%)</p>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2 & 3: CENTRAL KNOWLEDGE GRAPH & PIPELINE TIMELINE */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    {/* Execution Pipeline Process Timeline */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono mb-4 border-b border-slate-800 pb-2">
                            ⏱️ Geoprocessing Execution Timeline
                        </h2>
                        
                        <div className="flex items-center justify-between text-center relative px-2 py-3 overflow-x-auto min-w-[500px]">
                            {[
                                { step: "Planning", desc: "User Query Parsing", status: "Completed", color: "bg-sky-500 border-sky-500" },
                                { step: "Vector Search", desc: "FAISS Semantics", status: "Completed", color: "bg-sky-500 border-sky-500" },
                                { step: "GIS Operations", desc: "Topological buffers", status: "Active", color: "bg-emerald-500 border-emerald-500 animate-pulse" },
                                { step: "GEE Fetch", desc: "Sentinel-2 Rasters", status: "Pending", color: "bg-slate-800 border-slate-700" },
                                { step: "Scoring Matrix", desc: "Multi-Criteria MCDA", status: "Pending", color: "bg-slate-800 border-slate-700" },
                                { step: "Report Compile", desc: "Export PDF layouts", status: "Pending", color: "bg-slate-800 border-slate-700" }
                            ].map((p, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center relative z-10">
                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold text-white mb-2 ${p.color}`}>
                                        {idx + 1}
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-200">{p.step}</h4>
                                    <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
                                </div>
                            ))}
                            {/* Horizontal connector line */}
                            <div className="absolute top-[26px] left-[5%] right-[5%] h-0.5 bg-slate-800 z-0"></div>
                        </div>
                    </div>

                    {/* Integrated Knowledge Graph */}
                    <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 min-h-[400px]">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            🕸️ Interactive Spatial Knowledge Graph
                        </h2>
                        
                        <div className="flex-1 relative bg-slate-950/80 rounded-xl overflow-hidden border border-slate-900">
                            {/* Render existing KnowledgeGraphWidget inside Command Center */}
                            <KnowledgeGraphWidget />
                        </div>
                    </div>
                </div>

                {/* COLUMN 4: COST ANALYTICS GRAPH & SYSTEM HEALTH */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    {/* System Health Dashboard */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            📊 Command Dashboard Health
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl text-center space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">CPU Load</span>
                                <p className="text-lg font-bold text-emerald-400 font-mono">{systemMetrics.cpu}%</p>
                            </div>
                            <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl text-center space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Memory</span>
                                <p className="text-lg font-bold text-emerald-400 font-mono">{systemMetrics.memory}%</p>
                            </div>
                            <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl text-center space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Response</span>
                                <p className="text-lg font-bold text-sky-400 font-mono">{systemMetrics.responseTime}ms</p>
                            </div>
                            <div className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl text-center space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Running Tasks</span>
                                <p className="text-lg font-bold text-sky-400 font-mono">{systemMetrics.activeTasks}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cost Recharts Integration */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            💰 AI Token Cost Analytics
                        </h2>
                        
                        <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={COST_CHART_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                                    <YAxis stroke="#64748b" fontSize={9} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 10 }} />
                                    <Area type="monotone" dataKey="cost" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Today's Total: 71,600 tokens</span>
                            <span className="text-sky-400 font-bold">$1.43 USD</span>
                        </div>
                    </div>

                    {/* Integrated Scenario Simulator */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col gap-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono border-b border-slate-800 pb-2">
                            🌍 What-If Scenario Simulator
                        </h2>
                        
                        <div className="flex-1 overflow-y-auto">
                            {/* Render ScenarioWidget inside CommandCenter */}
                            <ScenarioWidget />
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default AICommandCenter;
