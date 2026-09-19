const form = document.querySelector("#visual-form");
const spotSelect = document.querySelector("#visual-spot");
const dateInput = document.querySelector("#visual-date");
const title = document.querySelector("#visual-title");
const subtitle = document.querySelector("#visual-subtitle");
const windNeedle = document.querySelector("#wind-needle");
const waveNeedle = document.querySelector("#wave-needle");
const marineBar = document.querySelector("#marine-bar");
const marineLabel = document.querySelector("#marine-label");
const marineNote = document.querySelector("#marine-note");
const windScale = document.querySelector("#wind-scale");
const waveScale = document.querySelector("#wave-scale");
const visibilityScale = document.querySelector("#visibility-scale");
const tempScale = document.querySelector("#temp-scale");
const conditionIcons = document.querySelector("#condition-icons");
const clockFace = document.querySelector("#clock-face");
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

function setNeedle(element, degrees) {
  if (!element || degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) {
    return;
  }

  element.style.setProperty("--needle-angle", `${Number(degrees) - 90}deg`);
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

function conditionRead(day) {
  const wind = day.dailyConditions?.windSpeedMph;
  const buoy = day.buoyConditions || {};
  const wave = buoy.significantWaveHeightFeet ?? day.dailyConditions?.waveHeightFeet;
  const temp = buoy.waterTempF;
  const localReport = day.localReport || {};
  let score = 0;

  if (wind !== null && wind !== undefined) {
    score += wind > 14 ? 2 : wind > 10 ? 1 : 0;
  }
  if (wave !== null && wave !== undefined) {
    score += wave > 4 ? 2 : wave > 3 ? 1 : 0;
  }
  if (temp !== null && temp !== undefined) {
    score += temp < 58 ? 2 : temp < 62 ? 1 : 0;
  }
  if (localReport.waterClarity === "poor") {
    score += 1;
  }

  if (score >= 4) {
    return {
      label: "Scratchy",
      color: "#f4510b",
      note: "Keep expectations low; water quality or comfort may be the limiter.",
      iconClass: "warning",
    };
  }
  if (score >= 2) {
    return {
      label: "Mixed",
      color: "#ffbd42",
      note: "Some usable pieces, but check the tide window before committing.",
      iconClass: "active",
    };
  }
  return {
    label: "Clean",
    color: "#46ee1c",
    note: "Conditions look manageable for a family pier session.",
    iconClass: "active",
  };
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

function renderConditionIcons(read) {
  const icons = [
    { icon: "☀", active: true },
    { icon: "☾", active: false },
    { icon: "ϟ", active: false },
    { icon: "♒", active: read.label !== "Clean" },
    { icon: "☁", active: read.label === "Mixed" },
    { icon: "≋", active: read.label === "Scratchy" },
    { icon: "❄", active: false },
    { icon: "⚠", active: read.label === "Scratchy", warning: true },
  ];

  conditionIcons.innerHTML = "";
  icons.forEach((item) => {
    const span = document.createElement("span");
    span.textContent = item.icon;
    if (item.active) {
      span.className = item.warning ? "warning" : read.iconClass;
    }
    conditionIcons.append(span);
  });
}

function renderClock(high) {
  clockFace.innerHTML = "";
  const activeHour = high ? (high.time.getHours() % 12 || 12) : 12;

  for (let index = 0; index < 24; index += 1) {
    const tick = document.createElement("i");
    const hour = (index % 12) || 12;
    tick.className = `tick${index % 2 === 0 ? " major" : ""}`;
    tick.style.transform = `rotate(${index * 15}deg)`;
    if (hour === activeHour || hour === activeHour - 1 || hour === activeHour + 1) {
      tick.classList.add("active-good");
    }
    clockFace.append(tick);
  }

  for (let hour = 1; hour <= 12; hour += 1) {
    const number = document.createElement("span");
    const angle = ((hour % 12) * 30) - 90;
    const radius = 72;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    number.className = "clock-number";
    number.textContent = String(hour);
    number.style.transform = `translate(${x - 6}px, ${y - 8}px)`;
    clockFace.append(number);
  }
}

function renderDashboard(data) {
  const day = data.daysData?.[0];
  if (!day) {
    throw new Error("No daily data returned.");
  }

  day.localReport = data.localReport;
  const high = chooseHighTide(day);
  const buoy = day.buoyConditions || {};
  const condition = conditionRead(day);
  const waveHeight = buoy.significantWaveHeightFeet ?? day.dailyConditions?.waveHeightFeet;
  const wavePeriod = buoy.swellPeriodSeconds ?? buoy.dominantPeriodSeconds;
  const waveDirection = buoy.swellDirectionDegrees ?? buoy.meanWaveDirectionDegrees;
  const wind = day.dailyConditions?.windSpeedMph;
  const windDirection = day.dailyConditions?.windDirectionDegrees;
  const waterTemp = buoy.waterTempF;

  title.textContent = `${SPOT_LABELS[data.spot?.id] || data.spot?.name || "Pier"} • ${formatDate(day.date)}`;
  subtitle.textContent = `${condition.label} marine read • sunrise ${formatTime(day.sunTimes.sunrise)} • sunset ${formatTime(day.sunTimes.sunset)}`;
  marineLabel.textContent = `${condition.label} Conditions`;
  marineNote.textContent = condition.note;
  marineBar.style.background = condition.color;

  setNeedle(windNeedle, windDirection);
  setNeedle(waveNeedle, waveDirection);

  renderScale(windScale, [2, 4, 6, 8, 10, 15, 20, 25, 30, 40, 50], wind);
  renderWaveScale(waveScale, [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18], [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18], waveHeight, wavePeriod);
  renderScale(visibilityScale, [0.25, 0.5, 1, 2, 3, 4, 5], 5, {
    label(value) {
      return value === 0.25 ? "¼" : value === 0.5 ? "½" : value === 5 ? "5+" : String(value);
    },
  });
  renderScale(tempScale, [40, 50, 55, 60, 65, 70, 75, 80, 85, 90], waterTemp);
  renderConditionIcons(condition);
  renderClock(high);

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
    marineLabel.textContent = "Offline";
    marineNote.textContent = "The single-day visual could not reach the fishing API.";
    marineBar.style.background = "#f4510b";
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
