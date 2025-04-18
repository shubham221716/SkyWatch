const API_KEY = '6505e442a3b739c6dafaf507873a5c74'; // Replace with your OpenWeather API key
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Display recent searches on page load
document.addEventListener('DOMContentLoaded', () => {
  updateRecentSearchesDisplay();
});

async function getCoordinates(city) {
  const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`);
  const data = await res.json();
  if (data.length === 0) throw new Error("City not found");
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
}

function addToRecentSearches(city) {
  // Check if city already exists in recent searches
  if (!recentSearches.some(item => item.toLowerCase() === city.toLowerCase())) {
    recentSearches.unshift(city);
    // Keep only the last 5 searches
    if (recentSearches.length > 5) {
      recentSearches.pop();
    }
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    updateRecentSearchesDisplay();
  }
}

function updateRecentSearchesDisplay() {
  const recentSearchesList = document.getElementById('recentSearches');
  recentSearchesList.innerHTML = '';
  
  if (recentSearches.length === 0) {
    recentSearchesList.innerHTML = '<li>No recent searches</li>';
    return;
  }
  
  recentSearches.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      document.getElementById('city').value = city;
      getCurrentWeather();
    });
    recentSearchesList.appendChild(li);
  });
}

async function getCurrentWeather() {
  const city = document.getElementById('city').value;
  if (!city) {
    alert('Please enter a city name');
    return;
  }
  
  const result = document.getElementById('result');
  result.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading current weather...</div>';
  
  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);
    
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    const data = await res.json();
    const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    
    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${lat}&lon=${lon}&zoom=10`;
    
    const localTime = new Date((data.dt + data.timezone) * 1000).toUTCString().replace('GMT', 'Local Time');
    
    result.innerHTML = `
      <div class="weather-display">
        <img src="${icon}" alt="Weather Icon" class="weather-icon">
        <h2>${name}, ${country}</h2>
        <p class="local-time">${localTime}</p>
        <p class="temperature">${Math.round(data.main.temp)}°C</p>
        <p class="weather-description">${data.weather[0].description}</p>
        
        <div class="weather-info">
          <p><i class="fas fa-temperature-low"></i> <strong>Feels Like:</strong> ${Math.round(data.main.feels_like)}°C</p>
          <p><i class="fas fa-tint"></i> <strong>Humidity:</strong> ${data.main.humidity}%</p>
          <p><i class="fas fa-wind"></i> <strong>Wind:</strong> ${data.wind.speed} m/s</p>
          <p><i class="fas fa-compress-alt"></i> <strong>Pressure:</strong> ${data.main.pressure} hPa</p>
          <p><i class="fas fa-eye"></i> <strong>Visibility:</strong> ${data.visibility / 1000} km</p>
          <p><i class="fas fa-cloud"></i> <strong>Cloudiness:</strong> ${data.clouds.all}%</p>
        </div>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

async function getForecast() {
  const city = document.getElementById('city').value;
  if (!city) {
    alert('Please enter a city name');
    return;
  }
  
  const result = document.getElementById('result');
  result.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading forecast...</div>';
  
  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);
    
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    const data = await res.json();
    
    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=clouds&lat=${lat}&lon=${lon}&zoom=10`;
    
    // Group forecasts by day
    const dailyForecasts = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = [];
      }
      dailyForecasts[date].push(item);
    });
    
    let forecastHtml = `
      <h2>5-Day Forecast for ${name}, ${country}</h2>
      <div class="forecast-container">
    `;
    
    Object.entries(dailyForecasts).slice(0, 5).forEach(([date, forecasts]) => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = new Date(date).toLocaleDateString();
      
      forecastHtml += `
        <div class="forecast-day">
          <h3>${dayName} (${dateStr})</h3>
          <div class="forecast-items">
      `;
      
      forecasts.forEach(forecast => {
        const time = new Date(forecast.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`;
        
        forecastHtml += `
          <div class="forecast-item">
            <span class="forecast-time">${time}</span>
            <img src="${icon}" alt="${forecast.weather[0].description}">
            <span class="forecast-temp">${Math.round(forecast.main.temp)}°C</span>
            <span class="forecast-desc">${forecast.weather[0].description}</span>
          </div>
        `;
      });
      
      forecastHtml += `
          </div>
        </div>
      `;
    });
    
    forecastHtml += `</div>`;
    result.innerHTML = forecastHtml;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

async function getAirPollution() {
  const city = document.getElementById('city').value;
  if (!city) {
    alert('Please enter a city name');
    return;
  }
  
  const result = document.getElementById('result');
  result.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading air quality...</div>';
  
  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);
    
    const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const data = await res.json();
    const air = data.list[0].components;
    const aqi = data.list[0].main.aqi;
    
    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=precipitation&lat=${lat}&lon=${lon}&zoom=10`;
    
    // AQI description
    const aqiLevels = [
      "Good",
      "Fair",
      "Moderate",
      "Poor",
      "Very Poor"
    ];
    const aqiDescription = aqiLevels[aqi - 1] || "Unknown";
    
    result.innerHTML = `
      <div class="air-quality-display">
        <h2>Air Quality in ${name}, ${country}</h2>
        <div class="aqi-level" data-aqi="${aqi}">
          <h3>Air Quality Index: ${aqi} (${aqiDescription})</h3>
        </div>
        
        <div class="pollutants-grid">
          <div class="pollutant">
            <h4>PM2.5</h4>
            <p>${air.pm2_5} µg/m³</p>
            <p class="pollutant-desc">Fine particulate matter</p>
          </div>
          <div class="pollutant">
            <h4>PM10</h4>
            <p>${air.pm10} µg/m³</p>
            <p class="pollutant-desc">Coarse particulate matter</p>
          </div>
          <div class="pollutant">
            <h4>O₃</h4>
            <p>${air.o3} µg/m³</p>
            <p class="pollutant-desc">Ozone</p>
          </div>
          <div class="pollutant">
            <h4>NO₂</h4>
            <p>${air.no2} µg/m³</p>
            <p class="pollutant-desc">Nitrogen dioxide</p>
          </div>
          <div class="pollutant">
            <h4>SO₂</h4>
            <p>${air.so2} µg/m³</p>
            <p class="pollutant-desc">Sulfur dioxide</p>
          </div>
          <div class="pollutant">
            <h4>CO</h4>
            <p>${air.co} µg/m³</p>
            <p class="pollutant-desc">Carbon monoxide</p>
          </div>
        </div>
        
        <div class="health-recommendations">
          <h3>Health Recommendations:</h3>
          ${getHealthRecommendations(aqi)}
        </div>
      </div>
    `;
    
    // Add AQI specific styling
    const aqiElement = document.querySelector('.aqi-level');
    const aqiColors = ['#00e400', '#ffff00', '#ff7e00', '#ff0000', '#8f3f97'];
    aqiElement.style.backgroundColor = aqiColors[aqi - 1] || '#cccccc';
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

function getHealthRecommendations(aqi) {
  const recommendations = [
    {
      level: 1,
      message: "Air quality is satisfactory. Enjoy your normal outdoor activities."
    },
    {
      level: 2,
      message: "Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion."
    },
    {
      level: 3,
      message: "Children, active adults, and people with respiratory disease should reduce prolonged outdoor exertion."
    },
    {
      level: 4,
      message: "Everyone may begin to experience health effects. Active children and adults, and people with respiratory disease should avoid prolonged outdoor exertion."
    },
    {
      level: 5,
      message: "Health warnings of emergency conditions. Everyone should avoid all outdoor exertion."
    }
  ];
  
  return `<p>${recommendations[aqi - 1]?.message || 'No specific recommendations available.'}</p>`;
}

async function getGeoLocation() {
  const city = document.getElementById('city').value;
  if (!city) {
    alert('Please enter a city name');
    return;
  }
  
  const result = document.getElementById('result');
  result.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading coordinates...</div>';
  
  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);
    
    document.getElementById('weatherMap').src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-1}%2C${lat-1}%2C${lon+1}%2C${lat+1}&layer=mapnik&marker=${lat}%2C${lon}`;
    
    result.innerHTML = `
      <div class="coordinates-display">
        <h2>Geographic Coordinates of ${name}, ${country}</h2>
        <div class="coordinate-item">
          <i class="fas fa-globe-americas"></i>
          <p><strong>Latitude:</strong> ${lat.toFixed(4)}°</p>
        </div>
        <div class="coordinate-item">
          <i class="fas fa-globe-americas"></i>
          <p><strong>Longitude:</strong> ${lon.toFixed(4)}°</p>
        </div>
        <div class="map-links">
          <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" class="map-link">
            <i class="fas fa-map-marked-alt"></i> Open in Google Maps
          </a>
          <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}" target="_blank" class="map-link">
            <i class="fas fa-map"></i> Open in OpenStreetMap
          </a>
        </div>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

// Add these new functions to your existing JavaScript

// Theme Toggle Functionality
const themeToggle = document.getElementById('theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    localStorage.setItem('theme', 'light');
  }
}

// Check for saved theme or prefered scheme
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
  setTheme(true);
}

themeToggle.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('dark-mode'));
});

// Scroll to Top Button
const scrollToTopButton = document.getElementById('scrollToTop');

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    scrollToTopButton.style.display = 'flex';
  } else {
    scrollToTopButton.style.display = 'none';
  }
});

scrollToTopButton.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// Recent Weather in Pictures
async function displayRecentWeather() {
  if (recentSearches.length === 0) return;

  const recentWeatherGrid = document.getElementById('recentWeatherGrid');
  recentWeatherGrid.innerHTML = '';

  // Only show the last 4 recent searches for this display
  const recentCities = recentSearches.slice(0, 4);

  for (const city of recentCities) {
    try {
      const { lat, lon, name } = await getCoordinates(city);
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
      const data = await res.json();
      const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;

      const card = document.createElement('div');
      card.className = 'recent-weather-card';
      card.innerHTML = `
        <img src="${icon}" alt="${data.weather[0].description}">
        <h4>${name}</h4>
        <p>${Math.round(data.main.temp)}°C</p>
        <p>${data.weather[0].main}</p>
      `;
      card.addEventListener('click', () => {
        document.getElementById('city').value = name;
        getCurrentWeather();
      });
      recentWeatherGrid.appendChild(card);
    } catch (err) {
      console.error(`Couldn't fetch weather for ${city}:`, err);
    }
  }
}



// Update the addToRecentSearches function to refresh the display
function addToRecentSearches(city) {
  if (!recentSearches.some(item => item.toLowerCase() === city.toLowerCase())) {
    recentSearches.unshift(city);
    if (recentSearches.length > 5) {
      recentSearches.pop();
    }
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    updateRecentSearchesDisplay();
    displayRecentWeather();
  }
}

  
  // Helper function to search a city
  function searchCity(cityName) {
    document.getElementById('city').value = cityName;
    getCurrentWeather();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Fix recent searches functionality
  async function displayRecentWeather() {
    if (recentSearches.length === 0) {
      document.getElementById('recentWeatherGrid').innerHTML = '<p>No recent searches yet</p>';
      return;
    }
  
    const recentWeatherGrid = document.getElementById('recentWeatherGrid');
    recentWeatherGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading recent weather...</div>';
  
    try {
      let cardsHTML = '';
      // Only show the last 4 recent searches for this display
      const recentCities = recentSearches.slice(0, 4);
  
      for (const city of recentCities) {
        try {
          const { lat, lon, name } = await getCoordinates(city);
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
          const data = await res.json();
          const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  
          cardsHTML += `
            <div class="recent-weather-card" onclick="searchCity('${name}')">
              <h4>${name}</h4>
              <img src="${icon}" alt="${data.weather[0].description}">
              <div class="recent-temp">${Math.round(data.main.temp)}°C</div>
              <p>${data.weather[0].main}</p>
              <div class="recent-details">
                <span><i class="fas fa-tint"></i> ${data.main.humidity}%</span>
                <span><i class="fas fa-wind"></i> ${data.wind.speed} m/s</span>
              </div>
            </div>
          `;
        } catch (err) {
          console.error(`Couldn't fetch weather for ${city}:`, err);
        }
      }
  
      recentWeatherGrid.innerHTML = cardsHTML || '<p>Could not load recent weather</p>';
    } catch (err) {
      recentWeatherGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load recent weather</div>`;
    }
  }
  
  // Update the addToRecentSearches function
  function addToRecentSearches(city) {
    // Remove if already exists to avoid duplicates
    recentSearches = recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning of array
    recentSearches.unshift(city);
    
    // Keep only the last 5 searches
    if (recentSearches.length > 5) {
      recentSearches.pop();
    }
    
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    displayRecentWeather();
  }

  // Mobile Navigation Toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

mobileMenuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  
  // Change icon based on menu state
  const icon = mobileMenuToggle.querySelector('i');
  if (navLinks.classList.contains('active')) {
    icon.classList.remove('fa-bars');
    icon.classList.add('fa-times');
  } else {
    icon.classList.remove('fa-times');
    icon.classList.add('fa-bars');
  }
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 992) {
      navLinks.classList.remove('active');
      const icon = mobileMenuToggle.querySelector('i');
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  });
});

// Make navbar sticky only on larger screens
function handleNavbarSticky() {
  const navbar = document.querySelector('.navbar');
  if (window.innerWidth > 992) {
    navbar.style.position = 'sticky';
  } else {
    navbar.style.position = 'relative';
  }
}

window.addEventListener('resize', handleNavbarSticky);
window.addEventListener('load', handleNavbarSticky);

// Add this JavaScript to your script.js file

// Dynamic Weather Canvas
function initWeatherCanvas() {
  const canvas = document.getElementById('weatherCanvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Weather particles
  const particles = [];
  const particleCount = window.innerWidth / 5;
  
  // Particle constructor
  function Particle() {
    this.type = Math.random() > 0.5 ? 'circle' : 'rect';
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speed = Math.random() * 2 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.wind = Math.random() * 0.2 - 0.1;
  }
  
  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    particles.forEach(p => {
      p.y += p.speed;
      p.x += p.wind;
      
      // Reset if out of bounds
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
      if (p.x > canvas.width) p.x = 0;
      if (p.x < 0) p.x = canvas.width;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      
      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  // Handle resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Dynamic Weather Icon
function updateWeatherIcon() {
  const icons = {
    sunny: `<circle cx="50" cy="50" r="40" fill="#FFD700"/>
            <g class="sun-rays">
              <line x1="50" y1="10" x2="50" y2="30" stroke="#FFD700" stroke-width="4"/>
              <line x1="10" y1="50" x2="30" y2="50" stroke="#FFD700" stroke-width="4"/>
              <line x1="50" y1="90" x2="50" y2="70" stroke="#FFD700" stroke-width="4"/>
              <line x1="90" y1="50" x2="70" y2="50" stroke="#FFD700" stroke-width="4"/>
              <line x1="25" y1="25" x2="40" y2="40" stroke="#FFD700" stroke-width="4"/>
              <line x1="75" y1="25" x2="60" y2="40" stroke="#FFD700" stroke-width="4"/>
              <line x1="25" y1="75" x2="40" y2="60" stroke="#FFD700" stroke-width="4"/>
              <line x1="75" y1="75" x2="60" y2="60" stroke="#FFD700" stroke-width="4"/>
            </g>`,
    cloudy: `<circle cx="50" cy="50" r="40" fill="#D3D3D3"/>
             <circle cx="30" cy="40" r="25" fill="#A9A9A9"/>
             <circle cx="70" cy="40" r="30" fill="#A9A9A9"/>
             <circle cx="50" cy="60" r="20" fill="#C0C0C0"/>`,
    rainy: `<circle cx="50" cy="50" r="40" fill="#A9A9A9"/>
            <path d="M30,50 Q50,30 70,50" stroke="#4682B4" stroke-width="2" fill="none"/>
            <path d="M30,60 Q50,40 70,60" stroke="#4682B4" stroke-width="2" fill="none"/>
            <path d="M30,70 Q50,50 70,70" stroke="#4682B4" stroke-width="2" fill="none"/>
            <line x1="40" y1="80" x2="40" y2="90" stroke="#4682B4" stroke-width="2"/>
            <line x1="50" y1="75" x2="50" y2="85" stroke="#4682B4" stroke-width="2"/>
            <line x1="60" y1="85" x2="60" y2="95" stroke="#4682B4" stroke-width="2"/>`
  };
  
  const weatherTypes = Object.keys(icons);
  const currentWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  
  document.querySelector('.weather-svg').innerHTML = icons[currentWeather];
  
  // Animate sun rays if sunny
  if (currentWeather === 'sunny') {
    const rays = document.querySelectorAll('.sun-rays line');
    rays.forEach((ray, i) => {
      ray.style.animation = `pulse-ray ${0.5 + i*0.1}s infinite alternate`;
    });
  }
}

// Initialize Live Weather Ticker
function initLiveTicker() {
  const cities = [
    { name: 'London', temp: '18°C', icon: 'cloud-rain' },
    { name: 'Tokyo', temp: '25°C', icon: 'cloud-sun' },
    { name: 'New York', temp: '22°C', icon: 'sun' },
    { name: 'Paris', temp: '20°C', icon: 'cloud' },
    { name: 'Sydney', temp: '28°C', icon: 'sun' },
    { name: 'Dubai', temp: '35°C', icon: 'sun' },
    { name: 'Moscow', temp: '12°C', icon: 'snowflake' },
    { name: 'Rio', temp: '30°C', icon: 'sun' }
  ];
  
  const tickerContainer = document.querySelector('.ticker-container');
  
  // Duplicate items for seamless looping
  cities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'ticker-item';
    item.innerHTML = `
      <i class="fas fa-${city.icon}"></i>
      <span class="ticker-value">${city.temp}</span>
      <span class="ticker-location">${city.name}</span>
    `;
    tickerContainer.appendChild(item.cloneNode(true));
  });
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initWeatherCanvas();
  updateWeatherIcon();
  initLiveTicker();
  
  // Change weather icon every 10 seconds
  setInterval(updateWeatherIcon, 10000);
  
  // Add real metrics data here from API
});

