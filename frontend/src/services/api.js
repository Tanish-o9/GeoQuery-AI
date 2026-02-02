import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 seconds for GEE operations
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.error(`API Error: ${error.response.status}`, error.response.data);
        } else if (error.request) {
            console.error('API Error: No response received', error.request);
        } else {
            console.error('API Error:', error.message);
        }
        return Promise.reject(error);
    }
);

/**
 * Analyze an Area of Interest using Google Earth Engine
 * @param {Object} geometry - GeoJSON geometry object
 * @param {Object} dateRange - Object with start and end dates
 * @returns {Promise} Analysis results
 */
export const analyzeAOI = async (geometry, dateRange) => {
    try {
        const response = await apiClient.post('/api/analyze-aoi', {
            geometry,
            start_date: dateRange.start,
            end_date: dateRange.end,
        });
        return response.data;
    } catch (error) {
        // Re-throw with more context
        if (error.response?.data?.detail) {
            throw new Error(error.response.data.detail);
        }
        throw error;
    }
};

/**
 * Query analyzed AOIs using natural language
 * @param {string} question - Natural language question
 * @param {string} aoiId - Optional specific AOI ID to query
 * @param {number} topK - Number of similar results to retrieve
 * @returns {Promise} Query response with answer and sources
 */
export const queryAOI = async (question, aoiId = null, topK = 5) => {
    try {
        const response = await apiClient.post('/api/query', {
            question,
            aoi_id: aoiId,
            top_k: topK,
        });
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            throw new Error(error.response.data.detail);
        }
        throw error;
    }
};

/**
 * Get vector store statistics
 * @returns {Promise} Statistics about stored AOI analyses
 */
export const getVectorStoreStats = async () => {
    try {
        const response = await apiClient.get('/api/stats');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Check API health
 * @returns {Promise} Health status
 */
export const checkHealth = async () => {
    try {
        const response = await apiClient.get('/health');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default apiClient;

