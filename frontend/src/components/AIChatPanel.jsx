import React, { useState, useRef, useEffect } from 'react';
import { useMap } from '../context/MapContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const AIChatPanel = () => {
    const {
        isChatOpen,
        setIsChatOpen,
        mapInstance,
        setSelectedAOI,
        setRoutingPath,
        t
    } = useMap();

    // Local Chat Messages with initial AI greeting
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I am your multi-agent GIS Copilot. Ask me questions like:\n- 'Where is the best location for a hospital?'\n- 'Suggest suitable restaurant sites Gandhi Nagar.'\n- 'Verify agricultural stress NDVI indices.'",
            explainability: {
                confidence_score: 0.95,
                active_agents: ["Planner Agent", "Memory Agent"],
                datasets_used: ["Vector Database", "User preferences"],
                assumptions: ["Assumes standard geoprocessing defaults."],
                limitations: ["Historical records index limits."]
            }
        }
    ]);
    const [inputMsg, setInputMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Voice Assistant States
    const [isListening, setIsListening] = useState(false);
    const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);

    // Active explanation card state
    const [activeExplain, setActiveExplain] = useState(null);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => {
                setIsListening(true);
            };

            rec.onresult = (e) => {
                const speechToText = e.results[0][0].transcript;
                setInputMsg(speechToText);
                toast.success("Voice recognized!");
            };

            rec.onerror = (err) => {
                console.error("Speech recognition error", err);
                setIsListening(false);
                toast.error("Voice input error. Check microphone settings.");
            };

            rec.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = rec;
        }
    }, []);

    // Text to Speech
    useEffect(() => {
        if (isSpeechEnabled && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant') {
                const plainText = lastMessage.content
                    .replace(/[*#_\-`~]/g, '') // Strip markdown
                    .split("🤖")[0] // Strip recommendation lists
                    .trim();
                
                const utterance = new SpeechSynthesisUtterance(plainText);
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            }
        }
    }, [messages, isSpeechEnabled]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error("Speech API is not supported in this browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    // Chat submit through Multi-Agent StateGraph
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!inputMsg.trim()) return;

        const userText = inputMsg;
        setInputMsg('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const res = await axios.post('http://127.0.0.1:8000/api/ai/chat/stream', {
                message: userText,
                session_id: "gis_copilot_session"
            });

            const reply = {
                role: 'assistant',
                content: res.data.content,
                explainability: res.data.explainability,
                recommendations: res.data.recommendations
            };

            setMessages(prev => [...prev, reply]);
            
            // Set active explanation card
            setActiveExplain(res.data.explainability);

            // Auto fly map to candidate recommendations if they exist!
            if (res.data.recommendations && res.data.recommendations.length > 0) {
                const firstRec = res.data.recommendations[0];
                if (mapInstance && firstRec.coordinates) {
                    mapInstance.flyTo([firstRec.coordinates[0], firstRec.coordinates[1]], 13, { animate: true });
                    toast.success(`Centered map on recommended: ${firstRec.name}`);
                }
            }

        } catch (err) {
            console.error(err);
            toast.error("Multi-agent orchestrator error. Check server log.");
        } finally {
            setIsLoading(false);
        }
    };

    // File Upload handling inside Chat UI
    const handleFileUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        const l = toast.loading(`Uploading and validating ${file.name}...`);
        
        const formData = new FormData();
        formData.append("file", file);
        
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/gis/validate-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Mount boundary polygon
            const geom = res.data.geometry;
            const targetGeometry = geom.type === 'FeatureCollection' ? geom.features[0].geometry : geom;
            setSelectedAOI(targetGeometry);

            // Add upload summary message in chat
            setMessages(prev => [
                ...prev,
                { role: 'user', content: `[Uploaded spatial file: ${file.name}]` },
                {
                    role: 'assistant',
                    content: `Successfully validated and parsed **${res.data.format}** file containing **${res.data.feature_count}** features. Boundaries mounted on Leaflet map!`,
                    explainability: {
                        confidence_score: 1.0,
                        active_agents: ["GIS Agent"],
                        datasets_used: [file.name],
                        assumptions: ["Assumes WGS-84 coordinate bounds."],
                        limitations: ["Limited to uploaded geometry nodes."]
                    }
                }
            ]);
            
            toast.success("Boundaries loaded onto map!", { id: l });

            // Center map
            if (mapInstance && targetGeometry.coordinates) {
                let center;
                if (targetGeometry.type === 'Polygon') {
                    const coords = targetGeometry.coordinates[0];
                    const lat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
                    const lon = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
                    center = [lat, lon];
                }
                if (center) mapInstance.flyTo(center, 12);
            }
        } catch (err) {
            toast.error("Geospatial validation failed.", { id: l });
        } finally {
            setIsLoading(false);
        }
    };

    // Report Generator compilation
    const handleDownloadReport = async (msg) => {
        if (!msg || msg.role !== 'assistant') return;
        
        const l = toast.loading("Compiling ReportLab PDF document...");
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/report/generate-doc', {
                project_name: "GIS Copilot Study",
                summary_text: msg.content.split("🤖")[0],
                suitability_score: msg.explainability?.confidence_score * 100 || 85,
                metrics: {
                    confidence_score: msg.explainability?.confidence_score || 0.85,
                    agents_involved: msg.explainability?.active_agents?.join(", ") || "Planner",
                    datasets: msg.explainability?.datasets_used?.join(", ") || "Vector store"
                }
            }, {
                responseType: 'blob'
            });

            const fileBlob = new Blob([res.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(fileBlob);
            const link = document.createElement('a');
            link.href = fileURL;
            link.setAttribute('download', 'GeoQuery_Spatial_Report.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Executive PDF report downloaded!", { id: l });
        } catch (err) {
            toast.error("Report generation failed.", { id: l });
        }
    };

    if (!isChatOpen) {
        return (
            <button
                onClick={() => setIsChatOpen(true)}
                className="absolute bottom-5 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border border-sky-400/30"
                title="Open AI Chat Assistant"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="absolute top-5 right-5 z-[1000] flex h-[85vh] w-[400px] flex-col rounded-2xl border border-gray-700/60 bg-gray-900/90 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-semibold tracking-wider text-sky-400">{t('gis_copilot')}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Read Aloud Toggle */}
                    <button
                        onClick={() => {
                            const next = !isSpeechEnabled;
                            setIsSpeechEnabled(next);
                            if (!next) window.speechSynthesis.cancel();
                            toast.success(next ? "Text-to-Speech Activated" : "Speech Muted");
                        }}
                        className={`p-1.5 rounded transition-colors ${isSpeechEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-white'}`}
                        title="Toggle Voice Synthesis"
                    >
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                    
                    <button
                        onClick={() => setIsChatOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md ${
                                msg.role === 'user'
                                    ? 'bg-gradient-to-r from-sky-500 to-indigo-650 text-white rounded-br-none'
                                    : 'bg-gray-850 text-gray-200 border border-gray-800 rounded-bl-none'
                            }`}
                        >
                            <p className="whitespace-pre-line leading-relaxed font-sans">{msg.content}</p>
                            
                            {/* PDF Report Export button inside AI message */}
                            {msg.role === 'assistant' && (
                                <button
                                    onClick={() => handleDownloadReport(msg)}
                                    className="mt-3 w-full py-1.5 bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 text-sky-400 rounded-lg font-bold text-[10px] tracking-wider transition-colors flex items-center justify-center gap-1.5"
                                >
                                    📥 Export Executive PDF Report
                                </button>
                            )}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 px-1">
                            {msg.role === 'user' ? 'You' : 'Copilot'}
                        </span>
                    </div>
                ))}
                
                {/* Streaming Indicator */}
                {isLoading && (
                    <div className="flex flex-col items-start">
                        <div className="bg-gray-850 border border-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                            <div className="flex space-x-1.5">
                                <div className="h-1.5 w-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="h-1.5 w-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="h-1.5 w-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">Routing through LangGraph...</span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Explainable AI side drawer / overlay */}
            {activeExplain && (
                <div className="bg-gray-950/95 border-t border-gray-800 p-3.5 space-y-2 text-[10px] font-mono text-gray-300 leading-relaxed max-h-[220px] overflow-y-auto scrollbar-thin">
                    <div className="flex justify-between items-baseline font-bold text-sky-400 pb-1 border-b border-gray-900">
                        <span>💡 Explainable AI Summary</span>
                        <span>Confidence: {(activeExplain.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                        <div>
                            <span className="text-gray-500 font-bold block">Active Agents:</span>
                            <span className="text-gray-350">{activeExplain.active_agents.join(', ')}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-bold block">Datasets Index:</span>
                            <span className="text-gray-350">{activeExplain.datasets_used.join(', ')}</span>
                        </div>
                    </div>
                    <div className="pt-1.5">
                        <span className="text-gray-500 font-bold block">Planner Assumptions:</span>
                        <ul className="list-disc list-inside text-gray-400 pl-0.5 space-y-0.5">
                            {activeExplain.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </div>
                    <div className="pt-1">
                        <span className="text-gray-500 font-bold block">Simulations Limitations:</span>
                        <ul className="list-disc list-inside text-gray-400 pl-0.5 space-y-0.5">
                            {activeExplain.limitations.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-3 bg-gray-950 border-t border-gray-800/80 flex items-center gap-1.5">
                
                {/* Voice button */}
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                        isListening 
                            ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 shadow-md' 
                            : 'bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                    title={isListening ? "Stop listening" : "Talk to GIS assistant"}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
                
                {/* Spatial file upload button */}
                <button
                    type="button"
                    onClick={handleFileUploadClick}
                    className="h-9 w-9 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                    title="Upload Shapefile, GeoJSON, KML, CSV"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".zip,.geojson,.json,.kml,.csv"
                />
                
                <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Ask about hospital locations suitability..."
                    className="flex-1 bg-gray-900 border border-gray-800 hover:border-gray-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-gray-600 transition-colors"
                    disabled={isLoading}
                />
                
                <button
                    type="submit"
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-650 hover:scale-105 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-50"
                    disabled={isLoading || !inputMsg.trim()}
                >
                    <svg className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default AIChatPanel;
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
