// Festimap - European Music Festival Map
// Main application logic

class FestiMap {
    constructor() {
        this.map = null;
        this.festivals = [];
        this.markers = [];
        this.markerLayer = null;
        this.discoveredFestivals = [];
        this.dateUpdates = [];
        this.isAdmin = false;
        // Admin password hash (SHA-256 of your password)
        // Default: "festimap2025" - Change this to your own password hash
        this.adminPasswordHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // "admin"

        this.init();
    }

    async init() {
        this.initMap();
        await this.loadFestivals();
        this.populateFilters();
        this.populateUpdateCountryFilter();
        this.setupEventListeners();
        this.setupAdminPanel();
        this.renderMarkers();
    }

    // Simple hash function for password
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    initMap() {
        this.map = L.map('map', {
            center: [50.0, 10.0],
            zoom: 4,
            minZoom: 3,
            maxZoom: 18
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

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
        const genres = [...new Set(this.festivals.map(f => f.genre))].sort();
        const countries = [...new Set(this.festivals.map(f => f.country))].sort();

        const genreFilter = document.getElementById('genre-filter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        const countryFilter = document.getElementById('country-filter');
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    }

    populateUpdateCountryFilter() {
        const countries = [...new Set(this.festivals.map(f => f.country))].sort();
        const updateCountryFilter = document.getElementById('update-country');

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            updateCountryFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('month-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('genre-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('country-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('search').addEventListener('input', () => this.filterFestivals());
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
    }

    // Admin Panel Setup
    setupAdminPanel() {
        const adminLoginBtn = document.getElementById('admin-login-btn');
        const adminModal = document.getElementById('admin-modal');
        const adminModalClose = document.getElementById('admin-modal-close');
        const adminLoginSubmit = document.getElementById('admin-login-submit');
        const adminPasswordInput = document.getElementById('admin-password');
        const adminLogoutBtn = document.getElementById('admin-logout-btn');

        // Show modal
        adminLoginBtn.addEventListener('click', () => {
            if (this.isAdmin) {
                // Already logged in, show panel
                document.getElementById('admin-panel').classList.remove('hidden');
            } else {
                adminModal.classList.remove('hidden');
                adminPasswordInput.focus();
            }
        });

        // Close modal
        adminModalClose.addEventListener('click', () => {
            adminModal.classList.add('hidden');
            adminPasswordInput.value = '';
            document.getElementById('admin-login-error').classList.add('hidden');
        });

        // Login submit
        adminLoginSubmit.addEventListener('click', () => this.handleAdminLogin());
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });

        // Logout
        adminLogoutBtn.addEventListener('click', () => this.handleAdminLogout());

        // Panel toggle
        document.getElementById('ai-panel-toggle').addEventListener('click', (e) => {
            if (e.target.id !== 'admin-logout-btn') {
                document.getElementById('admin-panel').classList.toggle('collapsed');
            }
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

        // Load saved API key
        const savedKey = localStorage.getItem('gemini-api-key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }

        apiKeyInput.addEventListener('change', () => {
            localStorage.setItem('gemini-api-key', apiKeyInput.value);
        });

        // Discover button
        document.getElementById('discover-btn').addEventListener('click', () => this.discoverFestivals());

        // Update dates button
        document.getElementById('update-dates-btn').addEventListener('click', () => this.searchDateUpdates());

        // Check if admin session exists
        if (sessionStorage.getItem('festimap-admin') === 'true') {
            this.isAdmin = true;
            this.showAdminPanel();
        }
    }

    async handleAdminLogin() {
        const password = document.getElementById('admin-password').value;
        const errorEl = document.getElementById('admin-login-error');

        if (!password) {
            errorEl.textContent = 'Please enter a password';
            errorEl.classList.remove('hidden');
            return;
        }

        const hash = await this.hashPassword(password);

        if (hash === this.adminPasswordHash) {
            this.isAdmin = true;
            sessionStorage.setItem('festimap-admin', 'true');
            document.getElementById('admin-modal').classList.add('hidden');
            document.getElementById('admin-password').value = '';
            errorEl.classList.add('hidden');
            this.showAdminPanel();
        } else {
            errorEl.textContent = 'Incorrect password';
            errorEl.classList.remove('hidden');
        }
    }

    handleAdminLogout() {
        this.isAdmin = false;
        sessionStorage.removeItem('festimap-admin');
        document.getElementById('admin-panel').classList.add('hidden');
        document.getElementById('admin-login-btn').textContent = '🔐 Admin';
    }

    showAdminPanel() {
        document.getElementById('admin-panel').classList.remove('hidden');
        document.getElementById('admin-login-btn').textContent = '🔓 Admin Panel';
    }

    getFestivalMonth(festival) {
        const startDate = new Date(festival.dates.start);
        return startDate.getMonth() + 1;
    }

    festivalInMonth(festival, month) {
        const startDate = new Date(festival.dates.start);
        const endDate = new Date(festival.dates.end);
        const startMonth = startDate.getMonth() + 1;
        const endMonth = endDate.getMonth() + 1;
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
            return '#667eea';
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
                <div class="location">📍 ${festival.city}, ${festival.country}</div>
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
        this.markerLayer.clearLayers();
        this.markers = [];
        const filteredFestivals = this.getFilteredFestivals();

        filteredFestivals.forEach(festival => {
            const marker = L.marker(
                [festival.coordinates.lat, festival.coordinates.lng],
                { icon: this.createCustomIcon(festival) }
            );
            marker.bindPopup(this.createPopupContent(festival), {
                maxWidth: 320,
                className: 'festival-popup-container'
            });
            marker.addTo(this.markerLayer);
            this.markers.push(marker);
        });

        document.getElementById('festival-count').textContent = `${filteredFestivals.length} festival${filteredFestivals.length !== 1 ? 's' : ''}`;

        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // AI Discovery Methods
    getExistingFestivalNames() {
        return this.festivals.map(f => f.name.toLowerCase());
    }

    async discoverFestivals() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const country = document.getElementById('discover-country').value;
        const resultsEl = document.getElementById('discovered-festivals');
        const discoverBtn = document.getElementById('discover-btn');

        if (!apiKey) {
            this.showStatus('error', 'Please enter your Gemini API key');
            return;
        }

        if (!country) {
            this.showStatus('error', 'Please select a country');
            return;
        }

        const existingNames = this.getExistingFestivalNames();
        const existingInCountry = this.festivals
            .filter(f => f.country === country)
            .map(f => f.name);

        discoverBtn.disabled = true;
        discoverBtn.innerHTML = '<span class="loading-spinner"></span> Searching...';
        this.showStatus('loading', `Searching for festivals in ${country}...`);
        resultsEl.innerHTML = '';

        try {
            const festivals = await this.callGeminiDiscoverAPI(apiKey, country, existingNames, existingInCountry);

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

    async callGeminiDiscoverAPI(apiKey, country, existingNames, existingInCountry) {
        const existingList = existingInCountry.join(', ') || 'none yet';

        // Improved prompt to find more obscure festivals
        const prompt = `You are a music festival expert with deep knowledge of ${country}'s festival scene.

I need you to find 5-7 REAL music festivals in ${country} that are NOT in this list: [${existingList}].

Search for:
1. Smaller regional festivals that might not be internationally famous
2. Genre-specific festivals (jazz, folk, world music, classical, reggae, ska, punk, hardcore, etc.)
3. City festivals and urban music events
4. Boutique/intimate festivals
5. New festivals that started in recent years
6. Traditional/cultural music festivals with international artists

Examples of the types I'm looking for: local jazz festivals, folk music gatherings, world music celebrations, boutique electronic events, punk/hardcore fests, reggae festivals, blues festivals, etc.

For ${country} specifically, think about:
- Major cities and their local festival scenes
- University towns with music events
- Coastal/mountain resort festivals
- Cultural heritage music events

Provide ACCURATE information in this exact JSON format:
{
  "festivals": [
    {
      "name": "Festival Name (exact official name)",
      "city": "City Name",
      "lat": 00.0000,
      "lng": 00.0000,
      "startDate": "2025-MM-DD",
      "endDate": "2025-MM-DD",
      "genre": "Genre/Style",
      "website": "https://official-website.com",
      "description": "Brief description including what makes it special (1-2 sentences)"
    }
  ]
}

CRITICAL REQUIREMENTS:
- ONLY include festivals that ACTUALLY EXIST and are currently active
- Use ACCURATE GPS coordinates (verify the location)
- Use 2025 dates based on the festival's typical schedule
- Provide the OFFICIAL website URL
- If you're not 100% sure a festival exists, DO NOT include it
- Genre examples: Jazz/Blues, Folk/Traditional, World Music, Electronic/Techno, Reggae/Ska, Punk/Hardcore, Classical, Multi-genre
- Return ONLY valid JSON, no markdown, no extra text`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3, // Lower temperature for more factual responses
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('No response from Gemini');

        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        const parsed = JSON.parse(jsonStr.trim());
        const festivals = parsed.festivals || [];

        return festivals.filter(f => !existingNames.includes(f.name.toLowerCase()));
    }

    // Date Update Methods
    async searchDateUpdates() {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        const country = document.getElementById('update-country').value;
        const resultsEl = document.getElementById('discovered-festivals');
        const updateBtn = document.getElementById('update-dates-btn');

        if (!apiKey) {
            this.showStatus('error', 'Please enter your Gemini API key');
            return;
        }

        if (!country) {
            this.showStatus('error', 'Please select a country');
            return;
        }

        // Get festivals to update
        let festivalsToCheck;
        if (country === 'all') {
            festivalsToCheck = this.festivals.slice(0, 20); // Limit to 20 for API
        } else {
            festivalsToCheck = this.festivals.filter(f => f.country === country);
        }

        if (festivalsToCheck.length === 0) {
            this.showStatus('error', 'No festivals found for this country');
            return;
        }

        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="loading-spinner"></span> Checking dates...';
        this.showStatus('loading', `Checking dates for ${festivalsToCheck.length} festivals...`);
        resultsEl.innerHTML = '';

        try {
            const updates = await this.callGeminiDateUpdateAPI(apiKey, festivalsToCheck);

            if (updates.length === 0) {
                this.showStatus('success', 'All festival dates appear to be up to date!');
            } else {
                this.showStatus('success', `Found ${updates.length} potential date update${updates.length > 1 ? 's' : ''}!`);
                this.displayDateUpdates(updates);
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            this.showStatus('error', `Error: ${error.message}`);
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = '📅 Search for Date Updates';
        }
    }

    async callGeminiDateUpdateAPI(apiKey, festivals) {
        const festivalList = festivals.map(f => ({
            name: f.name,
            currentStart: f.dates.start,
            currentEnd: f.dates.end
        }));

        const prompt = `You are a music festival expert. Check if these festivals have updated their 2025 dates.

Current festival data:
${JSON.stringify(festivalList, null, 2)}

For each festival, verify the 2025 dates. If a festival has different dates than shown, or if the dates shown are for a past year, provide the correct 2025 dates.

Return ONLY festivals that need date corrections in this JSON format:
{
  "updates": [
    {
      "name": "Festival Name (exact match)",
      "newStartDate": "2025-MM-DD",
      "newEndDate": "2025-MM-DD",
      "source": "Brief note about where this info comes from"
    }
  ]
}

IMPORTANT:
- Only include festivals where dates are CONFIRMED to be different
- If dates haven't been announced yet for 2025, DO NOT include
- Use exact festival names as provided
- Return empty updates array if no changes needed
- Return ONLY valid JSON`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
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

        if (!text) throw new Error('No response from Gemini');

        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        const parsed = JSON.parse(jsonStr.trim());

        // Match updates with original festivals
        const updates = (parsed.updates || []).map(update => {
            const original = festivals.find(f => f.name.toLowerCase() === update.name.toLowerCase());
            if (original) {
                return {
                    ...update,
                    festivalId: original.id,
                    oldStartDate: original.dates.start,
                    oldEndDate: original.dates.end
                };
            }
            return null;
        }).filter(Boolean);

        this.dateUpdates = updates;
        return updates;
    }

    displayDateUpdates(updates) {
        const resultsEl = document.getElementById('discovered-festivals');

        resultsEl.innerHTML = updates.map((update, index) => `
            <div class="date-update-card" data-index="${index}">
                <h4>${update.name}</h4>
                <div class="date-update-info">
                    <span class="date-old">Old: ${update.oldStartDate} to ${update.oldEndDate}</span>
                    <span class="date-new">New: ${update.newStartDate} to ${update.newEndDate}</span>
                </div>
                <small style="color: #a0a0a0;">${update.source || 'AI detected update'}</small>
                <button class="btn btn-apply-update" onclick="window.festimap.applyDateUpdate(${index})">
                    ✓ Apply Update
                </button>
            </div>
        `).join('');
    }

    applyDateUpdate(index) {
        const update = this.dateUpdates[index];
        if (!update) return;

        // Find and update the festival
        const festival = this.festivals.find(f => f.id === update.festivalId);
        if (festival) {
            festival.dates.start = update.newStartDate;
            festival.dates.end = update.newEndDate;

            // Re-render markers
            this.renderMarkers();

            // Update button state
            const btn = document.querySelector(`.date-update-card[data-index="${index}"] .btn-apply-update`);
            if (btn) {
                btn.classList.add('added');
                btn.textContent = '✓ Updated';
                btn.onclick = null;
            }
        }
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
                    ${festival.website ? `<a href="${festival.website}" target="_blank" style="color: #667eea; font-size: 0.8rem;">🔗 Website</a>` : ''}
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

        const newFestival = {
            id: this.festivals.length + 1,
            name: festival.name,
            coordinates: { lat: festival.lat, lng: festival.lng },
            dates: { start: festival.startDate, end: festival.endDate },
            genre: festival.genre,
            website: festival.website,
            description: festival.description,
            country: document.getElementById('discover-country').value,
            city: festival.city
        };

        this.festivals.push(newFestival);
        this.updateFiltersAfterAdd(newFestival);
        this.renderMarkers();

        const btn = document.querySelector(`.discovered-festival-card[data-index="${index}"] .btn-add-festival`);
        if (btn) {
            btn.classList.add('added');
            btn.textContent = '✓ Added';
            btn.onclick = null;
        }

        this.map.setView([newFestival.coordinates.lat, newFestival.coordinates.lng], 8);
    }

    updateFiltersAfterAdd(festival) {
        const genreFilter = document.getElementById('genre-filter');
        const existingGenres = Array.from(genreFilter.options).map(o => o.value);
        if (!existingGenres.includes(festival.genre)) {
            const option = document.createElement('option');
            option.value = festival.genre;
            option.textContent = festival.genre;
            genreFilter.appendChild(option);
        }

        const countryFilter = document.getElementById('country-filter');
        const existingCountries = Array.from(countryFilter.options).map(o => o.value);
        if (!existingCountries.includes(festival.country)) {
            const option = document.createElement('option');
            option.value = festival.country;
            option.textContent = festival.country;
            countryFilter.appendChild(option);
        }

        // Also update the admin country filter
        const updateCountryFilter = document.getElementById('update-country');
        const existingUpdateCountries = Array.from(updateCountryFilter.options).map(o => o.value);
        if (!existingUpdateCountries.includes(festival.country)) {
            const option = document.createElement('option');
            option.value = festival.country;
            option.textContent = festival.country;
            updateCountryFilter.appendChild(option);
        }
    }
}

// Initialize the app
let festimap;
document.addEventListener('DOMContentLoaded', () => {
    festimap = new FestiMap();
    window.festimap = festimap;
});
