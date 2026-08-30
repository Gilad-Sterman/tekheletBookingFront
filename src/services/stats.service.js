import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tour_app_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

class StatsService {
    constructor() {
        this.stats = null;
        this.lastFetched = null;
    }

    /**
     * Fetch all configurations from the API
     * Caches the result to avoid repeated API calls
     */
    async getStats(params = {}, forceRefresh = false) {
        // Return cached data if available and not forcing refresh
        // if (this.configurations && !forceRefresh && this.lastFetched) {
        //     const timeSinceLastFetch = Date.now() - this.lastFetched;
        //     // Cache for 5 minutes
        //     if (timeSinceLastFetch < 5 * 60 * 1000) {
        //         return this.configurations;
        //     }
        // }

        try {
            const response = await api.get('/dashboard/statistics', { params });

            if (response.status === 200) {
                this.stats = response.data;
                this.lastFetched = Date.now();
                return this.stats;
            } else {
                throw new Error('Failed to fetch statistics');
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
            throw error;
        }
    }

    /**
     * Clear cache - useful for forcing fresh data
     */
    clearCache() {
        this.stats = null;
        this.lastFetched = null;
    }

    /**
     * Initialize - fetch all data on app startup
     */
    async initialize() {
        try {
            await this.getStats({
                dateRange: '6months',
                tourType: 'all',
                groupType: 'all',
                guide: 'all',
                language: 'all'
            });
            console.log('📋 Statistics service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize statistics service:', error);
            throw error;
        }
    }
}

// Export a singleton instance
const statsService = new StatsService();
export default statsService;