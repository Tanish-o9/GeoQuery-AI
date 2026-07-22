import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const MapContext = createContext();

export const useMap = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMap must be used within MapProvider');
    }
    return context;
};

const DEFAULT_LAYERS = {
    satellite: { visible: false, opacity: 1.0, name: "Satellite Imagery" },
    terrain: { visible: false, opacity: 1.0, name: "Topographic Terrain" },
    road: { visible: true, opacity: 1.0, name: "Street Roads (OSM)" },
    hybrid: { visible: false, opacity: 1.0, name: "Satellite Hybrid" },
    heatmap: { visible: false, opacity: 0.6, name: "Population Heatmap" },
    population: { visible: false, opacity: 0.6, name: "Population Density" },
    weather: { visible: false, opacity: 0.5, name: "Live Weather Overlay" },
    ndvi: { visible: false, opacity: 0.7, name: "NDVI Vegetation Proxy" },
    flood: { visible: false, opacity: 0.6, name: "Flood Risk Map" },
    forest: { visible: false, opacity: 0.6, name: "Forest Cover Index" }
};

export const TRANSLATIONS = {
    en: {
        gis_copilot: "GIS AI Copilot",
        workspaces: "Team Workspace",
        import_file: "Import GIS File",
        pipelines: "GIS Pipelines",
        admin_dashboard: "Admin Dashboard",
        what_if: "What-If Simulator",
        knowledge_graph: "Knowledge Graph",
        gis_marketplace: "GIS Marketplace",
        spatial_analytics: "Spatial Analytics",
        langgraph_process: "LangGraph Process State:"
    },
    hi: {
        gis_copilot: "जीआईएस एआई कोपायलट",
        workspaces: "टीम वर्कस्पेस",
        import_file: "जीआईएस फ़ाइल आयात करें",
        pipelines: "जीआईएस पाइपलाइन्स",
        admin_dashboard: "एडमिन डैशबोर्ड",
        what_if: "व्हाट-इफ सिम्युलेटर",
        knowledge_graph: "नॉलेज ग्राफ",
        gis_marketplace: "जीआईएस मार्केटप्लेस",
        spatial_analytics: "स्थानिक विश्लेषण",
        langgraph_process: "लैंगग्राफ प्रक्रिया स्थिति:"
    },
    es: {
        gis_copilot: "Copiloto de IA SIG",
        workspaces: "Espacio de Trabajo",
        import_file: "Importar Archivo SIG",
        pipelines: "Tuberías SIG",
        admin_dashboard: "Panel de Admin",
        what_if: "Simulador Y Si",
        knowledge_graph: "Gráfico de Conocimiento",
        gis_marketplace: "Mercado SIG",
        spatial_analytics: "Análisis Espacial",
        langgraph_process: "Estado del Proceso LangGraph:"
    }
};

export const MapProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
    const [mapProjectionMode, setMapProjectionMode] = useState('flat');

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key) => {
        return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
    };
    // Load initial states from localStorage
    const savedAOI = JSON.parse(localStorage.getItem('selectedAOI'));
    const savedResults = JSON.parse(localStorage.getItem('analysisResults'));
    const savedLayers = JSON.parse(localStorage.getItem('gisLayers')) || DEFAULT_LAYERS;

    const [selectedAOI, setSelectedAOI] = useState(savedAOI || null);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            .toISOString()
            .split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    
    // Core states
    const [analysisResults, setAnalysisResults] = useState(savedResults || null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);
    const [gisLayers, setGisLayers] = useState(savedLayers);
    
    // AI Chat Panel states
    const [chatMessages, setChatMessages] = useState([
        {
            role: "assistant",
            content: "Hello! I am your AI GIS Assistant. Draw an Area of Interest (AOI) using the drawing toolbar on the left, or ask me questions. Try typing 'zoom to London' or 'show Satellite layer'!",
            commands: [],
            reasoning: "Initialization complete."
        }
    ]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [reasoningSteps, setReasoningSteps] = useState([]);
    const [sessionId] = useState(`session_${Math.random().toString(36).substring(2, 10)}`);
    
    // Advanced GIS state overlays
    const [routingPath, setRoutingPath] = useState(null);
    const [searchedLocationMarker, setSearchedLocationMarker] = useState(null);
    const [ndviPoints, setNdviPoints] = useState([]);
    const [congestionSegments, setCongestionSegments] = useState([]);
    const [expansionPolygons, setExpansionPolygons] = useState([]);
    
    // Auth profile state
    const [userProfile, setUserProfile] = useState(JSON.parse(localStorage.getItem('userProfile')) || null);

    useEffect(() => {
        if (userProfile) {
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
        } else {
            localStorage.removeItem('userProfile');
        }
    }, [userProfile]);
    
    // Dashboard States
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);

    // Comparison Mode State
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [secondaryAOI, setSecondaryAOI] = useState(null);
    const [secondaryAnalysisResults, setSecondaryAnalysisResults] = useState(null);

    // Persist basic variables
    useEffect(() => {
        localStorage.setItem('selectedAOI', JSON.stringify(selectedAOI));
    }, [selectedAOI]);

    useEffect(() => {
        localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
    }, [analysisResults]);

    useEffect(() => {
        localStorage.setItem('gisLayers', JSON.stringify(gisLayers));
    }, [gisLayers]);

    // Retrieve initial dashboard data
    const fetchDashboardData = async (aoiId = null) => {
        try {
            const url = aoiId 
                ? `http://127.0.0.1:8000/api/analytics/dashboard?aoi_id=${aoiId}` 
                : 'http://127.0.0.1:8000/api/analytics/dashboard';
            const response = await axios.get(url);
            setDashboardData(response.data);
        } catch (error) {
            console.error("Error fetching dashboard statistics", error);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [analysisResults]);

    const handleSendChatMessage = async (msg) => {
        if (!msg.trim()) return;
        
        // Append user message
        const newUserMsg = { role: "user", content: msg, commands: [], reasoning: "" };
        setChatMessages(prev => [...prev, newUserMsg]);
        setIsChatLoading(true);
        setReasoningSteps(["Transmitting query to LangGraph execution agent..."]);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/chat/message', {
                message: msg,
                session_id: sessionId
            });
            
            const agentReply = response.data;
            
            // Set reasoning steps
            setReasoningSteps(agentReply.reasoning || []);
            
            // Append assistant reply
            setChatMessages(prev => [...prev, {
                role: "assistant",
                content: agentReply.answer,
                commands: agentReply.commands || [],
                reasoning: agentReply.reasoning ? agentReply.reasoning.join("\n") : ""
            }]);
            
            // Execute map commands if provided
            if (agentReply.commands && agentReply.commands.length > 0) {
                executeMapCommands(agentReply.commands);
            }
        } catch (error) {
            console.error("Error sending message to AI agent:", error);
            toast.error("Failed to receive agent response. Verify backend connectivity.");
            setChatMessages(prev => [...prev, {
                role: "assistant",
                content: "I'm sorry, I encountered an issue reaching the LangGraph GIS engine. Please verify the FastAPI server is running.",
                commands: [],
                reasoning: "Connection timeout or server error."
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const executeMapCommands = (commands) => {
        commands.forEach(cmd => {
            const { action, target, zoom, layer, visible, opacity } = cmd;
            
            if (action === "zoom" && mapInstance && target) {
                mapInstance.flyTo(target, zoom || 12, { animate: true, duration: 1.5 });
                toast.success(`Zooming to location...`);
            }
            
            if (action === "layer_toggle" && layer) {
                setGisLayers(prev => {
                    const nextLayers = {
                        ...prev,
                        [layer]: {
                            ...prev[layer],
                            visible: visible !== undefined ? visible : !prev[layer].visible,
                            opacity: opacity !== undefined ? opacity : prev[layer].opacity
                        }
                    };
                    return nextLayers;
                });
                toast.success(`Layer updated: ${layer.capitalize()}`);
            }
        });
    };

    const toggleLayer = (layerKey) => {
        setGisLayers(prev => ({
            ...prev,
            [layerKey]: {
                ...prev[layerKey],
                visible: !prev[layerKey].visible
            }
        }));
    };

    const setLayerOpacity = (layerKey, val) => {
        setGisLayers(prev => ({
            ...prev,
            [layerKey]: {
                ...prev[layerKey],
                opacity: val
            }
        }));
    };

    const clearHistory = () => {
        setSelectedAOI(null);
        setAnalysisResults(null);
        setSecondaryAOI(null);
        setSecondaryAnalysisResults(null);
        setChatMessages([
            {
                role: "assistant",
                content: "History cleared. How can I assist you with spatial intelligence today?",
                commands: [],
                reasoning: "State reset."
            }
        ]);
        setGisLayers(DEFAULT_LAYERS);
        localStorage.removeItem('selectedAOI');
        localStorage.removeItem('analysisResults');
    };

    const value = {
        selectedAOI,
        setSelectedAOI,
        dateRange,
        setDateRange,
        analysisResults,
        setAnalysisResults,
        isAnalyzing,
        setIsAnalyzing,
        isCompareMode,
        setIsCompareMode,
        secondaryAOI,
        setSecondaryAOI,
        secondaryAnalysisResults,
        setSecondaryAnalysisResults,
        clearHistory,
        
        // GIS Map Ref
        mapInstance,
        setMapInstance,
        
        // Layer Manager
        gisLayers,
        setGisLayers,
        toggleLayer,
        setLayerOpacity,
        
        // Chat Panel
        chatMessages,
        isChatOpen,
        setIsChatOpen,
        isChatLoading,
        reasoningSteps,
        handleSendChatMessage,
        
        // Dashboard
        isDashboardOpen,
        setIsDashboardOpen,
        dashboardData,
        fetchDashboardData,

        // Advanced GIS States
        routingPath,
        setRoutingPath,
        ndviPoints,
        setNdviPoints,
        congestionSegments,
        setCongestionSegments,
        expansionPolygons,
        setExpansionPolygons,

        // Auth
        userProfile,
        setUserProfile,

        // Translations
        language,
        setLanguage,
        t,

        // Map Projection Mode (flat / globe)
        mapProjectionMode,
        setMapProjectionMode,

        // Search Marker
        searchedLocationMarker,
        setSearchedLocationMarker,

        // Command Center
        isCommandCenterOpen,
        setIsCommandCenterOpen
    };

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

// Simple utility function added to prototype
if (!String.prototype.capitalize) {
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
}
