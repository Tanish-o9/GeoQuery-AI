import React from 'react';
import TimeSeriesChart from './TimeSeriesChart';

const AnalysisReport = ({
    analysisResults,
    secondaryAnalysisResults,
    dateRange,
    selectedAOI,
    secondaryAOI
}) => {
    if (!analysisResults) return null;

    return (
        <div id="pdf-report" className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">GeoQuery AI</h1>
                    <p className="text-sm text-gray-500 mt-1">Satellite Intelligence Report</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Generated on</p>
                    <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Analysis Period</h3>
                    <p className="text-gray-900 font-medium pt-1">
                        {dateRange.startDate?.toLocaleDateString()} - {dateRange.endDate?.toLocaleDateString()}
                    </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Area of Interest</h3>
                    <p className="text-gray-900 font-medium">
                        Primary: {selectedAOI.type === 'Polygon' ? 'Custom Polygon' : 'Rectangle'}
                        {secondaryAOI && <span className="block mt-1">Secondary: Comparison Area</span>}
                    </p>
                </div>
            </div>

            {/* Metrics Table */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Environmental Metrics</h2>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Area</th>
                                {secondaryAnalysisResults && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secondary Area</th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Vegetation Health (NDVI)</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {analysisResults.metrics?.ndvi?.mean?.toFixed(2)}
                                </td>
                                {secondaryAnalysisResults && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {secondaryAnalysisResults.metrics?.ndvi?.mean?.toFixed(2)}
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Index (-1 to 1)</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Built-up Area</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {analysisResults.metrics?.built_up_pct?.toFixed(1)}%
                                </td>
                                {secondaryAnalysisResults && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {secondaryAnalysisResults.metrics?.built_up_pct?.toFixed(1)}%
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Percentage</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Water Coverage</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {analysisResults.metrics?.water_coverage_pct?.toFixed(1)}%
                                </td>
                                {secondaryAnalysisResults && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {secondaryAnalysisResults.metrics?.water_coverage_pct?.toFixed(1)}%
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Percentage</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Section */}
            {analysisResults.time_series_data && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Historical Vegetation Trend</h2>
                    <div className="h-64 border border-gray-200 rounded-lg p-4 bg-white">
                        <TimeSeriesChart data={analysisResults.time_series_data} isLightMode={true} />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 italic">
                        * Chart shows the 12-month NDVI trend for the primary area of interest.
                    </p>
                </div>
            )}

            {/* AI Summary Section */}
            {analysisResults.summaries && analysisResults.summaries.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">AI Insight</h2>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-gray-800 text-sm leading-relaxed">
                            {analysisResults.summaries[0]}
                        </p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <p>GeoQuery AI - Satellite Analysis Platform</p>
                    <p>Powered by Google Earth Engine & Groq</p>
                </div>
            </div>
        </div>
    );
};

export default AnalysisReport;
