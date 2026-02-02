import React, { useState } from 'react';
import { queryAOI } from '../services/api';
import toast from 'react-hot-toast';

const QueryPanel = ({ currentAoiId = null }) => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [queryHistory, setQueryHistory] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!question.trim()) {
            toast.error('Please enter a question');
            return;
        }

        setLoading(true);
        try {
            const result = await queryAOI(question, currentAoiId);

            // Add to history
            const historyItem = {
                question,
                ...result,
                timestamp: new Date().toISOString(),
            };
            setQueryHistory([historyItem, ...queryHistory]);
            setResponse(result);
            setQuestion('');

            toast.success('Query answered successfully!');
        } catch (error) {
            console.error('Query error:', error);
            toast.error(error.message || 'Failed to process query');
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceBadgeColor = (confidence) => {
        switch (confidence) {
            case 'high':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'low':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-4">
            {/* Query Input */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Ask a Question
                </h3>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g., What is the vegetation coverage in the analyzed areas?"
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Ask Question
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Current Response */}
            {response && (
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 space-y-4">
                    <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-400">Latest Answer</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceBadgeColor(response.confidence)}`}>
                            {response.confidence} confidence
                        </span>
                    </div>

                    <p className="text-white leading-relaxed">{response.answer}</p>

                    {response.sources && response.sources.length > 0 && (
                        <div className="pt-3 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 mb-2">Sources ({response.sources.length}):</p>
                            <div className="space-y-2">
                                {response.sources.map((source, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                            {(source.similarity * 100).toFixed(0)}% match
                                        </span>
                                        <span className="text-gray-400">
                                            {source.date_range?.start} to {source.date_range?.end}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Query History */}
            {queryHistory.length > 0 && (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Queries
                    </h4>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {queryHistory.slice(0, 5).map((item, idx) => (
                            <div
                                key={idx}
                                className="p-3 bg-gray-900/30 rounded-lg border border-gray-700/30 cursor-pointer hover:bg-gray-900/50 transition-all"
                                onClick={() => setResponse(item)}
                            >
                                <p className="text-sm text-gray-300 font-medium mb-1">{item.question}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${getConfidenceBadgeColor(item.confidence)}`}>
                                        {item.confidence}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sample Questions */}
            {queryHistory.length === 0 && !response && (
                <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-4 border border-gray-700/20">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Sample Questions:</h4>
                    <div className="space-y-2">
                        {[
                            'What is the vegetation coverage in the analyzed areas?',
                            'Has urbanization increased over time?',
                            'How much water is present in the region?',
                            'Compare the built-up area across different locations',
                        ].map((sample, idx) => (
                            <button
                                key={idx}
                                onClick={() => setQuestion(sample)}
                                className="w-full text-left px-3 py-2 bg-gray-900/30 hover:bg-gray-900/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-gray-700/20 hover:border-gray-600/50"
                            >
                                {sample}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueryPanel;
