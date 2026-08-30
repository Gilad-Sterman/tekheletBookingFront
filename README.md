# Tekhelet Booking — Frontend

React frontend for the Tekhelet tour booking system. Built with Vite and connected to the Node.js/Express backend.

## Stack

- React 19
- Vite
- Redux
- React Router
- Axios
- FullCalendar
- SCSS

## Development

```bash
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:3030`.

## Build

```bash
npm run build
```

Production build is output to `../server/public` so the backend can serve it.

## Project Structure

- `src/components` — React components (Calendar, TourForm, Dashboard, etc.)
- `src/services` — API and config services
- `src/assets/styles` — SCSS, organized by component
- `src/context` — Auth context
- `src/hooks` — Custom hooks

## Notes

- No sensitive credentials are committed; auth tokens are stored in `localStorage`.
- Keep the backend (`../server`) running for API calls during local development.
