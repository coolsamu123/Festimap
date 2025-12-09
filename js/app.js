// Festimap - European Music Festival Map
// Main application logic

class FestiMap {
    constructor() {
        this.map = null;
        this.festivals = [];
        this.markers = [];
        this.markerLayer = null;
        this.discoveredFestivals = [];

        this.init();
    }

    async init() {
        this.initMap();
        await this.loadFestivals();
        this.populateFilters();
        this.setupEventListeners();
        this.setupAIPanel();
        this.renderMarkers();
    }

    initMap() {
        // Initialize map centered on Europe
        this.map = L.map('map', {
            center: [50.0, 10.0],
            zoom: 4,
            minZoom: 3,
            maxZoom: 18
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Initialize marker layer group
        this.markerLayer = L.layerGroup().addTo(this.map);
    }

    async loadFestivals() {
        try {
            const response = await fetch('data/festivals.json');
            const data = await response.json();
            this.festivals = data.festivals;
        } catch (error) {
            console.error('Error loading festivals:', error);
            this.festivals = [];
        }
    }

    populateFilters() {
        // Get unique genres and countries
        const genres = [...new Set(this.festivals.map(f => f.genre))].sort();
        const countries = [...new Set(this.festivals.map(f => f.country))].sort();

        // Populate genre filter
        const genreFilter = document.getElementById('genre-filter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        // Populate country filter
        const countryFilter = document.getElementById('country-filter');
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        // Filter event listeners
        document.getElementById('month-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('genre-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('country-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('search').addEventListener('input', () => this.filterFestivals());
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
    }

    getFestivalMonth(festival) {
        // Get the month from the start date (1-12)
        const startDate = new Date(festival.dates.start);
        return startDate.getMonth() + 1;
    }

    festivalInMonth(festival, month) {
        // Check if festival runs during a specific month
        const startDate = new Date(festival.dates.start);
        const endDate = new Date(festival.dates.end);

        // Get months (1-12)
        const startMonth = startDate.getMonth() + 1;
        const endMonth = endDate.getMonth() + 1;

        // Festival spans this month if month is between start and end months
        return month >= startMonth && month <= endMonth;
    }

    getFilteredFestivals() {
        const monthFilter = document.getElementById('month-filter').value;
        const genreFilter = document.getElementById('genre-filter').value;
        const countryFilter = document.getElementById('country-filter').value;
        const searchTerm = document.getElementById('search').value.toLowerCase();

        return this.festivals.filter(festival => {
            const matchesMonth = monthFilter === 'all' || this.festivalInMonth(festival, parseInt(monthFilter));
            const matchesGenre = genreFilter === 'all' || festival.genre === genreFilter;
            const matchesCountry = countryFilter === 'all' || festival.country === countryFilter;
            const matchesSearch = searchTerm === '' ||
                festival.name.toLowerCase().includes(searchTerm) ||
                festival.city.toLowerCase().includes(searchTerm) ||
                festival.description.toLowerCase().includes(searchTerm);

            return matchesMonth && matchesGenre && matchesCountry && matchesSearch;
        });
    }

    filterFestivals() {
        this.renderMarkers();
    }

    resetFilters() {
        document.getElementById('month-filter').value = 'all';
        document.getElementById('genre-filter').value = 'all';
        document.getElementById('country-filter').value = 'all';
        document.getElementById('search').value = '';
        this.renderMarkers();
    }

    getMarkerColor(genre) {
        const genreLower = genre.toLowerCase();
        if (genreLower.includes('electronic') || genreLower.includes('edm')) {
            return '#00d2ff';
        } else if (genreLower.includes('metal') || genreLower.includes('hard rock')) {
            return '#414345';
        } else if (genreLower.includes('rock') && !genreLower.includes('metal')) {
            return '#f12711';
        } else if (genreLower.includes('indie') || genreLower.includes('alternative')) {
            return '#11998e';
        } else {
            return '#667eea'; // Multi-genre / default
        }
    }

    createCustomIcon(festival) {
        const color = this.getMarkerColor(festival.genre);

        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 30px;
                height: 30px;
                background: ${color};
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            ">🎵</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });
    }

    formatDate(dateString) {
        const options = { month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    createPopupContent(festival) {
        const startDate = this.formatDate(festival.dates.start);
        const endDate = this.formatDate(festival.dates.end);
        const year = new Date(festival.dates.start).getFullYear();

        return `
            <div class="festival-popup">
                <h3>${festival.name}</h3>
                <div class="location">
                    📍 ${festival.city}, ${festival.country}
                </div>
                <div>
                    <span class="dates">📅 ${startDate} - ${endDate}, ${year}</span>
                    <span class="genre">🎸 ${festival.genre}</span>
                </div>
                <p class="description">${festival.description}</p>
                <a href="${festival.website}" target="_blank" rel="noopener noreferrer" class="website-link">
                    🌐 Visit Website
                </a>
            </div>
        `;
    }

    renderMarkers() {
        // Clear existing markers
        this.markerLayer.clearLayers();
        this.markers = [];

        // Get filtered festivals
        const filteredFestivals = this.getFilteredFestivals();

        // Create markers for each festival
        filteredFestivals.forEach(festival => {
            const marker = L.marker(
                [festival.coordinates.lat, festival.coordinates.lng],
                { icon: this.createCustomIcon(festival) }
            );

            // Add popup with festival info
            marker.bindPopup(this.createPopupContent(festival), {
                maxWidth: 320,
                className: 'festival-popup-container'
            });

            // Add to marker layer
            marker.addTo(this.markerLayer);
            this.markers.push(marker);
        });

        // Update festival count
        document.getElementById('festival-count').textContent = `${filteredFestivals.length} festival${filteredFestivals.length !== 1 ? 's' : ''}`;

        // Fit map to markers if there are any
        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // AI Discovery Panel Methods
    setupAIPanel() {
        // Panel toggle
        const panelToggle = document.getElementById('ai-panel-toggle');
        const panel = document.querySelector('.ai-panel');

        panelToggle.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });

        // API key visibility toggle
        const toggleKeyBtn = document.getElementById('toggle-key-visibility');
        const apiKeyInput = document.getElementById('gemini-api-key');

        toggleKeyBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleKeyBtn.textContent = '🙈';
            } else {
                apiKeyInput.type = 'password';
                toggleKeyBtn.textContent = '👁️';
            }
        });

        // Load saved API key from localStorage
        const savedKey = localStorage.getItem('gemini-api-key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }

        // Save API key when changed
        apiKeyInput.addEventListener('change', () => {
            localStorage.setItem('gemini-api-key', apiKeyInput.value);
        });

        // Discover button
        const discoverBtn = document.getElementById('discover-btn');
        discoverBtn.addEventListener('click', () => this.discoverFestivals());
    }

    getExistingFestivalNames() {
        return this.festivals.map(f => f.name.toLowerCase());
    }

    async discoverFestivals() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const country = document.getElementById('discover-country').value;
        const statusEl = document.getElementById('ai-status');
        const resultsEl = document.getElementById('discovered-festivals');
        const discoverBtn = document.getElementById('discover-btn');

        // Validation
        if (!apiKey) {
            this.showStatus('error', 'Please enter your Gemini API key');
            return;
        }

        if (!country) {
            this.showStatus('error', 'Please select a country');
            return;
        }

        // Get existing festival names to exclude
        const existingNames = this.getExistingFestivalNames();

        // Show loading state
        discoverBtn.disabled = true;
        discoverBtn.innerHTML = '<span class="loading-spinner"></span> Searching...';
        this.showStatus('loading', `Searching for festivals in ${country}...`);
        resultsEl.innerHTML = '';

        try {
            const festivals = await this.callGeminiAPI(apiKey, country, existingNames);

            if (festivals.length === 0) {
                this.showStatus('success', `No new festivals found in ${country}. Try another country!`);
            } else {
                this.showStatus('success', `Found ${festivals.length} new festival${festivals.length > 1 ? 's' : ''} in ${country}!`);
                this.displayDiscoveredFestivals(festivals);
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            this.showStatus('error', `Error: ${error.message}`);
        } finally {
            discoverBtn.disabled = false;
            discoverBtn.innerHTML = '🔍 Discover New Festivals';
        }
    }

    async callGeminiAPI(apiKey, country, existingNames) {
        const existingList = existingNames.slice(0, 50).join(', ');

        const prompt = `You are a music festival expert. Find 5 real music festivals in ${country} that are NOT in this list: [${existingList}].

For each festival, provide ACCURATE information in this exact JSON format:
{
  "festivals": [
    {
      "name": "Festival Name",
      "city": "City Name",
      "lat": 00.0000,
      "lng": 00.0000,
      "startDate": "2025-MM-DD",
      "endDate": "2025-MM-DD",
      "genre": "Genre/Style",
      "website": "https://...",
      "description": "Brief description (1-2 sentences)"
    }
  ]
}

IMPORTANT:
- Only include REAL festivals that actually exist
- Use accurate GPS coordinates for the festival location
- Use realistic 2025 dates based on when the festival typically occurs
- Genre examples: Electronic/EDM, Rock/Metal, Indie/Alternative, Multi-genre, Jazz/Soul, Hip-Hop/R&B
- Keep descriptions concise and informative
- Return ONLY valid JSON, no other text`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini');
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());
        const festivals = parsed.festivals || [];

        // Filter out any that might still match existing ones
        return festivals.filter(f =>
            !existingNames.includes(f.name.toLowerCase())
        );
    }

    showStatus(type, message) {
        const statusEl = document.getElementById('ai-status');
        statusEl.className = `ai-status ${type}`;
        statusEl.innerHTML = type === 'loading'
            ? `<span class="loading-spinner"></span> ${message}`
            : message;
    }

    displayDiscoveredFestivals(festivals) {
        const resultsEl = document.getElementById('discovered-festivals');
        this.discoveredFestivals = festivals;

        resultsEl.innerHTML = festivals.map((festival, index) => `
            <div class="discovered-festival-card" data-index="${index}">
                <div class="discovered-festival-info">
                    <h4>${festival.name}</h4>
                    <p>${festival.description}</p>
                    <div class="festival-meta">
                        <span>📍 ${festival.city}</span>
                        <span>📅 ${festival.startDate} - ${festival.endDate}</span>
                        <span>🎸 ${festival.genre}</span>
                    </div>
                </div>
                <button class="btn btn-add-festival" onclick="window.festimap.addDiscoveredFestival(${index})">
                    ➕ Add to Map
                </button>
            </div>
        `).join('');
    }

    addDiscoveredFestival(index) {
        const festival = this.discoveredFestivals[index];
        if (!festival) return;

        // Create festival object in the app's format
        const newFestival = {
            id: this.festivals.length + 1,
            name: festival.name,
            coordinates: {
                lat: festival.lat,
                lng: festival.lng
            },
            dates: {
                start: festival.startDate,
                end: festival.endDate
            },
            genre: festival.genre,
            website: festival.website,
            description: festival.description,
            country: document.getElementById('discover-country').value,
            city: festival.city
        };

        // Add to festivals array
        this.festivals.push(newFestival);

        // Update filters
        this.updateFiltersAfterAdd(newFestival);

        // Re-render markers
        this.renderMarkers();

        // Update button state
        const btn = document.querySelector(`.discovered-festival-card[data-index="${index}"] .btn-add-festival`);
        if (btn) {
            btn.classList.add('added');
            btn.textContent = '✓ Added';
            btn.onclick = null;
        }

        // Pan to new festival
        this.map.setView([newFestival.coordinates.lat, newFestival.coordinates.lng], 8);
    }

    updateFiltersAfterAdd(festival) {
        // Add genre if new
        const genreFilter = document.getElementById('genre-filter');
        const existingGenres = Array.from(genreFilter.options).map(o => o.value);
        if (!existingGenres.includes(festival.genre)) {
            const option = document.createElement('option');
            option.value = festival.genre;
            option.textContent = festival.genre;
            genreFilter.appendChild(option);
        }

        // Add country if new
        const countryFilter = document.getElementById('country-filter');
        const existingCountries = Array.from(countryFilter.options).map(o => o.value);
        if (!existingCountries.includes(festival.country)) {
            const option = document.createElement('option');
            option.value = festival.country;
            option.textContent = festival.country;
            countryFilter.appendChild(option);
        }
    }
}

// Initialize the app when DOM is ready
let festimap;
document.addEventListener('DOMContentLoaded', () => {
    festimap = new FestiMap();
    window.festimap = festimap;
});
