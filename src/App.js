import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Oval } from 'react-loader-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import './App.css';

function Grp204WeatherApp() {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]); // Autocomplete suggestions
    const [weather, setWeather] = useState({
        loading: false,
        data: {},
        error: false,
    });
    const [forecast, setForecast] = useState([]);
    const [hourlyForecast, setHourlyForecast] = useState([]);
    const [airQuality, setAirQuality] = useState(null);
    const [airQualityLoading, setAirQualityLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [units, setUnits] = useState('metric'); // 'metric' or 'imperial'
    const [favorites, setFavorites] = useState([]); // Array of favorite cities

    // Load favorites from localStorage on initial render
    useEffect(() => {
        const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
        setFavorites(savedFavorites);
    }, []);

    // Save favorites to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    // Fetch user's location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error fetching location:", error);
                    alert("Please enable location access or enter a city manually.");
                }
            );
        } else {
            console.error("Geolocation is not supported by this browser.");
            alert("Geolocation is not supported. Please enter a city manually.");
        }
    }, []);

    // Fetch weather, forecast, and air quality data
    const fetchWeatherData = async (city, userLocation) => {
        const url = 'https://api.openweathermap.org/data/2.5/weather';
        const forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
        const airQualityUrl = 'https://api.openweathermap.org/data/2.5/air_pollution';
        const api_key = '72e8421e3e2473a6b1fe11fc99a5ea1c'; // Replace with your OpenWeatherMap API key

        try {
            setWeather({ ...weather, loading: true, error: false });

            const [res, forecastRes] = await Promise.all([
                axios.get(url, {
                    params: {
                        q: city,
                        units,
                        appid: api_key,
                    },
                }),
                axios.get(forecastUrl, {
                    params: {
                        q: city,
                        units,
                        appid: api_key,
                    },
                }),
            ]);

            // Set current weather
            setWeather({ data: res.data, loading: false, error: false });

            // Calculate 24-hour forecast starting from the current hour
            const now = new Date();
            const hourlyData = forecastRes.data.list.filter((item) => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate >= now;
            }).slice(0, 8); // Next 24 hours (3-hour intervals)

            setHourlyForecast(hourlyData);

            // Set 10-day forecast
            const dailyData = forecastRes.data.list.filter((item, index) => index % 8 === 0).slice(0, 10); // One entry per day
            setForecast(dailyData);

            // Fetch air quality data only if userLocation is available
            if (userLocation) {
                setAirQualityLoading(true);
                try {
                    const airQualityRes = await axios.get(airQualityUrl, {
                        params: {
                            lat: userLocation.lat,
                            lon: userLocation.lon,
                            appid: api_key,
                        },
                    });
                    setAirQuality(airQualityRes.data.list[0]);
                } catch (error) {
                    console.error("Air Quality API Error:", error.response?.data?.message || error.message);
                    setAirQuality(null); // Reset air quality data on error
                } finally {
                    setAirQualityLoading(false);
                }
            }
        } catch (error) {
            console.error("API Error:", error.response?.data?.message || error.message);
            setWeather({ ...weather, data: {}, error: true });
        }
    };

    // Fetch autocomplete suggestions
    const fetchSuggestions = async (query) => {
        if (query.trim()) {
            const api_key = '72e8421e3e2473a6b1fe11fc99a5ea1c'; // Replace with your OpenWeatherMap API key
            const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${api_key}`;

            try {
                const response = await axios.get(url);
                setSuggestions(response.data);
            } catch (error) {
                console.error("Autocomplete API Error:", error.response?.data?.message || error.message);
                setSuggestions([]); // Reset suggestions on error
            }
        } else {
            setSuggestions([]); // Clear suggestions if the query is empty
        }
    };

    // Handle input change for autocomplete
    const handleInputChange = (event) => {
        const value = event.target.value;
        setInput(value);
        fetchSuggestions(value);
    };

    // Handle suggestion selection
    const handleSuggestionClick = (city) => {
        setInput(`${city.name}, ${city.country}`);
        setSuggestions([]); // Clear suggestions
        fetchWeatherData(city.name, userLocation); // Fetch weather data for the selected city
    };

    // Handle search on Enter key press
    const search = async (event) => {
        if (event.key === 'Enter' && input.trim()) {
            event.preventDefault();
            await fetchWeatherData(input, userLocation);
            setInput('');
        }
    };

    // Toggle units
    const toggleUnits = () => {
        setUnits(units === 'metric' ? 'imperial' : 'metric');
    };

    // Add city to favorites
    const addToFavorites = () => {
        if (weather.data.name && !favorites.includes(weather.data.name)) {
            setFavorites([...favorites, weather.data.name]);
        }
    };

    // Remove city from favorites
    const removeFromFavorites = (city) => {
        setFavorites(favorites.filter((fav) => fav !== city));
    };

    // Animation for weather info
    const weatherAnimation = useSpring({
        opacity: weather.data ? 1 : 0,
        transform: weather.data ? 'translateY(0)' : 'translateY(20px)',
    });

    // Format time for sunrise and sunset
    const formatTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className="App"
            style={{
                backgroundImage: `url('/back.jpeg')`, // Background image from public folder
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                padding: '10px', // Reduced padding
            }}
        >
            <div className="search-bar">
                <input
                    type="text"
                    className="city-search"
                    placeholder="Enter city name..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyPress={search}
                />
                <button onClick={toggleUnits} aria-label="Toggle Units">
                    {units === 'metric' ? '°C' : '°F'}
                </button>
                <button onClick={addToFavorites} aria-label="Add to Favorites">
                    ⭐
                </button>
            </div>

            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
                <ul className="autocomplete-suggestions">
                    {suggestions.map((city, index) => (
                        <li key={index} onClick={() => handleSuggestionClick(city)}>
                            {city.name}, {city.country}
                        </li>
                    ))}
                </ul>
            )}

            {/* Loading Skeletons */}
            {weather.loading && (
                <div className="loading-skeleton">
                    <div className="skeleton-header"></div>
                    <div className="skeleton-temperature"></div>
                    <div className="skeleton-condition"></div>
                    <div className="skeleton-description"></div>
                    <div className="skeleton-hourly">
                        {[...Array(8)].map((_, index) => (
                            <div key={index} className="skeleton-hourly-card"></div>
                        ))}
                    </div>
                    <div className="skeleton-forecast">
                        {[...Array(10)].map((_, index) => (
                            <div key={index} className="skeleton-forecast-row"></div>
                        ))}
                    </div>
                </div>
            )}

            {/* Display Favorites */}
            <div className="favorites">
                <h2>Favorites</h2>
                <ul>
                    {favorites.map((city, index) => (
                        <li key={index}>
                            <span onClick={() => fetchWeatherData(city, userLocation)}>{city}</span>
                            <button onClick={() => removeFromFavorites(city)}>🗑️</button>
                        </li>
                    ))}
                </ul>
            </div>

            {weather.error && (
                <div className="error-message">
                    <span>City not found. Please check the city name and try again.</span>
                </div>
            )}

            <AnimatePresence>
                {weather && weather.data && weather.data.main && (
                    <motion.div
                        className="weather-info"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1>{weather.data.name}</h1>
                        <animated.p className="temperature" style={weatherAnimation}>
                            {Math.round(weather.data.main.temp)}°{units === 'metric' ? 'C' : 'F'}
                        </animated.p>
                        <p className="condition">{weather.data.weather[0].main}</p>
                        <p className="description">
                            {weather.data.weather[0].description}. Wind gusts are up to {weather.data.wind.speed} {units === 'metric' ? 'km/h' : 'mph'}.
                        </p>

                        {/* Sunrise and Sunset Times */}
                        <div className="sun-times">
                            <p>🌅 Sunrise: {formatTime(weather.data.sys.sunrise)}</p>
                            <p>🌇 Sunset: {formatTime(weather.data.sys.sunset)}</p>
                        </div>

                        {/* Air Quality */}
                        {airQuality && (
                            <div className="air-quality">
                                <h2>Air Quality</h2>
                                <p>AQI: {airQuality.main.aqi}</p>
                                <p>PM2.5: {airQuality.components.pm2_5} µg/m³</p>
                            </div>
                        )}

                        {/* Hourly Forecast */}
                        <div className="hourly-forecast">
                            <h2>24-Hour Forecast</h2>
                            <div className="hourly-cards">
                                {hourlyForecast.map((hour, index) => (
                                    <motion.div
                                        key={index}
                                        className="hourly-card"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <p>{new Date(hour.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <img
                                            src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png`}
                                            alt={hour.weather[0].description}
                                        />
                                        <p>{Math.round(hour.main.temp)}°{units === 'metric' ? 'C' : 'F'}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* 10-Day Forecast */}
                        <div className="ten-day-forecast">
                            <h2>10-Day Forecast</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Day</th>
                                        <th>Low</th>
                                        <th>High</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecast.map((day, index) => (
                                        <tr key={index}>
                                            <td>{new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                                            <td>{Math.round(day.main.temp_min)}°{units === 'metric' ? 'C' : 'F'}</td>
                                            <td>{Math.round(day.main.temp_max)}°{units === 'metric' ? 'C' : 'F'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Grp204WeatherApp;