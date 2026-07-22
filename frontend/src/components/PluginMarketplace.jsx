import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const PluginMarketplace = () => {
    const { userProfile } = useMap();
    const [plugins, setPlugins] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const token = userProfile?.token || '';
    const userRole = userProfile?.role || 'Viewer';

    const loadPlugins = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/plugins/list');
            setPlugins(res.data);
        } catch (e) {
            console.error("Error loading marketplace plugins:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadPlugins();
        }
    }, [isOpen]);

    const handleInstallPlugin = async (pluginId) => {
        // Enforce RBAC in UI
        if (!['Admin', 'Manager'].includes(userRole)) {
            toast.error("Access denied. Analyst or Lead/Admin clearance required to register new GIS plugins.");
            return;
        }

        const l = toast.loading("Installing plugin module...");
        try {
            await axios.post('http://127.0.0.1:8000/api/plugins/install', 
                { plugin_id: pluginId },
                { headers: { 'Authorization': token } }
            );
            toast.success("Plugin installed successfully! Mapped in active workspace.", { id: l });
            loadPlugins();
        } catch (err) {
            const msg = err.response?.data?.detail || "Plugin install failed.";
            toast.error(msg, { id: l });
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-[372px] left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open GIS Plugins Marketplace"
            >
                🔌 GIS Marketplace
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[80vh]">
                
                {/* Header */}
                <div className="bg-gray-950/90 border-b border-gray-800 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-sky-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        <h2 className="text-xl font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                            Enterprise GIS Plugin Marketplace
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Grid Catalog */}
                <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh] scrollbar-thin">
                    <p className="text-xs text-gray-400 leading-normal">
                        Install official GeoQuery extensions to unlock advanced MCDA layers, real-time weather alerts, night overlays, and temporal carbon-offset estimators.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {plugins.map((plugin) => (
                            <div key={plugin.id} className="p-4 bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 font-mono">{plugin.category}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                            plugin.status === "Installed" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-400"
                                        }`}>
                                            {plugin.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-200">{plugin.name}</h3>
                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-gray-900">
                                    <span className="text-[10px] text-gray-500">Developer: GeoQuery Core</span>
                                    {plugin.status === "Available" ? (
                                        <button
                                            onClick={() => handleInstallPlugin(plugin.id)}
                                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[10px] tracking-wider transition-all"
                                        >
                                            Install
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-emerald-400 font-bold">✓ Ready</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-950 px-6 py-4 flex items-center justify-between border-t border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
                    <span>Active Role Clearance: {userRole}</span>
                    <span>GeoQuery Marketplace v1.0</span>
                </div>

            </div>
        </div>
    );
};

export default PluginMarketplace;
