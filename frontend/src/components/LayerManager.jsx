import React, { useState } from 'react';
import { useMap } from '../context/MapContext';

const LayerManager = () => {
    const { gisLayers, toggleLayer, setLayerOpacity } = useMap();
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-5 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Manage GIS Map Layers"
            >
                <svg className="h-4.5 w-4.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Layers Manager
            </button>
        );
    }

    return (
        <div className="absolute top-5 left-14 z-[1000] w-72 rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">GIS Layer Manager</span>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Layer List */}
            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-thin">
                {Object.entries(gisLayers).map(([key, config]) => (
                    <div
                        key={key}
                        className="bg-gray-800/40 border border-gray-800 hover:border-gray-700/50 p-2.5 rounded-xl flex flex-col gap-1.5 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-200">{config.name}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.visible}
                                    onChange={() => toggleLayer(key)}
                                    className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500"></div>
                            </label>
                        </div>
                        
                        {/* Opacity slider */}
                        {config.visible && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">Opacity:</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.05"
                                    value={config.opacity}
                                    onChange={(e) => setLayerOpacity(key, parseFloat(e.target.value))}
                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                                />
                                <span className="text-[10px] text-sky-300 font-mono w-6 text-right">
                                    {Math.round(config.opacity * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">GeoQuery AI layer engine</span>
            </div>
        </div>
    );
};

export default LayerManager;
