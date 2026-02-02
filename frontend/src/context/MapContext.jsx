import React, { createContext, useContext, useState, useEffect } from 'react';

const MapContext = createContext();

export const useMap = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMap must be used within MapProvider');
    }
    return context;
};

export const MapProvider = ({ children }) => {
    // Load initial state from localStorage
    const savedAOI = JSON.parse(localStorage.getItem('selectedAOI'));
    const savedResults = JSON.parse(localStorage.getItem('analysisResults'));

    const [selectedAOI, setSelectedAOI] = useState(savedAOI || null);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            .toISOString()
            .split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [analysisResults, setAnalysisResults] = useState(savedResults || null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Comparison Mode State
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [secondaryAOI, setSecondaryAOI] = useState(null);
    const [secondaryAnalysisResults, setSecondaryAnalysisResults] = useState(null);

    // Persist shifts
    useEffect(() => {
        localStorage.setItem('selectedAOI', JSON.stringify(selectedAOI));
    }, [selectedAOI]);

    useEffect(() => {
        localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
    }, [analysisResults]);

    const clearHistory = () => {
        setSelectedAOI(null);
        setAnalysisResults(null);
        setSecondaryAOI(null);
        setSecondaryAnalysisResults(null);
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
        clearHistory
    };

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
