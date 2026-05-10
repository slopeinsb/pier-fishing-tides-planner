const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const PUBLIC_DIR = path.join(__dirname, "public");
const NOAA_BASE_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const WEATHER_BASE_URL = "https://api.weather.gov";
const DEFAULT_TIME_ZONE = "lst_ldt";
const WEATHER_USER_AGENT = "PierFishingCompanion/0.1 (local app)";
const MINUTES_PER_DAY = 1440;
const UPSTREAM_TIMEOUT_MS = 15000;

const SPOTS = {
  santa_barbara: {
    id: "santa_barbara",
    name: "Santa Barbara Harbor / City Pier",
    station: "9411340",
    latitude: 34.4046,
    longitude: -119.6925,
    notes: "Tides and nearby forecast conditions centered on Santa Barbara Harbor.",
  },
  goleta: {
    id: "goleta",
    name: "Goleta Pier",
    station: "9411340",
    latitude: 34.4139,
    longitude: -119.8296,
    notes: "Tides use the nearby Santa Barbara NOAA station while weather and light are centered on Goleta Pier.",
  },
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath);
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    response.writeHead(200, { "Content-Type": mimeType });
    response.end(contents);
  });
}

function isSafeStationId(stationId) {
  return /^[a-z0-9]{3,10}$/i.test(stationId);
}

function isSafeDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function fetchNoaaJson(params) {
  const url = buildUrl(NOAA_BASE_URL, {
    application: "PierFishingCompanion",
    format: "json",
    time_zone: DEFAULT_TIME_ZONE,
    units: "english",
    ...params,
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`NOAA request failed with ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "NOAA returned an error");
  }

  return data;
}

async function fetchWeatherJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: {
      Accept: "application/geo+json",
      "User-Agent": WEATHER_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Weather request failed with ${response.status}`);
  }

  return response.json();
}

function getSpot(searchParams) {
  const requestedSpot = searchParams.get("spot");
  if (requestedSpot && SPOTS[requestedSpot]) {
    return SPOTS[requestedSpot];
  }

  return SPOTS.santa_barbara;
}

function parseDateAtMidnight(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, daysToAdd) {
  const date = parseDateAtMidnight(dateString);
  date.setDate(date.getDate() + daysToAdd);
  return formatDateForInput(date);
}

function toIsoWithOffset(date) {
  return new Date(date).toISOString();
}

function parseIsoDurationMinutes(duration) {
  const match = duration.match(/^P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?/);
  if (!match) {
    return 0;
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return days * MINUTES_PER_DAY + hours * 60 + minutes;
}

function expandValidTime(validTime) {
  const [start, duration = "PT0M"] = validTime.split("/");
  const startDate = new Date(start);
  const durationMinutes = parseIsoDurationMinutes(duration);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    start: startDate,
    end: endDate,
  };
}

function getValuesInRange(series, rangeStart, rangeEnd) {
  if (!series || !Array.isArray(series.values)) {
    return [];
  }

  return series.values
    .map((entry) => {
      const { start, end } = expandValidTime(entry.validTime);
      return {
        start,
        end,
        value: entry.value,
      };
    })
    .filter((entry) => entry.end > rangeStart && entry.start < rangeEnd && entry.value !== null);
}

function averageSeriesValue(series, rangeStart, rangeEnd) {
  const entries = getValuesInRange(series, rangeStart, rangeEnd);
  if (entries.length === 0) {
    return null;
  }

  const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);
  return total / entries.length;
}

function degreesToCompass(degrees) {
  if (typeof degrees !== "number" || Number.isNaN(degrees)) {
    return null;
  }

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function metersToFeet(value) {
  return value === null ? null : value * 3.28084;
}

function kmhToMph(value) {
  return value === null ? null : value * 0.621371;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function calculateSunEvent(date, latitude, longitude, isSunrise) {
  const zenith = 90.833;
  const lngHour = longitude / 15;
  const day = dayOfYear(date);
  const approxTime = day + ((isSunrise ? 6 : 18) - lngHour) / 24;
  const meanAnomaly = (0.9856 * approxTime) - 3.289;
  let trueLongitude = meanAnomaly + (1.916 * Math.sin(toRadians(meanAnomaly))) + (0.02 * Math.sin(toRadians(2 * meanAnomaly))) + 282.634;
  trueLongitude = normalizeDegrees(trueLongitude);

  let rightAscension = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))));
  rightAscension = normalizeDegrees(rightAscension);

  const lQuadrant = Math.floor(trueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = (rightAscension + lQuadrant - raQuadrant) / 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle =
    (Math.cos(toRadians(zenith)) - sinDeclination * Math.sin(toRadians(latitude))) /
    (cosDeclination * Math.cos(toRadians(latitude)));

  if (cosHourAngle < -1 || cosHourAngle > 1) {
    return null;
  }

  let hourAngle = isSunrise ? 360 - toDegrees(Math.acos(cosHourAngle)) : toDegrees(Math.acos(cosHourAngle));
  hourAngle /= 15;

  const localMeanTime = hourAngle + rightAscension - (0.06571 * approxTime) - 6.622;
  let utcHour = localMeanTime - lngHour;
  utcHour = ((utcHour % 24) + 24) % 24;

  const hours = Math.floor(utcHour);
  const minutes = Math.floor((utcHour - hours) * 60);
  const seconds = Math.round((((utcHour - hours) * 60) - minutes) * 60);
  const result = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds));
  return result;
}

function buildSunTimes(dateString, latitude, longitude) {
  const date = parseDateAtMidnight(dateString);
  return {
    sunrise: calculateSunEvent(date, latitude, longitude, true),
    sunset: calculateSunEvent(date, latitude, longitude, false),
  };
}

function overlapMinutes(rangeAStart, rangeAEnd, rangeBStart, rangeBEnd) {
  const start = Math.max(rangeAStart.getTime(), rangeBStart.getTime());
  const end = Math.min(rangeAEnd.getTime(), rangeBEnd.getTime());
  return Math.max(0, (end - start) / 60000);
}

async function fetchTideBundle(station, date) {
  return fetchTideRange(station, date, date);
}

async function fetchTideRange(station, beginDate, endDate) {
  const compactBeginDate = beginDate.replaceAll("-", "");
  const compactEndDate = endDate.replaceAll("-", "");

  const [highLowData, curveData] = await Promise.all([
    fetchNoaaJson({
      begin_date: compactBeginDate,
      end_date: compactEndDate,
      datum: "MLLW",
      interval: "hilo",
      product: "predictions",
      station,
    }),
    fetchNoaaJson({
      begin_date: compactBeginDate,
      end_date: compactEndDate,
      datum: "MLLW",
      interval: 30,
      product: "predictions",
      station,
    }),
  ]);

  return {
    highLowPredictions: highLowData.predictions || [],
    intervalPredictions: curveData.predictions || [],
  };
}

function groupPredictionsByDate(predictions) {
  return (predictions || []).reduce((grouped, prediction) => {
    const dateKey = String(prediction.t).slice(0, 10);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(prediction);
    return grouped;
  }, {});
}

async function fetchForecastGrid(latitude, longitude) {
  const pointsUrl = buildUrl(`${WEATHER_BASE_URL}/points/${latitude},${longitude}`, {});
  const pointsData = await fetchWeatherJson(pointsUrl);
  const forecastGridUrl = pointsData.properties && pointsData.properties.forecastGridData;

  if (!forecastGridUrl) {
    throw new Error("Weather grid forecast is unavailable for this point.");
  }

  const forecastGridData = await fetchWeatherJson(forecastGridUrl);
  return {
    points: pointsData.properties,
    grid: forecastGridData.properties,
  };
}

function buildDailyConditions(grid, date) {
  const rangeStart = parseDateAtMidnight(date);
  const rangeEnd = new Date(rangeStart.getTime() + MINUTES_PER_DAY * 60 * 1000);

  const windSpeedMph = kmhToMph(averageSeriesValue(grid.windSpeed, rangeStart, rangeEnd));
  const windDirectionDegrees = averageSeriesValue(grid.windDirection, rangeStart, rangeEnd);
  const waveHeightFeet = metersToFeet(averageSeriesValue(grid.waveHeight, rangeStart, rangeEnd));

  return {
    windSpeedMph,
    windDirectionDegrees,
    windDirectionLabel: degreesToCompass(windDirectionDegrees),
    waveHeightFeet,
  };
}

function serializeSeries(series, unitConverter) {
  if (!series || !Array.isArray(series.values)) {
    return [];
  }

  return series.values
    .map((entry) => {
      const { start, end } = expandValidTime(entry.validTime);
      if (entry.value === null) {
        return null;
      }

      return {
        start: toIsoWithOffset(start),
        end: toIsoWithOffset(end),
        value: unitConverter ? unitConverter(Number(entry.value)) : Number(entry.value),
      };
    })
    .filter(Boolean);
}

async function handleTidesApi(requestUrl, response) {
  const station = requestUrl.searchParams.get("station") || "9411340";
  const date = requestUrl.searchParams.get("date");

  if (!isSafeStationId(station)) {
    sendJson(response, 400, { error: "Invalid station id." });
    return;
  }

  if (!date || !isSafeDate(date)) {
    sendJson(response, 400, { error: "A date in YYYY-MM-DD format is required." });
    return;
  }

  try {
    const tideBundle = await fetchTideBundle(station, date);

    sendJson(response, 200, {
      station,
      date,
      fetchedAt: new Date().toISOString(),
      source: {
        name: "NOAA CO-OPS Data API",
        url: "https://api.tidesandcurrents.noaa.gov/api/prod/",
      },
      highLowPredictions: tideBundle.highLowPredictions,
      intervalPredictions: tideBundle.intervalPredictions,
    });
  } catch (error) {
    sendJson(response, 502, {
      error: "Unable to fetch NOAA tide predictions right now.",
      detail: error.message,
    });
  }
}

async function handleConditionsApi(requestUrl, response) {
  const spot = getSpot(requestUrl.searchParams);
  const date = requestUrl.searchParams.get("date");

  if (!date || !isSafeDate(date)) {
    sendJson(response, 400, { error: "A date in YYYY-MM-DD format is required." });
    return;
  }

  try {
    const [tides, forecast] = await Promise.all([
      fetchTideBundle(spot.station, date),
      fetchForecastGrid(spot.latitude, spot.longitude),
    ]);

    const sunTimes = buildSunTimes(date, spot.latitude, spot.longitude);
    const dailyConditions = buildDailyConditions(forecast.grid, date);

    sendJson(response, 200, {
      spot,
      station: spot.station,
      date,
      fetchedAt: new Date().toISOString(),
      source: {
        tides: "https://api.tidesandcurrents.noaa.gov/api/prod/",
        weather: "https://api.weather.gov",
        sunriseSunset: "Calculated locally using NOAA solar calculation formulas.",
      },
      highLowPredictions: tides.highLowPredictions,
      intervalPredictions: tides.intervalPredictions,
      forecastMeta: {
        forecastOffice: forecast.points && forecast.points.cwa,
        forecastGridData: forecast.points && forecast.points.forecastGridData,
      },
      dailyConditions,
      sunTimes: {
        sunrise: sunTimes.sunrise ? toIsoWithOffset(sunTimes.sunrise) : null,
        sunset: sunTimes.sunset ? toIsoWithOffset(sunTimes.sunset) : null,
      },
      weatherSeries: {
        windSpeedMph: serializeSeries(forecast.grid.windSpeed, kmhToMph),
        windDirectionDegrees: serializeSeries(forecast.grid.windDirection),
        waveHeightFeet: serializeSeries(forecast.grid.waveHeight, metersToFeet),
      },
    });
  } catch (error) {
    sendJson(response, 502, {
      error: "Unable to fetch combined fishing conditions right now.",
      detail: error.message,
    });
  }
}

async function handleWeekApi(requestUrl, response) {
  const spot = getSpot(requestUrl.searchParams);
  const start = requestUrl.searchParams.get("start");
  const days = Math.min(Math.max(Number(requestUrl.searchParams.get("days") || 7), 1), 7);

  if (!start || !isSafeDate(start)) {
    sendJson(response, 400, { error: "A start date in YYYY-MM-DD format is required." });
    return;
  }

  try {
    const forecast = await fetchForecastGrid(spot.latitude, spot.longitude);
    const endDate = addDays(start, days - 1);
    const tideRange = await fetchTideRange(spot.station, start, endDate);
    const weatherSeries = {
      windSpeedMph: serializeSeries(forecast.grid.windSpeed, kmhToMph),
      windDirectionDegrees: serializeSeries(forecast.grid.windDirection),
      waveHeightFeet: serializeSeries(forecast.grid.waveHeight, metersToFeet),
    };
    const highLowByDate = groupPredictionsByDate(tideRange.highLowPredictions);
    const intervalByDate = groupPredictionsByDate(tideRange.intervalPredictions);

    const dayPayloads = Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      const sunTimes = buildSunTimes(date, spot.latitude, spot.longitude);

      return {
        date,
        station: spot.station,
        highLowPredictions: highLowByDate[date] || [],
        intervalPredictions: intervalByDate[date] || [],
        dailyConditions: buildDailyConditions(forecast.grid, date),
        sunTimes: {
          sunrise: sunTimes.sunrise ? toIsoWithOffset(sunTimes.sunrise) : null,
          sunset: sunTimes.sunset ? toIsoWithOffset(sunTimes.sunset) : null,
        },
      };
    });

    sendJson(response, 200, {
      spot,
      fetchedAt: new Date().toISOString(),
      start,
      days,
      station: spot.station,
      source: {
        tides: "https://api.tidesandcurrents.noaa.gov/api/prod/",
        weather: "https://api.weather.gov",
        sunriseSunset: "Calculated locally using NOAA solar calculation formulas.",
      },
      forecastMeta: {
        forecastOffice: forecast.points && forecast.points.cwa,
        forecastGridData: forecast.points && forecast.points.forecastGridData,
      },
      weatherSeries,
      daysData: dayPayloads,
    });
  } catch (error) {
    sendJson(response, 502, {
      error: "Unable to fetch weekly fishing conditions right now.",
      detail: error.message,
    });
  }
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/week") {
    handleWeekApi(requestUrl, response);
    return;
  }

  if (requestUrl.pathname === "/api/conditions") {
    handleConditionsApi(requestUrl, response);
    return;
  }

  if (requestUrl.pathname === "/api/tides") {
    handleTidesApi(requestUrl, response);
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  sendFile(response, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Pier Fishing Companion running at http://${HOST}:${PORT}`);
});
