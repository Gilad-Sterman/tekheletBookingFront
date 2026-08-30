import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, user } = useAuth();

    if (user) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            // Navigate back to the original URL (preserving tourId etc.)
            const redirect = searchParams.get('redirect') || '/';
            navigate(redirect, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <header>
                    <div className="logo-wrapper">
                        <img
                            src="https://res.cloudinary.com/dollaguij/image/upload/v1703232276/WhatsApp_Image_2023-12-21_at_17.15.46_tuubbf.jpg"
                            alt="Tekhelet Tours"
                        />
                    </div>
                    <h1>Tour Management</h1>
                    <p>Sign in to manage your tours</p>
                </header>

                <form onSubmit={handleSubmit}>
                    {error && <div className="error-container">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="form-group password-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit"
                    >
                        {loading ? 'Signing in...' : (
                            <>
                                Sign In <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
