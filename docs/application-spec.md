# Pier Fishing Companion Specification

## Purpose

Pier Fishing Companion is a lightweight web application for planning family fishing trips at Santa Barbara Harbor / Stearns Wharf and Goleta Pier.

Its job is not to predict catch certainty. Its job is to compare upcoming fishing windows and answer three practical questions:

1. Is this a relatively favorable day to go for this pier?
2. When is the best window to go?
3. What species, bait, and trip style are most likely to fit the conditions?

The score should be interpreted as a **local relative recommendation index** for the current 7-day outlook at the selected pier.

## Product Goals

- Make week-ahead fishing planning easier for a family.
- Prefer clear, visual guidance over raw forecast data.
- Combine public forecast data with local weekly knowledge.
- Keep recommendations cautious and realistic.
- Surface local context that tide-only tools miss.

## Non-Goals

- Guarantee catches.
- Replace real-time bait presence or live fishing reports.
- Provide exact surf safety guidance.
- Model every species or every Southern California pier.

## Current Supported Spots

- `santa_barbara`
  - Display label: `Santa Barbara Harbor / City Pier`
  - Local interpretation includes Stearns Wharf behavior
  - NOAA tide station: `9411340`

- `goleta`
  - Display label: `Goleta Pier`
  - NOAA tide station currently reuses nearby Santa Barbara station `9411340`
  - Weather, light timing, and scoring logic are Goleta-specific

## Core User Stories

- As a parent planning ahead, I want to compare the next 7 days quickly.
- As a visual learner, I want to understand daylight overlap and the best window at a glance.
- As a casual angler, I want to know whether this is a baitfish trip, a mixed session, or a low-expectation scouting day.
- As a local user, I want to incorporate weekly fishing reports that can temper the forecast.
- As a practical trip planner, I want species and bait suggestions without having to choose a target species first.

## Key Concepts

### 1. Recommendation Window

Each recommendation window is a 4-hour block centered on a high tide:

- starts 2 hours before high tide
- ends 2 hours after high tide

### 2. Local Relative Recommendation Index

The displayed score is a 0-100 index, but it is **not** an absolute success probability.

It represents how favorable a window or day looks **relative to the other options in the same 7-day outlook for the same pier**.

Interpretation target:

- `20s-30s`: weak week / low-expectation windows
- `40s-50s`: usable or modestly favorable local options
- `60s-70s`: strong-for-this-week local setups
- `75+`: rare standout local setups

### 3. Local Weekly Report

A manually curated weekly report in `data/local-report.json` can:

- modestly nudge the final displayed score
- influence baitfish expectations
- influence trip-method advice
- provide local explanation text

It must not dominate the entire ranking model.

## Data Sources

### Required Upstream Sources

- NOAA CO-OPS tide predictions
  - high / low predictions
  - 30-minute tide curve
- National Weather Service API
  - forecast wind speed
  - forecast wind direction
  - forecast wave height
- NOAA solar calculations
  - sunrise
  - sunset
- NOAA NDBC buoy context
  - water temperature
  - swell period
  - swell direction context

### Local Human Input

- `data/local-report.json`
  - curated weekly local interpretation
  - derived from the user's subscribed regional report and personal judgment

## Functional Requirements

### Weekly Outlook

The app must:

- load the selected start date plus the next 6 days
- display one day card per day
- show the selected pier name
- show the best-looking day for the current week
- let the user click any day card to inspect details

Each day card should show:

- date
- local index score
- local rank label such as `Best of 7 this week`
- trip-type chip
- baitfish-status chip
- best window
- second high tide
- sunrise and sunset

### Selected Day Detail

The selected day view must show:

- top recommendation window
- alternative recommendation windows
- best bait guidance
- likely species
- local report card when active
- recommendation timeline showing daylight overlap
- explanation facts for the top windows

### Daily Conditions Panel

The daily conditions panel must summarize:

- average wind
- tide movement
- water stability
- tide phase
- water temperature
- swell period
- sunrise
- NOAA tide station
- likely species today
- baitfish index
- trip type

### Tide Curve

The app must show a 30-minute tide curve for the selected day.

### References

The app must display a References section listing the data sources currently used by the application.

When new external inputs are added, this section must also be updated.

## Recommendation Engine

### High-Level Model

The recommendation engine should use two stages:

### Stage 1: Raw Window Evaluation

For each high-tide window, compute raw signals in these groups:

- `water stability`
  - wind
  - wave-height proxy
  - pier exposure
  - dirty-water penalties

- `tide setup`
  - relative high-tide context
  - incoming vs outgoing phase
  - swing size
  - sabiki-current penalty

- `bait opportunity`
  - baitfish heuristic
  - local baitfish nudge
  - species compatibility

- `fishable timing`
  - daylight ratio
  - sunrise / sunset overlap
  - dark-window penalty when a daylight option exists

- `local weekly nudge`
  - small bounded effect from `data/local-report.json`

### Stage 2: Relative Weekly Ranking

After all windows are scored, the app should:

- compare all windows across the current 7-day outlook for the selected pier
- rank them relative to the weekly set
- convert that relative placement into the displayed local index
- keep the weekly report as a bounded adjustment rather than a full override

## Pier-Specific Logic

### Santa Barbara / Stearns Wharf

The model should account for:

- incoming tide often helping mackerel, baitfish, and halibut windows
- summer evening incoming tides being especially favorable
- very large swings sometimes hurting easy sabiki fishing
- Stearns Wharf being less wind-exposed than Goleta
- local sabiki behavior often favoring light casts rather than straight-down drops

### Goleta Pier

The model should account for:

- greater exposure to wind and swell
- outgoing tide becoming turbulent more easily
- moderate incoming tide with lighter wind often being more stable
- bait schools mattering more than tide direction alone

## Species Recommendation Layer

The app should recommend likely species rather than requiring a user-selected target species.

Current heuristic species set:

- mackerel
- jacksmelt
- surfperch
- halibut
- bat ray
- leopard shark

For each window, the app should return:

- top likely species
- confidence level
- short reasons

## Bait and Trip-Type Guidance

The app should derive trip guidance from:

- likely species
- baitfish conditions
- current strength
- local weekly method note

Current trip types may include:

- `Baitfish Window`
- `Cast-Through Window`
- `Predator Window`
- `Set-and-Wait Session`
- `Mixed Pier Session`
- `Scratch Session`

The app should provide a simple bait recommendation for the selected day, such as:

- `Sabiki with bait tips`
- `Cast sabiki with squid tips`
- `Live bait or soft plastics`
- `Cut squid or oily cut bait`
- `Squid and shrimp`

## Visual Design Requirements

The interface should feel:

- beachy / ocean-oriented
- readable on phone
- visually scannable at a glance
- friendly to visual learners

Important visual cues:

- clear weekly cards
- sunrise / sunset line
- daylight overlap timeline
- incoming / outgoing color treatment
- arrow icon for tide movement
- references visible at the bottom

## Local Report Workflow

The intended weekly workflow is:

1. Copy Santa Barbara / Goleta-relevant portions of the subscribed fishing report into ChatGPT.
2. Use the saved prompt in `prompts/weekly-local-report-prompt.md`.
3. Generate structured JSON for `data/local-report.json`.
4. Commit and push changes.
5. Let Render redeploy the application.

The app should treat this weekly report as:

- a local reality check
- a method and species hint
- a modest score nudge

It should not be treated as a live automated feed.

## Technical Architecture

### Backend

- `server.js`
- lightweight Node server
- serves the static frontend
- proxies or aggregates data from NOAA / NWS / buoy sources
- returns 7-day outlook payloads

### Frontend

- `public/index.html`
- `public/styles.css`
- `public/app.js`

The frontend is responsible for:

- fetching weekly data
- computing recommendation windows
- scoring and ranking
- rendering cards and detailed views

## Reliability and Transparency

The app must:

- show loading state while awaiting data
- show error state when upstream data fails
- avoid silently hanging
- identify its external references
- explain that the index is relative, not absolute

## Known Constraints

- NOAA tide station for Goleta is still a nearby proxy rather than a Goleta-specific tide station
- wave height is a forecast proxy, not a full nearshore swell model
- no direct water-clarity feed is currently integrated
- no real-time baitfish report feed is integrated
- species recommendations are heuristic

## Future Enhancements

- water-clarity risk model
- direct swell direction / period integration
- moon phase
- crowding / convenience layer
- saved observations from the user
- species-specific trip presets
- historical local report archive
- separate forecast confidence indicator for farther-out dates
- stronger family-comfort and safety cues

## Success Criteria

The application is succeeding when:

- the best-looking day feels believable relative to local conditions
- weak weeks still have a sensible "best available" option without reading as overly optimistic
- nighttime highs do not dominate when a usable daylight option exists
- users can glance at the week view and quickly decide whether to plan a trip
- the daily summary gives species, bait, and trip-style guidance that feels practical
