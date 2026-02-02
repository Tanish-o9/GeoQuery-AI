import React from 'react';
import { useMap } from '../context/MapContext';

const DateRangePicker = () => {
    const { dateRange, setDateRange } = useMap();

    const handleStartDateChange = (e) => {
        const newStart = e.target.value;
        setDateRange((prev) => ({ ...prev, start: newStart }));
    };

    const handleEndDateChange = (e) => {
        const newEnd = e.target.value;
        setDateRange((prev) => ({ ...prev, end: newEnd }));
    };

    // Get max date (today)
    const maxDate = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                </label>
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={handleStartDateChange}
                    max={dateRange.end}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                </label>
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={handleEndDateChange}
                    min={dateRange.start}
                    max={maxDate}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
            <div className="text-xs text-gray-400 bg-gray-800/30 p-3 rounded-lg">
                <p>📅 Analysis period: {Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24))} days</p>
            </div>
        </div>
    );
};

export default DateRangePicker;
