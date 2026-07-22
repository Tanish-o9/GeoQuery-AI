import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const KnowledgeGraphWidget = () => {
    const [graphData, setGraphData] = useState(null);
    const [hoveredLink, setHoveredLink] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadGraph = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/ai/knowledge-graph');
            setGraphData(res.data);
        } catch (e) {
            console.error("Error loading spatial dependency graph:", e);
            toast.error("Failed to load knowledge graph.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadGraph();
        }
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-60 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open Interactive Knowledge Graph"
            >
                🕸️ Knowledge Graph
            </button>
        );
    }

    // Set fixed coordinate positions inside our 450x300 canvas to align nodes beautifully!
    const positions = {
        population: { x: 50, y: 150 },
        road: { x: 180, y: 150 },
        hospital: { x: 300, y: 80 },
        schools: { x: 300, y: 220 },
        weather: { x: 80, y: 40 },
        river: { x: 180, y: 40 },
        flood: { x: 400, y: 150 }
    };

    const getNodeColor = (type) => {
        switch (type) {
            case 'demographic': return '#38bdf8'; // sky
            case 'infrastructure': return '#6366f1'; // indigo
            case 'facility': return '#10b981'; // emerald
            case 'natural': return '#22c55e'; // green
            case 'hazard': return '#f43f5e'; // rose
            default: return '#f59e0b'; // amber
        }
    };

    const getLinkCoords = (sourceId, targetId) => {
        const start = positions[sourceId] || { x: 0, y: 0 };
        const end = positions[targetId] || { x: 0, y: 0 };
        return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    };

    return (
        <div className="absolute top-16 left-88 z-[1000] w-[480px] rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs">🕸️</span>
                    <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">Interactive Spatial Graph</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* SVG Graph Canvas */}
            <div className="p-4 space-y-4">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                    Hover over nodes or dashed relation links to trace demographic dependencies and environmental hazards propagation.
                </p>

                {graphData ? (
                    <div className="relative border border-gray-850 rounded-2xl bg-black/60 p-2 overflow-hidden flex items-center justify-center">
                        <svg className="w-full h-[300px]" viewBox="0 0 460 300">
                            <defs>
                                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                                </marker>
                            </defs>

                            {/* Render lines first so they sit below nodes */}
                            {graphData.links.map((link, idx) => {
                                const coords = getLinkCoords(link.source, link.target);
                                const isHovered = hoveredLink === idx;
                                return (
                                    <line
                                        key={idx}
                                        x1={coords.x1}
                                        y1={coords.y1}
                                        x2={coords.x2}
                                        y2={coords.y2}
                                        stroke={isHovered ? "#38bdf8" : "#374151"}
                                        strokeWidth={isHovered ? 2.5 : 1.5}
                                        strokeDasharray={isHovered ? "none" : "3,3"}
                                        markerEnd="url(#arrow)"
                                        className="cursor-pointer transition-colors"
                                        onMouseEnter={() => setHoveredLink(idx)}
                                        onMouseLeave={() => setHoveredLink(null)}
                                    />
                                );
                            })}

                            {/* Render node circles */}
                            {graphData.nodes.map((node) => {
                                const pos = positions[node.id] || { x: 50, y: 50 };
                                const isHovered = hoveredNode?.id === node.id;
                                const color = getNodeColor(node.type);
                                return (
                                    <g
                                        key={node.id}
                                        className="cursor-pointer group"
                                        onMouseEnter={() => setHoveredNode(node)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                    >
                                        <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r={isHovered ? 14 : 11}
                                            fill={color}
                                            stroke="#1e293b"
                                            strokeWidth="2.5"
                                            className="transition-all duration-150"
                                        />
                                        <text
                                            x={pos.x}
                                            y={pos.y + 24}
                                            textAnchor="middle"
                                            fill={isHovered ? "#38bdf8" : "#9ca3af"}
                                            fontSize={8}
                                            fontWeight={isHovered ? "bold" : "normal"}
                                            className="select-none pointer-events-none transition-colors"
                                        >
                                            {node.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        
                        {/* Hover Overlay Tooltip Card */}
                        {hoveredNode && (
                            <div className="absolute bottom-4 left-4 right-4 bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-[11px] leading-relaxed shadow-lg font-mono">
                                <div className="flex justify-between font-bold text-sky-400">
                                    <span>Node: {hoveredNode.label}</span>
                                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{hoveredNode.type}</span>
                                </div>
                                <p className="text-gray-400 mt-1">Interactions weight index: {hoveredNode.val}%</p>
                            </div>
                        )}

                        {hoveredLink !== null && (
                            <div className="absolute bottom-4 left-4 right-4 bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-[11px] leading-relaxed shadow-lg font-mono">
                                <div className="font-bold text-emerald-400">
                                    Relation link activated
                                </div>
                                <p className="text-gray-300 mt-1">
                                    <strong>{graphData.nodes.find(n => n.id === graphData.links[hoveredLink].source)?.label}</strong>
                                    {' '}→{' '}
                                    <span className="text-sky-300 font-bold">{graphData.links[hoveredLink].relation}</span>
                                    {' '}→{' '}
                                    <strong>{graphData.nodes.find(n => n.id === graphData.links[hoveredLink].target)?.label}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500 italic">
                        {isLoading ? "Retrieving spatial network models..." : "Failed to load graph."}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">DAG Dependencies Map</span>
            </div>
        </div>
    );
};

export default KnowledgeGraphWidget;
