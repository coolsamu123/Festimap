# Festimap

An interactive map of music festivals across Europe built with vanilla JavaScript and Leaflet.js.

## Features

- Interactive map displaying 20+ major European music festivals
- Clickable markers with detailed popup info cards
- Filter festivals by genre, country, or search by name
- Responsive design for desktop and mobile
- Color-coded markers by genre type

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Map**: Leaflet.js
- **Data**: JSON file (easily replaceable with a database)
- **Styling**: CSS3 with custom popup styles

## Getting Started

1. Clone the repository
2. Open `index.html` in a web browser, or serve with a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```

3. Navigate to `http://localhost:8000`

## Project Structure

```
Festimap/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Custom styles
├── js/
│   └── app.js          # Main application logic
├── data/
│   └── festivals.json  # Festival data
└── README.md
```

## Festival Data Format

Each festival in `data/festivals.json` has the following structure:

```json
{
  "id": 1,
  "name": "Festival Name",
  "coordinates": {
    "lat": 51.0864,
    "lng": 4.3779
  },
  "dates": {
    "start": "2025-07-18",
    "end": "2025-07-27"
  },
  "genre": "Electronic/EDM",
  "website": "https://example.com",
  "description": "Festival description...",
  "country": "Country",
  "city": "City"
}
```

## Adding New Festivals

To add a new festival, simply add a new object to the `festivals` array in `data/festivals.json` following the format above.

## Future Improvements

- Database integration (PostgreSQL/MongoDB)
- User authentication and favorites
- Festival submission form
- Calendar view
- Ticket links and pricing info
- Artist lineup information
