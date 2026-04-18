# Notiphy CRM Rebuild (React.js + PHP + MySQL)

This project is a modernized rebuild of your CRM with:

- React.js frontend (CDN runtime, no Node build required)
- path-based SPA routes (`/dashboard`, `/prospects`, `/notifications`)
- JSON API backend under `/api/*`
- MySQL-first data layer compatible with legacy tables (`crm_customers`, `crm_timeline`, `crm_notifications`, etc.)
- initial AI-ready manager digest endpoint for neglected high-potential leads

## Quick Start

1. Copy `.env.example` to `.env` and fill in DB values.
2. Point your web server document root to `public/` (or open `/react-crm/public/` if hosted inside an existing site folder).
3. Ensure URL rewriting is enabled (`public/.htaccess`).
4. Open the app in browser and log in.

## Current Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/lookups/prospect-filters`
- `GET /api/dashboard`
- `GET /api/prospects`
- `GET /api/prospects/report`
- `GET /api/prospects/{id}`
- `GET /api/notifications`
- `POST /api/ai/manager-digest`

## Notes

- If `crm_salesperson` is not present, demo login from `.env` is used.
- Salesperson access is scoped to own records unless user ID is listed in `MANAGER_IDS`.
- AI endpoint currently uses deterministic scoring and drafts; external LLM integration can be added next.

