# Pier Fishing Companion

A small fishing-planning app for Santa Barbara and Goleta pier trips. It uses NOAA CO-OPS tide predictions, adds National Weather Service forecast conditions, and ranks the classic "two hours before and after high tide" windows so you can spot the strongest options for the day faster.

## What it does

- Fetches official NOAA tide predictions through a tiny local Node server.
- Fetches NWS point forecast grid data for wind and marine wave height.
- Calculates sunrise and sunset locally for each pier location.
- Preloads the current day plus the next 6 days so you can compare a full week at a glance.
- Lets you click any day to inspect its best high-tide windows in detail.
- Suggests the most likely species mix for each window and each day.
- Lets you add a manual weekly local fishing report layer that can nudge the score, baitfish read, and method advice.
- Ranks windows using:
  - high-tide height relative to the rest of the day
  - the size of the swing from nearby low tides
  - forecast wind conditions
  - forecast wave height as a first-pass swell/surf proxy
  - overlap with sunrise or sunset
- Builds a first-pass species recommendation layer for mackerel, jacksmelt, surfperch, halibut, bat ray, and leopard shark.
- Draws a simple 30-minute tide curve for quick visual scanning.

## Run it

```bash
node server.js
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Deploy to Render

This repo includes a [render.yaml](/Users/randall/Documents/New project/render.yaml:1) Blueprint for Render.

### Option 1: Deploy from GitHub in the Render dashboard

1. Push this project to a GitHub repository.
2. In Render, choose `New` -> `Blueprint`.
3. Connect your GitHub account and select the repository.
4. Render will detect `render.yaml` and create the web service for you.

### Option 2: Manual web service setup

If you prefer to create the service manually in Render, use:

- Runtime: `Node`
- Build Command: `echo "No build step required"`
- Start Command: `node server.js`

The app is already set up to bind to `0.0.0.0` on Render and use Render's `PORT` environment variable.

## Create a GitHub repo

From the GitHub website:

1. Create a new empty repository, for example `pier-fishing-companion`.
2. Do not add a README, `.gitignore`, or license if you want to push this folder as-is.
3. Copy the repository URL and run:

```bash
git add .
git commit -m "Initial fishing companion app"
git remote add origin https://github.com/YOUR-USERNAME/pier-fishing-companion.git
git push -u origin main
```

If GitHub gives you an SSH URL instead, use that for `origin`.

## Data sources

This app is built around public NOAA and NWS services:

- API docs: https://api.tidesandcurrents.noaa.gov/api/uat/
- Products overview: https://tidesandcurrents.noaa.gov/products.html
- Santa Barbara station example: https://tidesandcurrents.noaa.gov/stationhome.html?id=9411340
- NWS API docs: https://www.weather.gov/documentation/services-web-api
- NOAA solar calculator reference: https://gml.noaa.gov/grad/solcalc/
- A manually curated local report file at `data/local-report.json`

## Weekly local report workflow

This app now supports a human-in-the-loop local fishing report layer.

Use this workflow each week:

1. Copy the Santa Barbara / Goleta-relevant parts of your subscribed fishing report into ChatGPT.
2. Use the saved prompt in `prompts/weekly-local-report-prompt.md`.
3. Replace the contents of `data/local-report.json` with the JSON ChatGPT returns.
4. Commit and push your changes so Render redeploys the site.

The app will then:

- show a `This Week's Local Read` card in the Selected day area
- apply a modest local score adjustment
- nudge the baitfish index
- surface method guidance like `cast sabiki`

The local report layer is intentionally small and transparent:

- `Base score` is still computed from tides, wind, swell proxy, light, and buoy data
- `Local adjustment` comes from `data/local-report.json`
- `Final score` is what shows in the app

This keeps the site useful as a planner without pretending the weekly report is an automated live feed.

## Notes

- The default tide station is `9411340` for Santa Barbara. Goleta Pier currently reuses that nearby tide station while applying Goleta-specific weather and sunrise/sunset coordinates.
- Wave height is coming from the NWS forecast grid as a practical first-pass swell/surf signal. A future refinement could use a more explicit nearshore swell model if you want a more fishing-specific surf read.
- The weekly local report file is meant to be your own distilled interpretation of a subscribed report, not a verbatim copy of paid content.
- Species guidance is heuristic for now. It is meant to help decide whether a family trip looks promising, not to guarantee what will bite.
- This version still has room to grow with species targets, moon phase, weather icons, safety thresholds, and personal trip constraints.
- Tide timing alone is a useful shortcut, but it is still a heuristic rather than a guarantee of fishing success.
