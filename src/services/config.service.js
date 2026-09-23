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

class ConfigService {
    constructor() {
        this.configurations = null;
        this.guides = null;
        this.lastFetched = null;
    }

    /**
     * Fetch all configurations from the API
     * Caches the result to avoid repeated API calls
     */
    async getConfigurations(forceRefresh = false) {
        // Return cached data if available and not forcing refresh
        if (this.configurations && !forceRefresh && this.lastFetched) {
            const timeSinceLastFetch = Date.now() - this.lastFetched;
            // Cache for 5 minutes
            if (timeSinceLastFetch < 5 * 60 * 1000) {
                return this.configurations;
            }
        }

        try {
            const response = await api.get('/config');

            if (response.data.success) {
                this.configurations = response.data.data;
                this.lastFetched = Date.now();
                return this.configurations;
            } else {
                throw new Error('Failed to fetch configurations');
            }
        } catch (error) {
            console.error('Error fetching configurations:', error);
            throw error;
        }
    }

    /**
     * Fetch all guides from the API
     * Caches the result to avoid repeated API calls
     */
    async getGuides(forceRefresh = false) {
        // Return cached data if available and not forcing refresh
        if (this.guides && !forceRefresh) {
            return this.guides;
        }

        try {
            const response = await api.get('/guides');

            if (response.data.success) {
                this.guides = response.data.data;
                return this.guides;
            } else {
                throw new Error('Failed to fetch guides');
            }
        } catch (error) {
            console.error('Error fetching guides:', error);
            throw error;
        }
    }

    /**
     * Get specific configuration category
     */
    async getConfigCategory(category) {
        const configs = await this.getConfigurations();
        return configs[category] || {};
    }

    /**
     * Get group types options
     */
    async getGroupTypes() {
        const configs = await this.getConfigurations();
        return configs.group_types?.available_options || [];
    }

    /**
     * Get group status options
     */
    async getGroupStatus() {
        const configs = await this.getConfigurations();
        const options = configs.group_status?.available_options || [];
        return options.filter(opt => opt.isActive !== false);
    }

    /**
     * Get language options
     */
    async getLanguages() {
        const configs = await this.getConfigurations();
        return configs.languages?.available_options || [];
    }

    /**
     * Get pricing configuration
     */
    async getPricing() {
        const configs = await this.getConfigurations();
        return {
            basePrices: configs.pricing?.base_prices || {},
            discountRules: configs.pricing?.discount_rules || {}
        };
    }

    /**
     * Get tour settings
     */
    async getTourSettings() {
        const configs = await this.getConfigurations();
        return configs.tour_settings?.default_values || {};
    }

    /**
     * Get payment status options
     */
    async getPaymentStatus() {
        const configs = await this.getConfigurations();
        return configs.payment_status?.available_options || [];
    }

    /**
     * Get booking source options
     */
    async getBookingSources() {
        const configs = await this.getConfigurations();
        return configs.booking_sources?.available_options || [];
    }

    /**
     * Get info message type options
     */
    async getInfoMessageTypes() {
        const configs = await this.getConfigurations();
        return configs.info_message_types?.available_options || [];
    }

    /**
     * Get creator name options
     */
    async getCreatorNames() {
        const configs = await this.getConfigurations();
        return configs.creator_names?.available_options || [];
    }

    /**
     * Get email automation settings (reminder timing, post-tour timing, review link)
     */
    async getEmailAutomation() {
        const configs = await this.getConfigurations();
        return configs.email_automation || {};
    }

    /**
     * Update a single config value (editable categories only — coordinator)
     */
    async updateConfigValue(category, key, value) {
        const response = await api.put(`/config/${category}/${key}`, { value });
        this.configurations = null; // invalidate cache so next read is fresh
        return response.data;
    }

    /**
     * Clear cache - useful for forcing fresh data
     */
    clearCache() {
        this.configurations = null;
        this.guides = null;
        this.lastFetched = null;
    }

    /**
     * Initialize - fetch all data on app startup
     */
    async initialize() {
        try {
            await Promise.all([
                this.getConfigurations(),
                this.getGuides()
            ]);
            console.log('📋 Configuration service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize configuration service:', error);
            throw error;
        }
    }
}

// Export a singleton instance
const configService = new ConfigService();
export default configService;
