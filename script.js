/* ============================================
   SKYWATCH — JavaScript (Clean Rewrite)
   ============================================ */

const API_KEY = '6505e442a3b739c6dafaf507873a5c74';

// ========== STATE ==========
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
let favorites = JSON.parse(localStorage.getItem('skywatch_favorites')) || [];
let currentUnit = localStorage.getItem('skywatch_unit') || 'metric';
let lastSearchedCity = '';

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initSearch();
  initUnitToggle();
  initScrollToTop();
  initScrollReveal();
  initHeaderScroll();
  initWeatherCanvas();
  updateWeatherIcon();
  initLiveTicker();
  renderFavorites();
  displayRecentWeather();
  initNewsletter();

  // Rotate hero weather icon every 8 seconds
  setInterval(updateWeatherIcon, 8000);
});

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    error: 'fas fa-exclamation-circle',
    success: 'fas fa-check-circle',
    info: 'fas fa-info-circle'
  };

  toast.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// THEME TOGGLE
// ============================================
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const saved = localStorage.getItem('skywatch_theme');

  if (saved === 'dark' || (!saved && prefersDark.matches)) {
    applyTheme(true);
  }

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
  });
}

function applyTheme(isDark) {
  const toggle = document.getElementById('theme-toggle');
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    localStorage.setItem('skywatch_theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    toggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    localStorage.setItem('skywatch_theme', 'light');
  }
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = mobileToggle.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
  });

  // Close menu on link click (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        navLinks.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  });

  // Logo click
  document.getElementById('logoHome').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============================================
// HEADER SCROLL EFFECT
// ============================================
function initHeaderScroll() {
  const header = document.getElementById('mainHeader');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function initSearch() {
  const heroInput = document.getElementById('heroCity');
  const cityInput = document.getElementById('city');
  const heroBtn = document.getElementById('heroSearchBtn');
  const searchBtn = document.getElementById('searchBtn');
  const locateBtn = document.getElementById('locateBtn');
  const locateBtnInline = document.getElementById('locateBtnInline');

  // Hero search → populate city input and trigger current weather
  heroBtn.addEventListener('click', () => {
    const val = heroInput.value.trim();
    if (val) {
      cityInput.value = val;
      getCurrentWeather();
      document.getElementById('weatherAppSection').scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast('Please enter a city name', 'error');
    }
  });

  // Enter key on hero
  heroInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      heroBtn.click();
    }
  });

  // Search button in main section
  searchBtn.addEventListener('click', () => {
    getCurrentWeather();
  });

  // Enter key on main input
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      getCurrentWeather();
    }
  });

  // Geolocation buttons
  locateBtn.addEventListener('click', geoLocateUser);
  locateBtnInline.addEventListener('click', geoLocateUser);
}

// ============================================
// GEOLOCATION
// ============================================
function geoLocateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  showToast('Detecting your location...', 'info');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`);
        const data = await res.json();

        if (data.length > 0) {
          const cityName = data[0].name;
          document.getElementById('city').value = cityName;
          document.getElementById('heroCity').value = cityName;
          getCurrentWeather();
          document.getElementById('weatherAppSection').scrollIntoView({ behavior: 'smooth' });
          showToast(`Located: ${cityName}`, 'success');
        } else {
          showToast('Could not determine your city', 'error');
        }
      } catch (err) {
        showToast('Failed to reverse geocode', 'error');
      }
    },
    () => {
      showToast('Location access denied. Please enable location permissions.', 'error');
    },
    { timeout: 10000 }
  );
}

// ============================================
// UNIT TOGGLE (°C / °F)
// ============================================
function initUnitToggle() {
  const toggle = document.getElementById('unitToggle');
  const buttons = toggle.querySelectorAll('.unit-btn');

  // Set initial state
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === currentUnit);
  });

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.unit === currentUnit) return;

      currentUnit = btn.dataset.unit;
      localStorage.setItem('skywatch_unit', currentUnit);

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Re-fetch if there was a search
      if (lastSearchedCity) {
        document.getElementById('city').value = lastSearchedCity;
        getCurrentWeather();
      }

      showToast(`Switched to ${currentUnit === 'metric' ? '°C' : '°F'}`, 'info');
    });
  });
}

function getUnitSymbol() {
  return currentUnit === 'metric' ? '°C' : '°F';
}

function getSpeedUnit() {
  return currentUnit === 'metric' ? 'm/s' : 'mph';
}

// ============================================
// API HELPERS
// ============================================
async function getCoordinates(city) {
  const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
  const data = await res.json();
  if (!data || data.length === 0) throw new Error('City not found. Please check the name and try again.');
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
}

function showSkeleton() {
  return `
    <div class="skeleton">
      <div class="skeleton-circle"></div>
      <div class="skeleton-line lg w-40"></div>
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-grid">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    </div>
  `;
}

// ============================================
// FAVORITES
// ============================================
function addFavorite(city) {
  if (favorites.some(f => f.toLowerCase() === city.toLowerCase())) {
    showToast(`${city} is already in favorites`, 'info');
    return;
  }
  favorites.unshift(city);
  if (favorites.length > 10) favorites.pop();
  localStorage.setItem('skywatch_favorites', JSON.stringify(favorites));
  renderFavorites();
  showToast(`${city} added to favorites!`, 'success');
}

function removeFavorite(city) {
  favorites = favorites.filter(f => f.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('skywatch_favorites', JSON.stringify(favorites));
  renderFavorites();
  showToast(`${city} removed from favorites`, 'info');
}

function isFavorite(city) {
  return favorites.some(f => f.toLowerCase() === city.toLowerCase());
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  if (favorites.length === 0) {
    grid.innerHTML = '<span class="no-favorites">No favorites yet. Search a city and ★ it!</span>';
    return;
  }

  grid.innerHTML = favorites.map(city => `
    <div class="favorite-chip" onclick="searchCity('${city.replace(/'/g, "\\'")}')">
      <i class="fas fa-star" style="color: var(--accent-warm); font-size: 0.8rem;"></i>
      ${city}
      <button class="remove-fav" onclick="event.stopPropagation(); removeFavorite('${city.replace(/'/g, "\\'")}')" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

// ============================================
// RECENT SEARCHES
// ============================================
function addToRecentSearches(city) {
  recentSearches = recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
  recentSearches.unshift(city);
  if (recentSearches.length > 5) recentSearches.pop();
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  displayRecentWeather();
}

function searchCity(cityName) {
  document.getElementById('city').value = cityName;
  getCurrentWeather();
  document.getElementById('weatherAppSection').scrollIntoView({ behavior: 'smooth' });
}

async function displayRecentWeather() {
  const grid = document.getElementById('recentWeatherGrid');
  const section = document.getElementById('recentSearchesSection');

  if (recentSearches.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading recent weather...</div>';

  let cardsHTML = '';
  const cities = recentSearches.slice(0, 4);

  for (const city of cities) {
    try {
      const { lat, lon, name } = await getCoordinates(city);
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
      const data = await res.json();
      const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

      cardsHTML += `
        <div class="recent-weather-card" onclick="searchCity('${name.replace(/'/g, "\\'")}')">
          <h4>${name}</h4>
          <img src="${icon}" alt="${data.weather[0].description}">
          <div class="recent-temp">${Math.round(data.main.temp)}${getUnitSymbol()}</div>
          <p>${data.weather[0].main}</p>
          <div class="recent-details">
            <span><i class="fas fa-droplet"></i> ${data.main.humidity}%</span>
            <span><i class="fas fa-wind"></i> ${data.wind.speed} ${getSpeedUnit()}</span>
          </div>
        </div>
      `;
    } catch (err) {
      console.warn(`Skipped ${city}:`, err.message);
    }
  }

  grid.innerHTML = cardsHTML || '<p style="color: var(--text-muted);">Could not load recent weather</p>';
}

// ============================================
// CURRENT WEATHER
// ============================================
async function getCurrentWeather() {
  const city = document.getElementById('city').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }

  lastSearchedCity = city;
  const result = document.getElementById('result');
  result.innerHTML = showSkeleton();

  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);

    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
    const data = await res.json();
    const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=${lat}&lon=${lon}&zoom=10`;

    const localTime = new Date((data.dt + data.timezone) * 1000).toUTCString().replace('GMT', 'Local Time');
    const sunrise = new Date((data.sys.sunrise + data.timezone) * 1000).toUTCString().match(/\d{2}:\d{2}/)?.[0] || '--:--';
    const sunset = new Date((data.sys.sunset + data.timezone) * 1000).toUTCString().match(/\d{2}:\d{2}/)?.[0] || '--:--';

    const favClass = isFavorite(name) ? 'fav-btn is-fav' : 'fav-btn';
    const favIcon = isFavorite(name) ? 'fas fa-star' : 'far fa-star';
    const favText = isFavorite(name) ? 'Favorited' : 'Add to Favorites';

    result.innerHTML = `
      <div class="weather-display">
        <img src="${icon}" alt="${data.weather[0].description}" class="weather-icon">
        <h2>${name}, ${country}</h2>
        <p class="local-time">${localTime}</p>
        <p class="temperature">${Math.round(data.main.temp)}${getUnitSymbol()}</p>
        <p class="weather-description">${data.weather[0].description}</p>

        <button class="${favClass}" onclick="toggleFavorite('${name.replace(/'/g, "\\'")}')">
          <i class="${favIcon}"></i> ${favText}
        </button>

        <div class="sun-times">
          <div class="sun-time-item">
            <i class="fas fa-sun sunrise-icon"></i>
            <div>
              <div class="sun-label">Sunrise</div>
              <div class="sun-value">${sunrise}</div>
            </div>
          </div>
          <div class="sun-time-item">
            <i class="fas fa-moon sunset-icon"></i>
            <div>
              <div class="sun-label">Sunset</div>
              <div class="sun-value">${sunset}</div>
            </div>
          </div>
        </div>

        <div class="weather-info">
          <p><i class="fas fa-temperature-low"></i> <strong>Feels Like:</strong> ${Math.round(data.main.feels_like)}${getUnitSymbol()}</p>
          <p><i class="fas fa-droplet"></i> <strong>Humidity:</strong> ${data.main.humidity}%</p>
          <p><i class="fas fa-wind"></i> <strong>Wind:</strong> ${data.wind.speed} ${getSpeedUnit()}</p>
          <p><i class="fas fa-gauge-high"></i> <strong>Pressure:</strong> ${data.main.pressure} hPa</p>
          <p><i class="fas fa-eye"></i> <strong>Visibility:</strong> ${(data.visibility / 1000).toFixed(1)} km</p>
          <p><i class="fas fa-cloud"></i> <strong>Cloudiness:</strong> ${data.clouds.all}%</p>
        </div>
      </div>
    `;

    // Update hero metrics
    updateHeroMetrics(data);

  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

function toggleFavorite(city) {
  if (isFavorite(city)) {
    removeFavorite(city);
  } else {
    addFavorite(city);
  }
  // Re-render the current weather to update the button
  if (lastSearchedCity) {
    getCurrentWeather();
  }
}

function updateHeroMetrics(data) {
  const metrics = document.getElementById('heroMetrics');
  if (!metrics) return;
  const cards = metrics.querySelectorAll('.metric-card');
  if (cards.length >= 4) {
    cards[0].querySelector('.metric-value').textContent = `${data.main.humidity}%`;
    cards[1].querySelector('.metric-value').textContent = `${data.wind.speed} ${getSpeedUnit()}`;
    cards[2].querySelector('.metric-value').textContent = data.main.pressure;
    cards[3].querySelector('.metric-value').textContent = `${(data.visibility / 1000).toFixed(0)} km`;
  }
}

// ============================================
// 5-DAY FORECAST
// ============================================
async function getForecast() {
  const city = document.getElementById('city').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }

  lastSearchedCity = city;
  const result = document.getElementById('result');
  result.innerHTML = showSkeleton();

  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);

    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
    const data = await res.json();

    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=clouds&lat=${lat}&lon=${lon}&zoom=10`;

    // Group by day
    const dailyForecasts = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dailyForecasts[date]) dailyForecasts[date] = [];
      dailyForecasts[date].push(item);
    });

    let html = `<div class="forecast-container"><h2>5-Day Forecast for ${name}, ${country}</h2>`;

    Object.entries(dailyForecasts).slice(0, 5).forEach(([date, forecasts]) => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      html += `
        <div class="forecast-day">
          <h3>${dayName}, ${dateStr}</h3>
          <div class="forecast-items">
      `;

      forecasts.forEach(f => {
        const time = new Date(f.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = `https://openweathermap.org/img/wn/${f.weather[0].icon}.png`;

        html += `
          <div class="forecast-item">
            <span class="forecast-time">${time}</span>
            <img src="${icon}" alt="${f.weather[0].description}">
            <span class="forecast-temp">${Math.round(f.main.temp)}${getUnitSymbol()}</span>
            <span class="forecast-desc">${f.weather[0].description}</span>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += `</div>`;
    result.innerHTML = html;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

// ============================================
// AIR QUALITY
// ============================================
async function getAirPollution() {
  const city = document.getElementById('city').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }

  lastSearchedCity = city;
  const result = document.getElementById('result');
  result.innerHTML = showSkeleton();

  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);

    const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const data = await res.json();
    const air = data.list[0].components;
    const aqi = data.list[0].main.aqi;

    document.getElementById('weatherMap').src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=precipitation&lat=${lat}&lon=${lon}&zoom=10`;

    const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiDescription = aqiLevels[aqi - 1] || 'Unknown';

    result.innerHTML = `
      <div class="air-quality-display" style="text-align: center;">
        <h2>Air Quality — ${name}, ${country}</h2>
        <div class="aqi-level" data-aqi="${aqi}" style="display: inline-flex; margin-bottom: 24px;">
          <h3 style="margin:0; font-size: 1rem;">AQI: ${aqi} — ${aqiDescription}</h3>
        </div>

        <div class="pollutants-grid">
          <div class="pollutant"><h4>PM2.5</h4><p>${air.pm2_5} µg/m³</p><p class="pollutant-desc">Fine particles</p></div>
          <div class="pollutant"><h4>PM10</h4><p>${air.pm10} µg/m³</p><p class="pollutant-desc">Coarse particles</p></div>
          <div class="pollutant"><h4>O₃</h4><p>${air.o3} µg/m³</p><p class="pollutant-desc">Ozone</p></div>
          <div class="pollutant"><h4>NO₂</h4><p>${air.no2} µg/m³</p><p class="pollutant-desc">Nitrogen dioxide</p></div>
          <div class="pollutant"><h4>SO₂</h4><p>${air.so2} µg/m³</p><p class="pollutant-desc">Sulfur dioxide</p></div>
          <div class="pollutant"><h4>CO</h4><p>${air.co} µg/m³</p><p class="pollutant-desc">Carbon monoxide</p></div>
        </div>

        <div class="health-recommendations">
          <h3><i class="fas fa-heart-pulse"></i> Health Recommendation</h3>
          ${getHealthRecommendations(aqi)}
        </div>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

function getHealthRecommendations(aqi) {
  const recs = [
    'Air quality is excellent. Enjoy outdoor activities freely!',
    'Air quality is acceptable. Sensitive individuals should consider limiting prolonged outdoor exertion.',
    'Children, elderly, and those with respiratory conditions should reduce prolonged outdoor activity.',
    'Everyone may experience health effects. Limit outdoor exertion, especially for sensitive groups.',
    'Health emergency — avoid all outdoor activity. Keep windows closed and use air purifiers.'
  ];
  return `<p>${recs[aqi - 1] || 'No recommendation available.'}</p>`;
}

// ============================================
// GEO COORDINATES
// ============================================
async function getGeoLocation() {
  const city = document.getElementById('city').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }

  lastSearchedCity = city;
  const result = document.getElementById('result');
  result.innerHTML = showSkeleton();

  try {
    const { lat, lon, name, country } = await getCoordinates(city);
    addToRecentSearches(name);

    document.getElementById('weatherMap').src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-1}%2C${lat-1}%2C${lon+1}%2C${lat+1}&layer=mapnik&marker=${lat}%2C${lon}`;

    result.innerHTML = `
      <div class="coordinates-display">
        <h2>Coordinates — ${name}, ${country}</h2>
        <div class="coordinate-item">
          <i class="fas fa-location-dot"></i>
          <p><strong>Latitude:</strong> ${lat.toFixed(4)}°</p>
        </div>
        <div class="coordinate-item">
          <i class="fas fa-location-dot"></i>
          <p><strong>Longitude:</strong> ${lon.toFixed(4)}°</p>
        </div>
        <div class="map-links">
          <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener" class="map-link">
            <i class="fas fa-map-marked-alt"></i> Google Maps
          </a>
          <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}" target="_blank" rel="noopener" class="map-link">
            <i class="fas fa-map"></i> OpenStreetMap
          </a>
        </div>
      </div>
    `;
  } catch (err) {
    result.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${err.message}</div>`;
  }
}

// ============================================
// SCROLL TO TOP
// ============================================
function initScrollToTop() {
  const btn = document.getElementById('scrollToTop');

  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============================================
// SCROLL REVEAL (Intersection Observer)
// ============================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============================================
// NEWSLETTER
// ============================================
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Thank you for subscribing!', 'success');
      form.reset();
    });
  }
}

// ============================================
// WEATHER CANVAS (Particles)
// ============================================
function initWeatherCanvas() {
  const canvas = document.getElementById('weatherCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }
  resize();

  const particles = [];
  const count = Math.min(Math.floor(window.innerWidth / 8), 150);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.4 + 0.05,
      wind: Math.random() * 0.3 - 0.15
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speed;
      p.x += p.wind;
      if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
      if (p.x > canvas.width) p.x = 0;
      if (p.x < 0) p.x = canvas.width;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  animate();
  window.addEventListener('resize', resize);
}

// ============================================
// DYNAMIC WEATHER ICON (SVG)
// ============================================
function updateWeatherIcon() {
  const svg = document.querySelector('.weather-svg');
  if (!svg) return;

  const icons = {
    sunny: `
      <circle cx="50" cy="50" r="18" fill="#FFD700" opacity="0.9">
        <animate attributeName="r" values="18;20;18" dur="3s" repeatCount="indefinite"/>
      </circle>
      <g opacity="0.7">
        <line x1="50" y1="15" x2="50" y2="25" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="75" x2="50" y2="85" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="15" y1="50" x2="25" y2="50" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="75" y1="50" x2="85" y2="50" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="25" y1="25" x2="32" y2="32" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="68" y1="68" x2="75" y2="75" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="75" y1="25" x2="68" y2="32" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <line x1="25" y1="75" x2="32" y2="68" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="30s" repeatCount="indefinite"/>
      </g>
    `,
    cloudy: `
      <circle cx="38" cy="50" r="18" fill="rgba(255,255,255,0.85)">
        <animate attributeName="cx" values="38;40;38" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="55" cy="45" r="22" fill="rgba(255,255,255,0.9)">
        <animate attributeName="cx" values="55;53;55" dur="5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="70" cy="52" r="16" fill="rgba(255,255,255,0.8)">
        <animate attributeName="cx" values="70;72;70" dur="3.5s" repeatCount="indefinite"/>
      </circle>
      <ellipse cx="54" cy="62" rx="30" ry="10" fill="rgba(255,255,255,0.7)"/>
    `,
    rainy: `
      <circle cx="40" cy="35" r="16" fill="rgba(200,210,230,0.85)"/>
      <circle cx="58" cy="30" r="20" fill="rgba(200,210,230,0.9)"/>
      <circle cx="72" cy="37" r="14" fill="rgba(200,210,230,0.8)"/>
      <ellipse cx="56" cy="47" rx="28" ry="8" fill="rgba(200,210,230,0.7)"/>
      <line x1="38" y1="58" x2="35" y2="72" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" opacity="0.7">
        <animate attributeName="y1" values="58;60;58" dur="1s" repeatCount="indefinite"/>
      </line>
      <line x1="50" y1="60" x2="47" y2="76" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" opacity="0.6">
        <animate attributeName="y1" values="60;63;60" dur="1.2s" repeatCount="indefinite"/>
      </line>
      <line x1="62" y1="56" x2="59" y2="70" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" opacity="0.7">
        <animate attributeName="y1" values="56;59;56" dur="0.9s" repeatCount="indefinite"/>
      </line>
      <line x1="74" y1="59" x2="71" y2="73" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" opacity="0.5">
        <animate attributeName="y1" values="59;62;59" dur="1.1s" repeatCount="indefinite"/>
      </line>
    `
  };

  const types = Object.keys(icons);
  const current = types[Math.floor(Math.random() * types.length)];
  svg.innerHTML = icons[current];
}

// ============================================
// LIVE WEATHER TICKER
// ============================================
function initLiveTicker() {
  const container = document.getElementById('tickerContainer');
  if (!container) return;

  const cities = [
    { name: 'London', temp: '18°C', icon: 'cloud-rain' },
    { name: 'Tokyo', temp: '25°C', icon: 'cloud-sun' },
    { name: 'New York', temp: '22°C', icon: 'sun' },
    { name: 'Paris', temp: '20°C', icon: 'cloud' },
    { name: 'Sydney', temp: '28°C', icon: 'sun' },
    { name: 'Dubai', temp: '38°C', icon: 'sun' },
    { name: 'Moscow', temp: '14°C', icon: 'snowflake' },
    { name: 'Mumbai', temp: '32°C', icon: 'cloud-bolt' },
    { name: 'Berlin', temp: '19°C', icon: 'cloud-sun' },
    { name: 'Seoul', temp: '23°C', icon: 'cloud' }
  ];

  // Create items (double for seamless loop)
  const allCities = [...cities, ...cities];
  container.innerHTML = '';
  allCities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'ticker-item';
    item.innerHTML = `
      <i class="fas fa-${city.icon}"></i>
      <span class="ticker-value">${city.temp}</span>
      <span class="ticker-location">${city.name}</span>
    `;
    container.appendChild(item);
  });
}
