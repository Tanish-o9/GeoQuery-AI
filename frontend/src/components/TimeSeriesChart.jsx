import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TimeSeriesChart = ({ data, isLightMode = false }) => {
    if (!data || data.length === 0) return null;

    const textColor = isLightMode ? '#1f2937' : '#9ca3af'; // gray-800 vs gray-400
    const gridColor = isLightMode ? '#e5e7eb' : '#374151'; // gray-200 vs gray-700
    const bgColor = isLightMode ? 'bg-white border-0' : 'bg-gray-900/50 border-gray-800 border';

    return (
        <div className={`w-full h-48 rounded-lg p-2 ${bgColor}`}>
            {!isLightMode && (
                <h4 className="text-xs font-semibold text-gray-400 mb-2 ml-2">Vegetation Trend (12 Months)</h4>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: textColor }}
                        tickFormatter={(value) => value.split('-')[1]} // Show only month
                        interval={2}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: textColor }}
                        domain={[0, 1]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isLightMode ? '#fff' : '#1f2937',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '4px',
                            color: isLightMode ? '#000' : '#fff'
                        }}
                        itemStyle={{ color: '#34d399' }}
                        labelStyle={{ color: isLightMode ? '#6b7280' : '#d1d5db' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="ndvi"
                        stroke="#34d399"
                        fillOpacity={1}
                        fill="url(#colorNdvi)"
                        name="NDVI"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TimeSeriesChart;
