import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

const EnterpriseDashboard = () => {
    const { userProfile } = useMap();
    const [dashboardData, setDashboardData] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const token = userProfile?.token || '';
    const userRole = userProfile?.role || 'Viewer';

    const loadDashboard = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/enterprise/dashboard', {
                headers: { 'Authorization': token }
            });
            setDashboardData(res.data);
            
            // If Admin/Manager, load audit logs
            if (['Admin', 'Manager'].includes(userRole)) {
                const auditRes = await axios.get('http://127.0.0.1:8000/api/auth/audit-logs', {
                    headers: { 'Authorization': token }
                });
                setAuditLogs(auditRes.data);
            }
        } catch (e) {
            console.error("Error loading enterprise metrics:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userProfile) {
            loadDashboard();
        }
    }, [isOpen, userProfile]);

    const handleExportReport = () => {
        if (!dashboardData) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Category,USD Cost,Resource Metric\n";
        csvContent += `GEE Compute,${dashboardData.costs_usd.gee_compute},Google Earth Engine\n`;
        csvContent += `Groq LLM,${dashboardData.costs_usd.groq_llm},Llama 3.3 tokens\n`;
        csvContent += `Vector Store Hosting,${dashboardData.costs_usd.vector_store_hosting},Faiss indexes\n`;
        csvContent += `Total Monthly,${dashboardData.costs_usd.total_monthly},USD aggregate\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "enterprise_cost_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Enterprise CSV exported successfully!");
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-38 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open Enterprise Cost and Systems Dashboard"
            >
                🏢 Admin Dashboard
            </button>
        );
    }

    // Enforce RBAC in UI
    if (!['Admin', 'Manager'].includes(userRole)) {
        return (
            <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6">
                <div className="bg-gray-900 border border-red-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-white text-center space-y-4">
                    <span className="text-3xl">🚫</span>
                    <h3 className="text-lg font-bold text-red-400">Access Denied</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Enforcing Role-Based Access Control (RBAC). Your active profile role is **{userRole}**. Admin or Manager authorization required to inspect corporate cost metrics and audit logs.
                    </p>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-xl border border-gray-700 transition-all active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const data = dashboardData || {
        summary: { total_projects: 0, active_users: 0, processed_queries: 0, system_health: "OPTIMAL", cpu_load_pct: 0, memory_usage_gb: 0 },
        costs_usd: { total_monthly: 0, gee_compute: 0, groq_llm: 0, vector_store_hosting: 0 },
        ai_usage: { total_tokens_consumed: 0, prompt_tokens: 0, completion_tokens: 0, avg_latency_ms: 0 },
        monthly_growth: []
    };

    return (
        <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gray-950/90 border-b border-gray-800 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h2 className="text-xl font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                            Enterprise Cost & Administration Console
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportReport}
                            className="bg-sky-600 hover:bg-sky-500 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow transition-all active:scale-95"
                        >
                            Export Costs CSV
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
                    
                    {/* Performance & Health Widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { title: "System Health", val: data.summary.system_health, unit: "status ok", color: "text-emerald-400" },
                            { title: "Server CPU Load", val: `${data.summary.cpu_load_pct}%`, unit: "allocation", color: "text-sky-400" },
                            { title: "Host Memory RAM", val: `${data.summary.memory_usage_gb} GB`, unit: "used", color: "text-indigo-400" },
                            { title: "Cumulative Token Billing", val: `${(data.costs_usd.total_monthly).toFixed(2)}`, unit: "USD / mo", color: "text-amber-400" }
                        ].map((widget, i) => (
                            <div key={i} className="bg-gray-850 border border-gray-800 p-4 rounded-2xl flex flex-col justify-between">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{widget.title}</span>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className={`text-xl font-bold ${widget.color}`}>{widget.val}</span>
                                    <span className="text-[9px] text-gray-450 font-normal">{widget.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart & AI Token breakdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Area Chart Cost vs Queries growth */}
                        <div className="bg-gray-850 border border-gray-800 p-4 rounded-3xl space-y-3 md:col-span-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Monthly Billing Spikes & Project Growth</span>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.monthly_growth} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                                        <YAxis stroke="#9ca3af" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} />
                                        <Area type="monotone" dataKey="cost" name="Monthly Billing ($)" stroke="#38bdf8" fillOpacity={1} fill="url(#colorCost)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* AI Tokens consumption summary */}
                        <div className="bg-gray-850 border border-gray-800 p-4 rounded-3xl flex flex-col justify-between">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pb-2">AI Token Statistics</span>
                            
                            <div className="space-y-3 text-xs flex-1 pt-1.5">
                                <div className="flex justify-between border-b border-gray-800 pb-1.5">
                                    <span className="text-gray-450">Total Tokens:</span>
                                    <span className="font-bold text-gray-200 font-mono">{data.ai_usage.total_tokens_consumed.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1.5">
                                    <span className="text-gray-450">Prompt Input:</span>
                                    <span className="font-semibold text-gray-300 font-mono">{data.ai_usage.prompt_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1.5">
                                    <span className="text-gray-450">Completion Output:</span>
                                    <span className="font-semibold text-gray-300 font-mono">{data.ai_usage.completion_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-450">Avg LLM Latency:</span>
                                    <span className="font-bold text-sky-400 font-mono">{data.ai_usage.avg_latency_ms} ms</span>
                                </div>
                            </div>

                            <div className="bg-sky-500/5 border-l-2 border-sky-400 p-2 rounded-r-lg text-[10px] text-sky-300/80 leading-relaxed italic mt-3">
                                Cost aggregates compiled daily based on Groq API billing tokens weights.
                            </div>
                        </div>

                    </div>

                    {/* Audit Logs table */}
                    <div className="bg-gray-850 border border-gray-800 p-4 rounded-3xl space-y-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Compliance & Audit Session logs</span>
                        <div className="overflow-x-auto rounded-xl border border-gray-800">
                            <table className="w-full text-left text-xs text-gray-400">
                                <thead className="bg-gray-950 text-[9px] uppercase tracking-wider text-gray-500">
                                    <tr>
                                        <th className="p-3">Timestamp</th>
                                        <th className="p-3">User</th>
                                        <th className="p-3">Action</th>
                                        <th className="p-3">Resource Target</th>
                                        <th className="p-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 bg-gray-900/30">
                                    {auditLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-gray-800/20">
                                            <td className="p-3 font-mono text-[10px]">{new Date(log.timestamp * 1000).toLocaleTimeString()}</td>
                                            <td className="p-3 text-gray-300">{log.user}</td>
                                            <td className="p-3 font-bold text-sky-400">{log.action}</td>
                                            <td className="p-3 font-mono text-[10px]">{log.resource}</td>
                                            <td className="p-3 text-right font-semibold text-emerald-400">{log.status}</td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-3 text-center text-gray-500 italic">No audit records generated in active session.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-gray-950 px-6 py-4 flex items-center justify-between border-t border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
                    <span>Active Session: {userProfile?.email}</span>
                    <span>Admin Clearance Level: {userRole}</span>
                </div>

            </div>
        </div>
    );
};

export default EnterpriseDashboard;
