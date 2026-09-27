const form = document.querySelector("#visual-form");
const spotSelect = document.querySelector("#visual-spot");
const dateInput = document.querySelector("#visual-date");
const title = document.querySelector("#visual-title");
const subtitle = document.querySelector("#visual-subtitle");
const windScale = document.querySelector("#wind-scale");
const waveScale = document.querySelector("#wave-scale");
const visibilityScale = document.querySelector("#visibility-scale");
const tempScale = document.querySelector("#temp-scale");
const tideProgressLine = document.querySelector("#tide-progress-line");
const tideNowMarker = document.querySelector("#tide-now-marker");
const tidePhase = document.querySelector("#tide-phase");
const tideStage = document.querySelector("#tide-stage");
const bestWindow = document.querySelector("#best-window");
const highTide = document.querySelector("#high-tide");

const SPOT_LABELS = {
  santa_barbara: "Santa Barbara / Stearns",
  goleta: "Goleta Pier",
};

function todayString() {
  return dateInputString(new Date());
}

function dateInputString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requestedDate(params) {
  const date = params.get("date");
  return /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : todayString();
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(String(value).includes("T") ? value : String(value).replace(" ", "T"));
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  const date = parseDateValue(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateValue) {
  const date = safeDate(dateValue);
  if (!date) {
    return "--";
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateValue) {
  const date = safeDate(dateValue);
  if (!date) {
    return "--";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

function nearestIndex(values, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return -1;
  }

  return values.reduce((bestIndex, candidate, index) => {
    const bestDistance = Math.abs(values[bestIndex] - value);
    const candidateDistance = Math.abs(candidate - value);
    return candidateDistance < bestDistance ? index : bestIndex;
  }, 0);
}

function renderScale(container, values, activeValue, options = {}) {
  const activeIndex = nearestIndex(values, activeValue);
  container.style.setProperty("--items", values.length);
  container.innerHTML = "";

  values.forEach((value, index) => {
    const item = document.createElement("div");
    const pill = document.createElement("span");
    const label = document.createElement("span");

    item.className = "scale-item";
    if (index === activeIndex) {
      item.classList.add("active");
      if (options.activeClass) {
        item.classList.add(options.activeClass);
      }
    }

    pill.className = "pill";
    label.textContent = options.label ? options.label(value) : String(value);
    item.append(pill, label);
    container.append(item);
  });
}

function renderWaveScale(container, heightValues, periodValues, height, period) {
  const activeHeightIndex = nearestIndex(heightValues, height);
  const activePeriodIndex = nearestIndex(periodValues, period);
  container.style.setProperty("--items", heightValues.length);
  container.innerHTML = "";

  heightValues.forEach((value, index) => {
    const item = document.createElement("div");
    const pill = document.createElement("span");
    const label = document.createElement("span");

    item.className = "scale-item";
    if (index === activeHeightIndex) {
      item.classList.add("active", "height");
    }
    if (index === activePeriodIndex) {
      item.classList.add("active", "period");
    }

    pill.className = "pill";
    label.textContent = String(value);
    item.append(pill, label);
    container.append(item);
  });
}

function chooseHighTide(day) {
  const highs = (day.highLowPredictions || [])
    .filter((prediction) => prediction.type === "H")
    .map((prediction) => ({
      time: safeDate(prediction.t),
      height: Number(prediction.v),
    }))
    .filter((prediction) => prediction.time);

  if (!highs.length) {
    return null;
  }

  return highs.sort((left, right) => {
    const leftDaylight = daylightRatio(day, left.time);
    const rightDaylight = daylightRatio(day, right.time);
    return (right.height + rightDaylight) - (left.height + leftDaylight);
  })[0];
}

function daylightRatio(day, highTime) {
  const sunrise = safeDate(day.sunTimes?.sunrise);
  const sunset = safeDate(day.sunTimes?.sunset);
  if (!sunrise || !sunset) {
    return 0;
  }

  const start = new Date(highTime.getTime() - 2 * 60 * 60 * 1000);
  const end = new Date(highTime.getTime() + 2 * 60 * 60 * 1000);
  const overlap = Math.max(0, Math.min(end.getTime(), sunset.getTime()) - Math.max(start.getTime(), sunrise.getTime()));
  return overlap / (4 * 60 * 60 * 1000);
}

function windowLabel(high) {
  if (!high) {
    return "--";
  }

  const start = new Date(high.time.getTime() - 2 * 60 * 60 * 1000);
  const end = new Date(high.time.getTime() + 2 * 60 * 60 * 1000);
  return `${formatTime(start)}-${formatTime(end)}`;
}

function tideGraphPoint(progress, phase) {
  const clamped = Math.max(0, Math.min(1, progress));

  if (phase === "flood") {
    const x = 95 + (355 * clamped);
    const y = 390 - (270 * Math.sin((clamped * Math.PI) / 2));
    return { x, y };
  }

  const x = 450 + (425 * clamped);
  const y = 120 + (272 * (1 - Math.cos((clamped * Math.PI) / 2)));
  return { x, y };
}

function tideProgressPoints(progress, phase) {
  const points = [];
  const steps = Math.max(2, Math.round(progress * 18));
  for (let index = 0; index <= steps; index += 1) {
    const stepProgress = progress * (index / steps);
    const point = tideGraphPoint(stepProgress, phase);
    points.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  }
  return points.join(" ");
}

function currentTimeOnSelectedDate(day) {
  const selectedDate = safeDate(day.date);
  if (!selectedDate) {
    return new Date();
  }

  const now = new Date();
  selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return selectedDate;
}

function surroundingTideStage(day, high) {
  if (!high) {
    return null;
  }

  const now = currentTimeOnSelectedDate(day);
  const predictions = (day.highLowPredictions || [])
    .map((prediction) => ({
      time: safeDate(prediction.t),
      height: Number(prediction.v),
      type: prediction.type,
    }))
    .filter((prediction) => prediction.time)
    .sort((left, right) => left.time - right.time);

  const previousEvent = [...predictions].reverse().find((prediction) => prediction.time <= now);
  const nextEvent = predictions.find((prediction) => prediction.time > now);

  if (previousEvent && nextEvent) {
    const duration = nextEvent.time - previousEvent.time;
    const progress = duration > 0 ? (now - previousEvent.time) / duration : 0;
    const phase = nextEvent.type === "H" ? "flood" : "ebb";
    return {
      phase,
      progress: Math.max(0, Math.min(1, progress)),
      now,
      from: previousEvent,
      to: nextEvent,
    };
  }

  if (nextEvent) {
    return {
      phase: nextEvent.type === "H" ? "flood" : "ebb",
      progress: 0,
      now,
      from: null,
      to: nextEvent,
    };
  }

  return {
    phase: previousEvent?.type === "H" ? "ebb" : "flood",
    progress: 1,
    now,
    from: previousEvent,
    to: null,
  };
}

function renderTideProgress(day, high) {
  const stage = surroundingTideStage(day, high);
  if (!stage) {
    tideNowMarker.setAttribute("transform", "translate(450 120)");
    tideProgressLine.setAttribute("points", "");
    tidePhase.textContent = "Tide phase: --";
    tideStage.textContent = "No tide stage available.";
    return;
  }

  const point = tideGraphPoint(stage.progress, stage.phase);
  tideNowMarker.setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
  tideProgressLine.setAttribute("points", tideProgressPoints(stage.progress, stage.phase));
  tideProgressLine.classList.toggle("ebb", stage.phase === "ebb");
  tideProgressLine.classList.toggle("flood", stage.phase === "flood");

  const direction = stage.phase === "flood" ? "incoming toward high tide" : "outgoing after high tide";
  const percent = Math.round(stage.progress * 100);
  tidePhase.textContent = `Now: ${formatTime(stage.now)} • ${direction}`;
  tideStage.textContent = `${percent}% through this ${stage.phase === "flood" ? "incoming" : "outgoing"} tide segment`;
}

function renderDashboard(data) {
  const day = data.daysData?.[0];
  if (!day) {
    throw new Error("No daily data returned.");
  }

  day.localReport = data.localReport;
  const high = chooseHighTide(day);
  const buoy = day.buoyConditions || {};
  const waveHeight = buoy.significantWaveHeightFeet ?? day.dailyConditions?.waveHeightFeet;
  const wavePeriod = buoy.swellPeriodSeconds ?? buoy.dominantPeriodSeconds;
  const wind = day.dailyConditions?.windSpeedMph;
  const waterTemp = buoy.waterTempF;

  title.textContent = `${SPOT_LABELS[data.spot?.id] || data.spot?.name || "Pier"} • ${formatDate(day.date)}`;
  subtitle.textContent = `Sunrise ${formatTime(day.sunTimes.sunrise)} • sunset ${formatTime(day.sunTimes.sunset)}`;

  renderScale(windScale, [2, 4, 6, 8, 10, 15, 20, 25, 30, 40, 50], wind);
  renderWaveScale(waveScale, [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18], [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18], waveHeight, wavePeriod);
  renderScale(visibilityScale, [0.25, 0.5, 1, 2, 3, 4, 5], 5, {
    label(value) {
      return value === 0.25 ? "¼" : value === 0.5 ? "½" : value === 5 ? "5+" : String(value);
    },
  });
  renderScale(tempScale, [40, 50, 55, 60, 65, 70, 75, 80, 85, 90], waterTemp);
  renderTideProgress(day, high);

  bestWindow.textContent = `Best window: ${windowLabel(high)}`;
  highTide.textContent = high ? `High tide: ${formatTime(high.time)} • ${formatNumber(high.height, 1)} ft` : "High tide: --";
}

async function loadVisual() {
  const params = new URLSearchParams(window.location.search);
  const spot = params.get("spot") || "santa_barbara";
  const date = requestedDate(params);
  if (params.get("spot") !== spot || params.get("date") !== date) {
    params.set("spot", spot);
    params.set("date", date);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  spotSelect.value = spot;
  dateInput.value = date;
  title.textContent = "Loading single-day view";
  subtitle.textContent = `Fetching ${formatDate(date)}...`;

  try {
    const response = await fetch(`/api/week?spot=${encodeURIComponent(spot)}&start=${encodeURIComponent(date)}&days=1`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Unable to load visual outlook.");
    }

    renderDashboard(data);
  } catch (error) {
    title.textContent = "Unable to load visual";
    subtitle.textContent = error.message;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const params = new URLSearchParams(window.location.search);
  params.set("spot", spotSelect.value);
  params.set("date", dateInput.value || todayString());
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  loadVisual();
});

loadVisual();
