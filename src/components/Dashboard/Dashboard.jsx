import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Link } from 'react-router-dom';
import { Calendar, Users, DollarSign, TrendingUp, MapPin, Award, Star, ShoppingBag, ArrowLeft } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import statsService from '../../services/stats.service';

// import './Dashboard.scss';

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('6months');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({
        tourType: 'all',
        groupType: 'all',
        guide: 'all',
        language: 'all'
    });

    // Color palette for charts
    const COLORS = {
        primary: '#134869',
        secondary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
        purple: '#8b5cf6',
        pink: '#ec4899'
    };

    const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.info, COLORS.purple, COLORS.pink, COLORS.error];

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange, selectedMonth, selectedFilters]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const params = { ...selectedFilters };
            if (selectedMonth) {
                params.specificMonth = selectedMonth;
            } else {
                params.dateRange = dateRange;
            }
            
            const data = await statsService.getStats(params);
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => (
        <div className={`stat-card stat-card--${color}`}>
            <div className="stat-card__header">
                <div className="stat-card__icon">
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={`stat-card__trend ${trend > 0 ? 'positive' : 'negative'}`}>
                        <TrendingUp size={16} />
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div className="stat-card__content">
                <h3 className="stat-card__value">{value}</h3>
                <p className="stat-card__title">{title}</p>
                {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
            </div>
        </div>
    );

    const ChartCard = ({ title, children, className = '' }) => (
        <div className={`chart-card ${className}`}>
            <div className="chart-card__header">
                <h3 className="chart-card__title">{title}</h3>
            </div>
            <div className="chart-card__content">
                {children}
            </div>
        </div>
    );

    const FilterBar = () => (
        <div className="filter-bar">
            <div className={`filter-group${selectedMonth ? ' filter-group--dimmed' : ''}`}>
                <label>Date Range</label>
                <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value)}
                    className="filter-select"
                    disabled={!!selectedMonth}
                >
                    <option value="1month">Last Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="1year">Last Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div className="filter-group">
                <label>Specific Month</label>
                <div className="filter-month-picker">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="filter-input--month"
                    />
                    {selectedMonth && (
                        <button
                            className="filter-clear-btn"
                            onClick={() => setSelectedMonth('')}
                            title="Clear month filter"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
            
            <div className="filter-group">
                <label>Tour Type</label>
                <select 
                    value={selectedFilters.tourType} 
                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, tourType: e.target.value }))}
                    className="filter-select"
                >
                    <option value="all">All Tours</option>
                    <option value="regular">Regular Tours</option>
                    <option value="workshop">Workshops</option>
                    <option value="shiur">Shiurim</option>
                </select>
            </div>

            <div className="filter-group">
                <label>Language</label>
                <select 
                    value={selectedFilters.language} 
                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, language: e.target.value }))}
                    className="filter-select"
                >
                    <option value="all">All Languages</option>
                    <option value="English">English</option>
                    <option value="Hebrew">Hebrew</option>
                </select>
            </div>
        </div>
    );

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <Link to="/" className="btn-back flex-center">
                    <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back to Calendar
                </Link>
                <h1>Dashboard</h1>
                <p>Tour booking statistics and insights</p>
            </div>

            <FilterBar />

            {loading && !dashboardData ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading dashboard data...</p>
                </div>
            ) : !dashboardData ? (
                <div className="error-message">
                    <p>Failed to load dashboard data. Please try again.</p>
                    <button onClick={fetchDashboardData} className="retry-button">Retry</button>
                </div>
            ) : (
                <div className={`dashboard__content-wrapper ${loading ? 'loading-overlay' : ''}`}>
                    {/* Overview Cards */}
                    <div className="dashboard__section">
                        <div className="stats-grid">
                            <StatCard
                                title="Total Tours"
                                value={dashboardData.overview?.totalTours || 0}
                                subtitle={`${dashboardData.overview?.completedTours || 0} completed`}
                                icon={Calendar}
                                trend={dashboardData.overview?.toursTrend}
                                color="primary"
                            />
                            <StatCard
                                title="Total Groups"
                                value={dashboardData.overview?.totalGroups || 0}
                                subtitle={`${dashboardData.overview?.confirmedGroups || 0} confirmed`}
                                icon={Users}
                                trend={dashboardData.overview?.groupsTrend}
                                color="secondary"
                            />
                            <StatCard
                                title="Total Participants"
                                value={dashboardData.overview?.totalParticipants || 0}
                                subtitle={`Avg: ${dashboardData.overview?.avgParticipantsPerTour || 0} per tour`}
                                icon={Users}
                                trend={dashboardData.overview?.participantsTrend}
                                color="success"
                            />
                            <StatCard
                                title="Total Revenue"
                                value={`₪${(dashboardData.overview?.totalRevenue || 0).toLocaleString()}`}
                                subtitle={`Avg: ₪${dashboardData.overview?.avgRevenuePerTour || 0} per tour`}
                                icon={DollarSign}
                                trend={dashboardData.overview?.revenueTrend}
                                color="warning"
                            />
                        </div>
                    </div>

                    {/* Time-based Analytics */}
                    <div className="dashboard__section">
                        <ChartCard title="Tours Over Time" className="chart-card--large">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={dashboardData.timeData || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    <Area 
                                        type="monotone" 
                                        dataKey="tours" 
                                        stackId="1" 
                                        stroke={COLORS.primary} 
                                        fill={COLORS.primary}
                                        fillOpacity={0.6}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="participants" 
                                        stackId="2" 
                                        stroke={COLORS.secondary} 
                                        fill={COLORS.secondary}
                                        fillOpacity={0.6}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Group Analytics */}
                    <div className="dashboard__section">
                        <div className="charts-row">
                            <ChartCard title="Group Types Distribution">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.groupTypes || []}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {(dashboardData.groupTypes || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Geographic Distribution">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={dashboardData.geography || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="country" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    </div>

                    {/* Financial Dashboard */}
                    <div className="dashboard__section">
                        <div className="charts-row">
                            <ChartCard title="Payment Status">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.financial?.paymentStatus || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {(dashboardData.financial?.paymentStatus || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Revenue Breakdown">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={dashboardData.financial?.revenueBreakdown || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="category" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(value) => [`₪${value.toLocaleString()}`, 'Amount']} />
                                        <Bar dataKey="amount" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    </div>

                    {/* Engagement Metrics */}
                    <div className="dashboard__section">
                        <div className="charts-row">
                            <ChartCard title="Store & Engagement">
                                <div className="engagement-metrics">
                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <ShoppingBag size={20} />
                                            <span>Store Visits</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.storeVisitRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.storeVisitRate || 0}%</span>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <Award size={20} />
                                            <span>Tekhelet Items</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.tekheletPurchaseRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.tekheletPurchaseRate || 0}%</span>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <ShoppingBag size={20} />
                                            <span>Other Items</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.otherPurchaseRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.otherPurchaseRate || 0}%</span>
                                    </div>
                                </div>
                            </ChartCard>

                            <ChartCard title="Follow-up Success">
                                <div className="engagement-metrics">
                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <Star size={20} />
                                            <span>Reviews Received</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.reviewCompletionRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.reviewCompletionRate || 0}%</span>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <MapPin size={20} />
                                            <span>Newsletter Opt-in</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.newsletterOptinRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.newsletterOptinRate || 0}%</span>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-header">
                                            <Users size={20} />
                                            <span>Ambassadors</span>
                                        </div>
                                        <div className="metric-bar">
                                            <div 
                                                className="metric-fill" 
                                                style={{ width: `${dashboardData.engagement?.ambassadorRate || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="metric-value">{dashboardData.engagement?.ambassadorRate || 0}%</span>
                                    </div>
                                </div>
                            </ChartCard>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
