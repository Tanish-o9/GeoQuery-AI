import React, { useState } from 'react';
import { useMap } from '../context/MapContext';
import DateRangePicker from './DateRangePicker';
import QueryPanel from './QueryPanel';
import TimeSeriesChart from './TimeSeriesChart';
import { analyzeAOI } from '../services/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

import AnalysisReport from './AnalysisReport';
import DrawAnalyzePanel from './DrawAnalyzePanel';
import AdvancedGisWidget from './AdvancedGisWidget';

const Sidebar = () => {
    const {
        selectedAOI,
        dateRange,
        setAnalysisResults,
        isAnalyzing,
        setIsAnalyzing,
        analysisResults,
        isCompareMode,
        setIsCompareMode,
        secondaryAOI,
        setSecondaryAnalysisResults,
        secondaryAnalysisResults,
        setIsDashboardOpen,
        isCommandCenterOpen,
        setIsCommandCenterOpen
    } = useMap();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' or 'query'

    const handleAnalyze = async () => {
        if (!selectedAOI) {
            toast.error('Please draw an area on the map first');
            return;
        }

        setIsAnalyzing(true);
        const loadingToast = toast.loading('Analyzing area with satellite data...');

        try {
            const results = await analyzeAOI(selectedAOI, dateRange);
            setAnalysisResults(results);

            // Success Toast with Metrics
            toast.success(
                (t) => (
                    <div className="min-w-[200px]">
                        <p className="font-bold mb-1">Analysis Complete! 🛰️</p>
                        <ul className="text-sm space-y-1 text-gray-200">
                            <li>🌿 NDVI: {results.metrics?.ndvi?.mean?.toFixed(2)}</li>
                            <li>🏙️ Built-up: {results.metrics?.built_up_pct?.toFixed(1)}%</li>
                            <li>💧 Water: {results.metrics?.water_coverage_pct?.toFixed(1)}%</li>
                        </ul>
                    </div>
                ),
                {
                    id: loadingToast,
                    duration: 5000,
                    style: {
                        background: '#1f2937',
                        color: '#fff',
                        border: '1px solid #10b981',
                    }
                }
            );
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error(error.message || 'Failed to analyze area', { id: loadingToast });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCompareAnalyze = async () => {
        if (!secondaryAOI) return;

        setIsAnalyzing(true);
        try {
            const results = await analyzeAOI(secondaryAOI, dateRange);
            setSecondaryAnalysisResults(results);
            toast.success("Secondary area analyzed!");
        } catch (error) {
            toast.error("Failed to analyze secondary area");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportPDF = async () => {
        const input = document.getElementById('pdf-report');
        if (!input) return;

        const loadingToast = toast.loading('Generating Professional PDF report...');

        // Show the hidden report
        input.classList.remove('hidden');

        try {
            const dataUrl = await toPng(input, {
                cacheBust: true,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`geoquery-report-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("Report downloaded successfully!", { id: loadingToast });
        } catch (error) {
            console.error('Export failed', error);
            toast.error(`Failed to generate PDF: ${error.message}`, { id: loadingToast });
        } finally {
            // Hide the report again
            input.classList.add('hidden');
        }
    };

    return (
        <>
            {/* Mobile toggle button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="lg:hidden fixed top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-md text-white p-3 rounded-lg shadow-lg border border-gray-700"
            >
                {isCollapsed ? '☰' : '✕'}
            </button>

            {/* Sidebar */}
            <div
                className={`fixed lg:relative top-0 left-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 shadow-2xl z-[999] transition-transform duration-300 ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
                    }`}
            >
                <div className="h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800">
                        <div className="flex justify-between items-start mb-2">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                GeoQuery AI
                            </h1>
                            <div className="flex flex-col items-end gap-1.5">
                                <button
                                    onClick={() => {
                                        if (window.confirm("Clear all selection and history?")) {
                                            window.location.reload(); // Quick way to reset all states
                                            localStorage.clear();
                                        }
                                    }}
                                    className="text-[9px] text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setIsCommandCenterOpen(true)}
                                    className="text-[9px] text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest font-bold font-mono"
                                >
                                    🖥️ Cmd Center
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            Satellite-powered geospatial intelligence
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('analyze')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'analyze'
                                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Analyze
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('query')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === 'query'
                                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Query
                            </div>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div id="sidebar-content" className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'analyze' ? (
                            <div className="space-y-6">
                                {/* Instructions */}
                                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <h3 className="text-sm font-semibold text-blue-400 mb-2">
                                        📍 How to use
                                    </h3>
                                    <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                                        <li>Draw a rectangle or polygon on the map</li>
                                        <li>Select your date range below</li>
                                        <li>Click "Analyze Area" to get insights</li>
                                        <li>Toggle "Compare Mode" to analyze a second area</li>
                                    </ol>

                                    {/* Comparison Toggle */}
                                    <div className="mt-4 flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                        <span className="text-sm font-medium text-white">Compare Mode</span>
                                        <button
                                            onClick={() => setIsCompareMode(!isCompareMode)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isCompareMode ? 'bg-purple-500' : 'bg-gray-600'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCompareMode ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range Picker */}
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-3">
                                        📅 Time Period
                                    </h3>
                                    <DateRangePicker />
                                </div>

                                {/* AOI Info */}
                                {selectedAOI && (
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <h3 className="text-sm font-semibold text-green-400 mb-2">
                                            ✓ Area Selected
                                        </h3>
                                        <p className="text-xs text-gray-300">
                                            {selectedAOI.type === 'Polygon' ? 'Polygon' : 'Rectangle'} with{' '}
                                            {selectedAOI.coordinates[0].length} points
                                        </p>
                                    </div>
                                )}

                                {/* Secondary AOI Info */}
                                {isCompareMode && secondaryAOI && (
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                        <h3 className="text-sm font-semibold text-purple-400 mb-2">
                                            ✓ Secondary Area
                                        </h3>
                                        <p className="text-xs text-gray-300">
                                            Comparison area selected
                                        </p>
                                    </div>
                                )}

                                {/* Analyze Button */}
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!selectedAOI || isAnalyzing}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${!selectedAOI || isAnalyzing
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                                        }`}
                                >
                                    {isAnalyzing ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Analyzing...
                                        </span>
                                    ) : (
                                        '🛰️ Analyze Area'
                                    )}
                                </button>

                                {/* Compare Button */}
                                {isCompareMode && (
                                    <button
                                        onClick={handleCompareAnalyze}
                                        disabled={!secondaryAOI || isAnalyzing}
                                        className={`w-full mt-2 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${!secondaryAOI || isAnalyzing
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                                            }`}
                                    >
                                        Compare Second Area
                                    </button>
                                )}

                                {/* Analysis Results Summary */}
                                {analysisResults && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg">
                                            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center justify-between">
                                                <span>✓ Analysis Complete</span>
                                                <span className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</span>
                                            </h3>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                    <span className="text-xs text-gray-400">Vegetation (NDVI)</span>
                                                    <span className="text-lg font-bold text-green-400">
                                                        {analysisResults.metrics?.ndvi?.mean?.toFixed(2) || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                    <span className="text-xs text-gray-400">Built-up Area</span>
                                                    <span className="text-lg font-bold text-orange-400">
                                                        {analysisResults.metrics?.built_up_pct?.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                    <span className="text-xs text-gray-400">Water Cover</span>
                                                    <span className="text-lg font-bold text-blue-400">
                                                        {analysisResults.metrics?.water_coverage_pct?.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                    <span className="text-xs text-gray-400">Trend</span>
                                                    <span className="text-lg font-bold text-purple-400 capitalize">
                                                        {analysisResults.metrics?.ndvi?.trend || 'Stable'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Time Series Chart */}
                                            {analysisResults.time_series_data && (
                                                <div className="mb-4">
                                                    <TimeSeriesChart data={analysisResults.time_series_data} />
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-300 mb-3 italic border-t border-gray-700 pt-2">
                                                "{analysisResults.summaries?.[0]?.split('.')[0]}..."
                                            </p>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setActiveTab('query')}
                                                    className="flex-1 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transform transition-all hover:scale-105"
                                                >
                                                    ✨ Ask AI
                                                </button>
                                                <button
                                                    onClick={() => setIsDashboardOpen(true)}
                                                    className="flex-1 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl shadow border border-gray-700 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    📊 Stats
                                                </button>
                                            </div>

                                            {/* Advanced Draw & Analyze Section */}
                                            <DrawAnalyzePanel analysisResults={analysisResults} />
                                        </div>
                                    </div>
                                )}

                                {/* Secondary Results */}
                                {secondaryAnalysisResults && (
                                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg mt-4">
                                        <h3 className="text-sm font-semibold text-purple-400 mb-3">
                                            ✓ Secondary Analysis
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                <span className="text-xs text-gray-400">Vegetation</span>
                                                <span className="text-lg font-bold text-green-400">
                                                    {secondaryAnalysisResults.metrics?.ndvi?.mean?.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="p-2 bg-gray-800/50 rounded flex flex-col">
                                                <span className="text-xs text-gray-400">Built-up</span>
                                                <span className="text-lg font-bold text-orange-400">
                                                    {secondaryAnalysisResults.metrics?.built_up_pct?.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <AdvancedGisWidget />
                            </div>
                        ) : (
                            <QueryPanel currentAoiId={analysisResults?.aoi_id} />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-800">
                        <p className="text-xs text-gray-500 text-center">
                            Powered by Google Earth Engine & Groq AI
                        </p>
                    </div>
                </div>
            </div>
            {/* Hidden Report Template */}
            <AnalysisReport
                analysisResults={analysisResults}
                secondaryAnalysisResults={secondaryAnalysisResults}
                dateRange={dateRange}
                selectedAOI={selectedAOI}
                secondaryAOI={secondaryAOI}
            />
        </>
    );
};

export default Sidebar;
