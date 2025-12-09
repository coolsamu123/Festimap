// Festimap - European Music Festival Map
// Main application logic

class FestiMap {
    constructor() {
        this.map = null;
        this.festivals = [];
        this.markers = [];
        this.markerLayer = null;

        this.init();
    }

    async init() {
        this.initMap();
        await this.loadFestivals();
        this.populateFilters();
        this.setupEventListeners();
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
        document.getElementById('genre-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('country-filter').addEventListener('change', () => this.filterFestivals());
        document.getElementById('search').addEventListener('input', () => this.filterFestivals());
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
    }

    getFilteredFestivals() {
        const genreFilter = document.getElementById('genre-filter').value;
        const countryFilter = document.getElementById('country-filter').value;
        const searchTerm = document.getElementById('search').value.toLowerCase();

        return this.festivals.filter(festival => {
            const matchesGenre = genreFilter === 'all' || festival.genre === genreFilter;
            const matchesCountry = countryFilter === 'all' || festival.country === countryFilter;
            const matchesSearch = searchTerm === '' ||
                festival.name.toLowerCase().includes(searchTerm) ||
                festival.city.toLowerCase().includes(searchTerm) ||
                festival.description.toLowerCase().includes(searchTerm);

            return matchesGenre && matchesCountry && matchesSearch;
        });
    }

    filterFestivals() {
        this.renderMarkers();
    }

    resetFilters() {
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
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FestiMap();
});
