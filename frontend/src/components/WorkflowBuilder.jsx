import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const WorkflowBuilder = () => {
    const { selectedAOI, setRoutingPath, setNdviPoints, setCongestionSegments } = useMap();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [activeNodes, setActiveNodes] = useState([]);
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const loadTemplates = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/workflows/templates');
            setTemplates(res.data);
            if (res.data.length > 0) {
                setSelectedTemplateId(res.data[0].id);
                setActiveNodes(res.data[0].nodes);
            }
        } catch (e) {
            console.error("Error loading workflow templates:", e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const handleSelectTemplate = (e) => {
        const tId = e.target.value;
        setSelectedTemplateId(tId);
        const templ = templates.find(t => t.id === tId);
        if (templ) {
            setActiveNodes(templ.nodes);
        }
        setTerminalLogs([]);
    };

    const handleRunPipeline = async () => {
        if (!selectedAOI) {
            toast.error("Please draw a polygon boundary on the map first to bind the pipeline!");
            return;
        }

        setIsRunning(true);
        setTerminalLogs(["[16:21:05] INITIALIZING WORKFLOW ENGINE...", `[16:21:05] Loading pipeline template: ${selectedTemplateId}`]);
        const loadToast = toast.loading("Executing visual GIS pipeline...");

        try {
            const res = await axios.post('http://127.0.0.1:8000/api/workflows/run', {
                pipeline_id: selectedTemplateId,
                geometry: selectedAOI
            });

            // Simulate step-by-step logs with delay to make it feel extremely interactive and visual!
            const steps = res.data.execution_steps;
            for (let i = 0; i < steps.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 800));
                const s = steps[i];
                setTerminalLogs(prev => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] NODE [${s.node_id}] - ${s.step}: ${s.status}`,
                    `  -> Log: ${s.log}`
                ]);
            }
            
            // Map overlays if environmental hazard pipeline was run
            if (selectedTemplateId === 'environmental_hazard_pipeline') {
                // Mock render routing path
                setRoutingPath([
                    [23.21, 72.62],
                    [23.21, 72.65],
                    [23.24, 72.65]
                ]);
                toast.success("Bypass routing mapped by Pipeline action!", { id: loadToast });
            } else {
                toast.success("Pipeline ran successfully!", { id: loadToast });
            }

        } catch (err) {
            console.error(err);
            toast.error("Pipeline execution failed. Check active connection.", { id: loadToast });
        } finally {
            setIsRunning(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-27 left-14 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Create visual workflow GIS pipelines"
            >
                ⚙️ GIS Pipelines
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[85vh]">
                
                {/* Header */}
                <div className="bg-gray-950/90 border-b border-gray-800 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h2 className="text-xl font-bold tracking-wider bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                            Visual GIS Workflow Pipeline Builder
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedTemplateId}
                            onChange={handleSelectTemplate}
                            className="bg-gray-800 border border-gray-700 text-xs px-3 py-1.5 rounded-xl text-white outline-none focus:border-sky-500 transition-colors"
                        >
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRunPipeline}
                            disabled={isRunning}
                            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold px-4 py-1.5 rounded-xl shadow transition-all active:scale-95"
                        >
                            {isRunning ? "Running..." : "Run Pipeline"}
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

                {/* Main Content Split Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden h-[55vh]">
                    
                    {/* Visual canvas (SVG Flowchart builder) */}
                    <div className="md:col-span-2 bg-gray-950 p-6 overflow-auto relative flex flex-col justify-center items-center border-r border-gray-800">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest absolute top-4 left-4">Pipeline Canvas</span>
                        
                        <div className="space-y-8 relative w-full max-w-sm flex flex-col items-center py-4">
                            {activeNodes.map((node, idx) => (
                                <React.Fragment key={node.id}>
                                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-between gap-3 text-xs w-64 shadow-md hover:border-sky-500 transition-all z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">
                                                {node.type === 'trigger' ? '🔔' :
                                                 node.type === 'parallel' ? '🔀' :
                                                 node.type === 'agent' ? '🤖' :
                                                 node.type === 'condition' ? '⚖️' :
                                                 node.type === 'loop' ? '🔁' : '⚙️'}
                                            </span>
                                            <span className="font-semibold text-gray-200">{node.label}</span>
                                        </div>
                                        <span className="text-[8px] bg-gray-850 px-1.5 py-0.5 rounded uppercase text-gray-500 font-mono">{node.type}</span>
                                    </div>
                                    
                                    {/* Render SVG connection line if not the last node */}
                                    {idx < activeNodes.length - 1 && (
                                        <svg className="absolute w-1 h-8 text-gray-850" style={{ top: `${(idx + 1) * 60 + 20}px` }}>
                                            <line x1="0" y1="0" x2="0" y2="32" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3,3" />
                                        </svg>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Console / Terminal Log Output */}
                    <div className="bg-gray-900/40 p-4 overflow-y-auto flex flex-col h-full space-y-3">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Execution Terminal</span>
                        <div className="flex-1 bg-black rounded-2xl p-3 font-mono text-[10px] text-emerald-400 overflow-y-auto space-y-1.5 scrollbar-thin">
                            {terminalLogs.length > 0 ? (
                                terminalLogs.map((log, idx) => (
                                    <div key={idx} className={log.startsWith("  ->") ? "text-gray-400 pl-4" : "text-emerald-400"}>
                                        {log}
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-600 italic">Waiting for pipeline execution...</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-gray-950 px-6 py-4 flex items-center justify-between border-t border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
                    <span>Target Bound: {selectedAOI ? "ACTIVE COORDINATE MAPPED" : "NO GEOMETRY BOUNDED"}</span>
                    <span>GeoQuery Pipeline engine v1.2</span>
                </div>

            </div>
        </div>
    );
};

export default WorkflowBuilder;
