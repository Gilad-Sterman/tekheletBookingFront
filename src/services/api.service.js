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

// Add a response interceptor to handle expired/invalid tokens globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = !!error.config?.headers?.['Authorization'];
        if (error.response?.status === 401 && hadToken) {
            localStorage.removeItem('tour_app_token');
            localStorage.removeItem('tour_app_user');
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export const tourService = {
    login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.token) {
            localStorage.setItem('tour_app_token', res.data.token);
            localStorage.setItem('tour_app_user', JSON.stringify(res.data.user));
        }
        return res.data;
    },
    logout: () => {
        localStorage.removeItem('tour_app_token');
        localStorage.removeItem('tour_app_user');
    },
    getTours: async () => {
        const res = await api.get('/tours');
        return res.data;
    },
    createTour: async (tour) => {
        const res = await api.post('/tours', tour);
        return res.data;
    },
    updateTour: async (id, tour) => {
        const res = await api.put(`/tours/${id}`, tour);
        return res.data;
    },
    deleteTour: async (id) => {
        const res = await api.delete(`/tours/${id}`);
        return res.data;
    },
    getUsers: async () => {
        const res = await api.get('/users');
        return res.data;
    },
    disconnectCalendar: async () => {
        const res = await api.post('/auth/disconnect');
        return res.data;
    },
    getMe: async () => {
        const res = await api.get('/auth/me');
        return res.data;
    },
    getInfoMessages: async () => {
        const res = await api.get('/info-messages');
        return res.data;
    },
    createInfoMessage: async (message) => {
        const res = await api.post('/info-messages', message);
        return res.data;
    },
    updateInfoMessage: async (id, message) => {
        const res = await api.put(`/info-messages/${id}`, message);
        return res.data;
    },
    deleteInfoMessage: async (id) => {
        const res = await api.delete(`/info-messages/${id}`);
        return res.data;
    }
};

export const mailService = {
    getStatus: async () => {
        const res = await api.get('/mail/status');
        return res.data;
    },
    disconnect: async () => {
        const res = await api.post('/mail/disconnect');
        return res.data;
    },
    sendTest: async () => {
        const res = await api.post('/mail/test', {});
        return res.data;
    },
    sweep: async () => {
        const res = await api.post('/mail/sweep');
        return res.data;
    },
    // Starts the OAuth flow — full-page redirect, not an API call
    getConnectUrl: () => '/api/auth/microsoft'
};

export default api;
