import React, { useState } from 'react';
import { useMap as useLeafletMap } from 'react-leaflet';
import { useMap as useGlobalMap } from '../context/MapContext';
import axios from 'axios';

const SearchControl = () => {
    const map = useLeafletMap();
    const { setSearchedLocationMarker } = useGlobalMap();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    addressdetails: 1
                }
            });
            setResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelect = (result) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        map.flyTo([lat, lon], 13);
        setResults([]);
        setQuery(result.display_name);

        // Generate simulated realistic weather and temperature
        const temp = Math.round(32 - Math.abs(lat) * 0.38 + (Math.sin(lon) * 3));
        let condition = "🌤️ Partly Cloudy";
        
        if (lat > 45 || temp < 5) {
            condition = "❄️ Light Snow";
        } else if (temp > 28) {
            condition = "☀️ Clear & Sunny";
        } else if (temp < 15) {
            condition = "🌫️ Overcast & Cool";
        } else if (Math.round(lat + lon) % 2 === 0) {
            condition = "🌧️ Light Rain";
        }

        setSearchedLocationMarker({
            lat,
            lon,
            name: result.display_name,
            temp,
            condition
        });
    };

    return (
        <div className="leaflet-top leaflet-right mt-16 mr-4 z-[1000]">
            <div className="leaflet-control bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden w-64">
                <form onSubmit={handleSearch} className="flex items-center p-2 gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search location..."
                        className="bg-transparent text-sm text-white focus:outline-none flex-1 min-w-0"
                    />
                    <button type="submit" className="text-gray-400 hover:text-white transition-colors">
                        {isSearching ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    </button>
                </form>

                {results.length > 0 && (
                    <ul className="max-h-48 overflow-y-auto border-t border-gray-800">
                        {results.map((result) => (
                            <li
                                key={result.place_id}
                                onClick={() => handleSelect(result)}
                                className="p-2 text-xs text-gray-300 hover:bg-gray-800 cursor-pointer border-b border-gray-800/50 last:border-0 truncate"
                            >
                                {result.display_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchControl;
