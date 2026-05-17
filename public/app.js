const plannerForm = document.querySelector("#planner-form");
const spotSelect = document.querySelector("#spot");
const dateInput = document.querySelector("#date");
const summary = document.querySelector("#summary");
const dayBait = document.querySelector("#day-bait");
const localReportCard = document.querySelector("#local-report-card");
const dayVisual = document.querySelector("#day-visual");
const chart = document.querySelector("#chart");
const statusLabel = document.querySelector("#status");
const conditionsCaption = document.querySelector("#conditions-caption");
const conditions = document.querySelector("#conditions");
const weekGrid = document.querySelector("#week-grid");
const weekStatus = document.querySelector("#week-status");
const loadingBanner = document.querySelector("#loading-banner");
const references = document.querySelector("#references");
const template = document.querySelector("#window-template");

const PRESET_SPOTS = {
  santa_barbara: {
    station: "9411340",
    name: "Santa Barbara Harbor / City Pier",
    notes: "Tides and nearby forecast conditions centered on Santa Barbara Harbor and Stearns Wharf.",
  },
  goleta: {
    station: "9411340",
    name: "Goleta Pier",
    notes: "Tides use the nearby Santa Barbara NOAA station while weather and light center on Goleta.",
  },
};

const SPOT_RULES = {
  santa_barbara: {
    label: "Stearns Wharf / Santa Barbara Harbor",
    exposure: "moderate",
    incomingBonus: 4,
    summerEveningIncomingBonus: 4,
    outgoingPenalty: -2,
    hugeSwingPenaltyThreshold: 4,
    hugeSwingPenalty: -5,
    moderateIncomingRange: [1.2, 3.4],
  },
  goleta: {
    label: "Goleta Pier",
    exposure: "high",
    incomingBonus: 3,
    summerEveningIncomingBonus: 1,
    outgoingPenalty: -5,
    hugeSwingPenaltyThreshold: 3.6,
    hugeSwingPenalty: -3,
    moderateIncomingRange: [1, 2.8],
  },
};

const SPECIES_PROFILES = [
  {
    key: "mackerel",
    label: "Mackerel",
    tripStyle: "sabiki or bait around active water",
    score(recommendation) {
      let score = 46;
      if (recommendation.lightScore >= 10) {
        score += 18;
      }
      if (recommendation.averageSwing >= 2) {
        score += 12;
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 12) {
        score += 8;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 4) {
        score += 6;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.lightScore >= 10) {
        reasons.push("dawn or dusk overlap");
      }
      if (recommendation.averageSwing >= 2) {
        reasons.push("active moving water");
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 12) {
        reasons.push("manageable wind for bait schools");
      }
      return reasons;
    },
  },
  {
    key: "jacksmelt",
    label: "Jacksmelt",
    tripStyle: "small baits under a float or light sabiki",
    score(recommendation) {
      let score = 44;
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 10) {
        score += 16;
      }
      if (recommendation.lightScore >= 6) {
        score += 10;
      }
      if (recommendation.averageSwing >= 1.3) {
        score += 8;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 3.5) {
        score += 8;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 10) {
        reasons.push("calmer surface conditions");
      }
      if (recommendation.averageSwing >= 1.3) {
        reasons.push("steady current");
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 3.5) {
        reasons.push("gentler water around the pier");
      }
      return reasons;
    },
  },
  {
    key: "surfperch",
    label: "Surfperch",
    tripStyle: "small bait or grubs when the water has some push",
    score(recommendation) {
      let score = 38;
      if (recommendation.averageSwing >= 1.8) {
        score += 14;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet >= 1.5 && recommendation.conditions.waveHeightFeet <= 4.5) {
        score += 18;
      }
      if (recommendation.lightScore >= 6) {
        score += 8;
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 14) {
        score += 6;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.averageSwing >= 1.8) {
        reasons.push("good water movement");
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet >= 1.5 && recommendation.conditions.waveHeightFeet <= 4.5) {
        reasons.push("enough surf energy to stir food");
      }
      if (recommendation.lightScore >= 6) {
        reasons.push("lower-light edge");
      }
      return reasons;
    },
  },
  {
    key: "halibut",
    label: "Halibut",
    tripStyle: "live bait or artificials in cleaner, calmer windows",
    score(recommendation) {
      let score = 34;
      if (recommendation.averageSwing >= 1.4 && recommendation.averageSwing <= 3.2) {
        score += 14;
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 9) {
        score += 14;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 3) {
        score += 16;
      }
      if (recommendation.lightScore >= 6) {
        score += 6;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 9) {
        reasons.push("calmer presentation conditions");
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 3) {
        reasons.push("cleaner-looking water window");
      }
      if (recommendation.averageSwing >= 1.4 && recommendation.averageSwing <= 3.2) {
        reasons.push("useful current without extreme turbulence");
      }
      return reasons;
    },
  },
  {
    key: "bat_ray",
    label: "Bat Ray",
    tripStyle: "soak bait through a stable, longer session",
    score(recommendation) {
      let score = 36;
      if (recommendation.lightScore >= 6) {
        score += 12;
      }
      if (recommendation.averageSwing >= 1.8) {
        score += 14;
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 16) {
        score += 8;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 5) {
        score += 6;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.lightScore >= 6) {
        reasons.push("low-light feeding window");
      }
      if (recommendation.averageSwing >= 1.8) {
        reasons.push("good tide pull for scent dispersion");
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 16) {
        reasons.push("reasonable soaking conditions");
      }
      return reasons;
    },
  },
  {
    key: "leopard_shark",
    label: "Leopard Shark",
    tripStyle: "bait soak around calmer evening movement",
    score(recommendation) {
      let score = 34;
      if (recommendation.lightScore >= 6) {
        score += 14;
      }
      if (recommendation.averageSwing >= 1.5) {
        score += 12;
      }
      if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 14) {
        score += 10;
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 4.5) {
        score += 8;
      }
      return score;
    },
    reasons(recommendation) {
      const reasons = [];
      if (recommendation.lightScore >= 6) {
        reasons.push("better low-light timing");
      }
      if (recommendation.averageSwing >= 1.5) {
        reasons.push("enough current to move scent");
      }
      if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 4.5) {
        reasons.push("more manageable pier water");
      }
      return reasons;
    },
  },
];

let currentWeek = [];
let currentWeatherSeries = {};
let currentLocalReport = null;
let selectedDate = null;
let currentRequestId = 0;

function parseDateValue(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}`);
  }

  return new Date(value);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toFeet(value) {
  if (value === null || Number.isNaN(Number(value))) {
    return "Unavailable";
  }

  return `${Number(value).toFixed(1)} ft`;
}

function toMph(value) {
  if (value === null || Number.isNaN(Number(value))) {
    return "Unavailable";
  }

  return `${Number(value).toFixed(1)} mph`;
}

function toDegrees(value) {
  if (value === null || Number.isNaN(Number(value))) {
    return "Unavailable";
  }

  return `${Math.round(Number(value))}\u00b0`;
}

function toSeconds(value) {
  if (value === null || Number.isNaN(Number(value))) {
    return "Unavailable";
  }

  return `${Number(value).toFixed(1)} sec`;
}

function formatDateTime(dateValue) {
  return parseDateValue(dateValue).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateValue) {
  return parseDateValue(dateValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(dateValue) {
  return parseDateValue(dateValue).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getSeason(dateValue) {
  const month = parseDateValue(dateValue).getMonth();
  if (month >= 5 && month <= 8) {
    return "summer";
  }
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 9 && month <= 10) {
    return "fall";
  }
  return "winter";
}

function minutesIntoDay(dateValue) {
  const date = parseDateValue(dateValue);
  return date.getHours() * 60 + date.getMinutes();
}

function percentOfDay(dateValue) {
  return (minutesIntoDay(dateValue) / 1440) * 100;
}

function classifyTidePhase(incomingSwing, outgoingSwing) {
  if (incomingSwing >= outgoingSwing * 1.2) {
    return "incoming";
  }
  if (outgoingSwing >= incomingSwing * 1.2) {
    return "outgoing";
  }
  return "balanced";
}

function degreesToCompass(degrees) {
  if (degrees === null || Number.isNaN(Number(degrees))) {
    return null;
  }

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(Number(degrees) / 22.5) % 16;
  return directions[index];
}

function describeRating(score) {
  if (score >= 66) {
    return { label: "Standout", className: "excellent" };
  }

  if (score >= 52) {
    return { label: "Promising", className: "good" };
  }

  return { label: "Watchable", className: "fair" };
}

function createFact(label, value) {
  const wrapper = document.createElement("div");
  const title = document.createElement("dt");
  const description = document.createElement("dd");

  title.textContent = label;
  description.textContent = value;
  wrapper.append(title, description);
  return wrapper;
}

function createConditionCard(label, value, note, variant = "", icon = "") {
  const card = document.createElement("article");
  const cardLabel = document.createElement("p");
  const cardValue = document.createElement("p");
  const cardNote = document.createElement("p");

  card.className = `condition-card${variant ? ` ${variant}` : ""}`;
  cardLabel.className = "condition-label";
  cardValue.className = "condition-value";
  cardNote.className = "condition-note";
  cardLabel.textContent = label;
  if (icon) {
    const iconSpan = document.createElement("span");
    const textSpan = document.createElement("span");
    iconSpan.className = "condition-icon";
    iconSpan.textContent = icon;
    textSpan.textContent = value;
    cardValue.append(iconSpan, textSpan);
  } else {
    cardValue.textContent = value;
  }
  cardNote.textContent = note;
  card.append(cardLabel, cardValue, cardNote);
  return card;
}

function createReferenceCard(title, description, url) {
  const card = document.createElement("article");
  const heading = document.createElement("h3");
  const copy = document.createElement("p");

  card.className = "reference-card";
  heading.textContent = title;

  if (url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = url;
    copy.append(`${description} `, link);
  } else {
    copy.textContent = description;
  }

  card.append(heading, copy);
  return card;
}

function describeTideMovement(recommendation) {
  if (!recommendation) {
    return {
      value: "Still evaluating",
      note: "A tide-movement summary will appear once a high-tide window is scored.",
    };
  }

  const incoming = recommendation.incomingSwing;
  const outgoing = recommendation.outgoingSwing;
  const strongerPhase = incoming >= outgoing ? "Incoming" : "Outgoing";
  const strongerValue = incoming >= outgoing ? incoming : outgoing;
  const secondaryPhase = incoming >= outgoing ? "outgoing" : "incoming";
  const secondaryValue = incoming >= outgoing ? outgoing : incoming;

  return {
    value: `${strongerPhase} ${toFeet(strongerValue)}`,
    note: `${strongerPhase} water is the stronger push in the top window, with ${secondaryPhase} swing at ${toFeet(secondaryValue)}. Average swing: ${toFeet(recommendation.averageSwing)}.`,
    variant: strongerPhase === "Incoming" ? "incoming" : "outgoing",
    icon: strongerPhase === "Incoming" ? "↗" : "↘",
  };
}

function dayDifference(fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function confidenceMultiplier(confidence) {
  if (confidence === "high") {
    return 1;
  }
  if (confidence === "medium") {
    return 0.75;
  }
  return 0.5;
}

function summarizeWaterFeel(localReport) {
  if (!localReport) {
    return null;
  }

  const parts = [];
  if (localReport.overallWeekMood) {
    parts.push(`week reads ${localReport.overallWeekMood}`);
  }
  if (localReport.waterTempFeel) {
    parts.push(`water feels ${localReport.waterTempFeel}`);
  }
  if (localReport.waterClarity) {
    parts.push(`clarity is ${localReport.waterClarity}`);
  }
  return parts.join(", ");
}

function getSpotSpecificReportNote(localReport, spotKey) {
  if (!localReport) {
    return null;
  }

  if (spotKey === "santa_barbara") {
    return localReport.stearnsWharfNotes || null;
  }

  if (spotKey === "goleta") {
    return localReport.goletaNotes || null;
  }

  return null;
}

function evaluateLocalReport(localReport, spotKey, targetDate) {
  if (!localReport || !Array.isArray(localReport.appliesTo) || !localReport.appliesTo.includes(spotKey)) {
    return {
      active: false,
      scoreAdjustment: 0,
      baitfishAdjustment: 0,
      waterTempAdjustment: 0,
      clarityAdjustment: 0,
      weekMoodAdjustment: 0,
      manualAdjustment: 0,
      confidence: "low",
      stale: false,
      ageDays: null,
      method: null,
      note: null,
    };
  }

  const ageDays = localReport.weekOf ? dayDifference(localReport.weekOf, targetDate) : 0;
  const recencyMultiplier = ageDays > 10 ? 0.45 : ageDays > 7 ? 0.7 : 1;
  const multiplier = confidenceMultiplier(localReport.confidence) * recencyMultiplier;
  const baitfishMap = {
    low: -18,
    moderate: 0,
    high: 10,
  };
  const waterTempMap = {
    cold: -4,
    seasonal: 0,
    warm: 2,
  };
  const clarityMap = {
    poor: -3,
    fair: -1,
    good: 1,
  };
  const moodMap = {
    slow: -2,
    fair: 0,
    improving: 2,
    active: 4,
  };
  const manualAdjustment = Number(localReport.scoreAdjustment) || 0;
  const waterTempAdjustment = waterTempMap[localReport.waterTempFeel] || 0;
  const clarityAdjustment = clarityMap[localReport.waterClarity] || 0;
  const weekMoodAdjustment = moodMap[localReport.overallWeekMood] || 0;
  const combinedScoreAdjustment = manualAdjustment + waterTempAdjustment + clarityAdjustment + weekMoodAdjustment;
  const scaledScoreAdjustment = Math.round(combinedScoreAdjustment * multiplier);
  const scaledBaitfishAdjustment = Math.round(((baitfishMap[localReport.baitfishActivity] || 0) + (localReport.waterTempFeel === "cold" ? -10 : 0)) * multiplier);

  return {
    active: true,
    scoreAdjustment: Math.max(-14, Math.min(10, scaledScoreAdjustment)),
    baitfishAdjustment: Math.max(-28, Math.min(12, scaledBaitfishAdjustment)),
    waterTempAdjustment: Math.round(waterTempAdjustment * multiplier),
    clarityAdjustment: Math.round(clarityAdjustment * multiplier),
    weekMoodAdjustment: Math.round(weekMoodAdjustment * multiplier),
    manualAdjustment: Math.round(manualAdjustment * multiplier),
    confidence: localReport.confidence || "medium",
    stale: ageDays > 7,
    ageDays,
    method: localReport.productiveMethod || null,
    note: getSpotSpecificReportNote(localReport, spotKey),
  };
}

function describeLocalAdjustment(adjustment) {
  if (adjustment > 0) {
    return `Local read +${adjustment}`;
  }
  if (adjustment < 0) {
    return `Local read ${adjustment}`;
  }
  return "Local read even";
}

function formatTidePhase(phase) {
  if (phase === "incoming") {
    return "Incoming";
  }
  if (phase === "outgoing") {
    return "Outgoing";
  }
  return "Balanced";
}

function renderLocalReportCard(dayData) {
  const localReport = dayData.localReport;
  if (!localReport) {
    localReportCard.hidden = true;
    localReportCard.innerHTML = "";
    return;
  }

  const influence = evaluateLocalReport(localReport, dayData.spotKey, dayData.date);
  if (!influence.active) {
    localReportCard.hidden = true;
    localReportCard.innerHTML = "";
    return;
  }
  const adjustmentClass = influence.scoreAdjustment > 0 ? "adjustment-positive" : influence.scoreAdjustment < 0 ? "adjustment-negative" : "adjustment-neutral";
  const speciesLine = Array.isArray(localReport.topReportedSpecies) && localReport.topReportedSpecies.length
    ? `Reported species this week: ${localReport.topReportedSpecies.join(", ")}.`
    : "";
  const summaryBits = [summarizeWaterFeel(localReport), speciesLine].filter(Boolean).join(" ");
  const reasonLine = Array.isArray(localReport.why) && localReport.why.length ? localReport.why.join(" ") : "";
  const methodLine = localReport.productiveMethod ? `Local method bias: ${localReport.productiveMethod}.` : "";
  const staleLine = influence.stale ? `This report is ${influence.ageDays} days old, so its effect is slightly damped.` : "";
  const spotNote = influence.note || "";

  localReportCard.hidden = false;
  localReportCard.innerHTML = `
    <h3>This Week's Local Read</h3>
    <p>${summaryBits || "A local weekly read is loaded for this spot."}</p>
    ${reasonLine ? `<p>${reasonLine}</p>` : ""}
    ${methodLine ? `<p>${methodLine}</p>` : ""}
    ${spotNote ? `<p>${spotNote}</p>` : ""}
    ${staleLine ? `<p>${staleLine}</p>` : ""}
    <div class="local-report-meta">
      <span class="local-pill ${adjustmentClass}">${describeLocalAdjustment(influence.scoreAdjustment)}</span>
      <span class="local-pill confidence">Confidence ${localReport.confidence || "medium"}</span>
      <span class="local-pill confidence">Week of ${localReport.weekOf || "unknown"}</span>
    </div>
  `;
}

function renderReferences(source, station, localReport) {
  references.innerHTML = "";

  references.append(
    createReferenceCard(
      "NOAA CO-OPS Tides",
      `Tide predictions and 30-minute tide curve data come from NOAA CO-OPS. Station in use: ${station}.`,
      source && source.tides ? source.tides : "https://api.tidesandcurrents.noaa.gov/api/prod/",
    ),
    createReferenceCard(
      "National Weather Service API",
      "Wind and wave-height conditions come from the National Weather Service forecast grid API.",
      source && source.weather ? source.weather : "https://api.weather.gov",
    ),
    createReferenceCard(
      "NOAA NDBC Buoy Data",
      "Recent water temperature and swell-period context come from the nearby NOAA buoy used to temper the daily score.",
      source && source.buoy ? source.buoy : "https://www.ndbc.noaa.gov/",
    ),
    createReferenceCard(
      "NOAA Solar Calculations",
      "Sunrise and sunset are calculated locally using NOAA solar calculation formulas.",
      "https://gml.noaa.gov/grad/solcalc/",
    ),
  );

  if (localReport) {
    references.append(
      createReferenceCard(
        "Weekly Local Fishing Report Layer",
        `A manually curated weekly report in data/local-report.json is used to nudge scores and method advice. Week of ${localReport.weekOf || "unknown"}.`,
        null,
      ),
    );
  }
}

function renderDayVisual(dayData, recommendation) {
  dayVisual.hidden = false;

  const sunrisePercent = dayData.sunTimes.sunrise ? percentOfDay(dayData.sunTimes.sunrise) : null;
  const sunsetPercent = dayData.sunTimes.sunset ? percentOfDay(dayData.sunTimes.sunset) : null;
  const startPercent = percentOfDay(recommendation.start);
  const endPercent = percentOfDay(recommendation.end);
  const highPercent = percentOfDay(recommendation.highTime);

  const daylightLeft = sunrisePercent === null ? 0 : sunrisePercent;
  const daylightWidth = sunrisePercent === null || sunsetPercent === null ? 0 : Math.max(0, sunsetPercent - sunrisePercent);
  const windowWidth = Math.max(2, endPercent - startPercent);

  dayVisual.innerHTML = `
    <h3>Best Window vs Daylight</h3>
    <p>The blue band is the top recommendation window. The lighter band shows daylight between sunrise and sunset.</p>
    <div class="timeline" aria-label="Selected day fishing window and daylight timeline">
      <div class="timeline-daylight" style="left:${daylightLeft}%; width:${daylightWidth}%;"></div>
      <div class="timeline-window" style="left:${startPercent}%; width:${windowWidth}%;"></div>
      <div class="timeline-marker" style="left:${highPercent}%;"></div>
    </div>
    <div class="timeline-labels">
      <span>12 AM</span>
      <span>12 PM</span>
      <span>11:59 PM</span>
    </div>
    <div class="timeline-legend">
      <span><i class="timeline-dot daylight"></i>Daylight</span>
      <span><i class="timeline-dot window"></i>Best window</span>
      <span>Peak tide at ${formatTime(recommendation.highTime)}</span>
    </div>
  `;
}

function setBanner(state, message) {
  loadingBanner.hidden = !message;
  loadingBanner.className = `loading-banner${state ? ` ${state}` : ""}`;
  loadingBanner.textContent = message || "";
}

function setLoadingState(message) {
  setBanner("loading", message);
}

function setSuccessState(message) {
  setBanner("success", message);
}

function setErrorState(message) {
  setBanner("error", message);
}

function confidenceLabel(score) {
  if (score >= 78) {
    return "High";
  }
  if (score >= 62) {
    return "Medium";
  }
  return "Low";
}

function baitfishLabel(score) {
  if (score >= 92) {
    return "Hot";
  }
  if (score >= 78) {
    return "Good";
  }
  if (score >= 62) {
    return "Fair";
  }
  return "Slow";
}

function averageSeriesValue(entries, rangeStart, rangeEnd) {
  const matches = entries.filter((entry) => {
    const start = parseDateValue(entry.start);
    const end = parseDateValue(entry.end);
    return end > rangeStart && start < rangeEnd && entry.value !== null;
  });

  if (matches.length === 0) {
    return null;
  }

  const total = matches.reduce((sum, entry) => sum + Number(entry.value), 0);
  return total / matches.length;
}

function overlapMinutes(rangeAStart, rangeAEnd, rangeBStart, rangeBEnd) {
  const start = Math.max(rangeAStart.getTime(), rangeBStart.getTime());
  const end = Math.min(rangeAEnd.getTime(), rangeBEnd.getTime());
  return Math.max(0, (end - start) / 60000);
}

function buildWindowConditions(weatherSeries, sunTimes, windowStart, windowEnd) {
  const sunrise = sunTimes.sunrise ? parseDateValue(sunTimes.sunrise) : null;
  const sunset = sunTimes.sunset ? parseDateValue(sunTimes.sunset) : null;
  const sunriseWindowStart = sunrise ? new Date(sunrise.getTime() - 60 * 60 * 1000) : null;
  const sunriseWindowEnd = sunrise ? new Date(sunrise.getTime() + 60 * 60 * 1000) : null;
  const sunsetWindowStart = sunset ? new Date(sunset.getTime() - 60 * 60 * 1000) : null;
  const sunsetWindowEnd = sunset ? new Date(sunset.getTime() + 60 * 60 * 1000) : null;
  const daylightMinutes = sunrise && sunset ? overlapMinutes(windowStart, windowEnd, sunrise, sunset) : 0;
  const totalWindowMinutes = Math.max(1, (windowEnd.getTime() - windowStart.getTime()) / 60000);

  return {
    windSpeedMph: averageSeriesValue(weatherSeries.windSpeedMph || [], windowStart, windowEnd),
    windDirectionDegrees: averageSeriesValue(weatherSeries.windDirectionDegrees || [], windowStart, windowEnd),
    waveHeightFeet: averageSeriesValue(weatherSeries.waveHeightFeet || [], windowStart, windowEnd),
    sunriseOverlapMinutes: sunriseWindowStart ? overlapMinutes(windowStart, windowEnd, sunriseWindowStart, sunriseWindowEnd) : 0,
    sunsetOverlapMinutes: sunsetWindowStart ? overlapMinutes(windowStart, windowEnd, sunsetWindowStart, sunsetWindowEnd) : 0,
    daylightMinutes,
    daylightRatio: daylightMinutes / totalWindowMinutes,
  };
}

function scoreWind(windSpeedMph) {
  if (windSpeedMph === null) {
    return 10;
  }
  if (windSpeedMph <= 5) {
    return 20;
  }
  if (windSpeedMph <= 9) {
    return 17;
  }
  if (windSpeedMph <= 13) {
    return 13;
  }
  if (windSpeedMph <= 18) {
    return 8;
  }
  return 3;
}

function scoreWaveHeight(waveHeightFeet) {
  if (waveHeightFeet === null) {
    return 10;
  }
  if (waveHeightFeet <= 1.5) {
    return 20;
  }
  if (waveHeightFeet <= 3) {
    return 16;
  }
  if (waveHeightFeet <= 4.5) {
    return 10;
  }
  if (waveHeightFeet <= 6) {
    return 5;
  }
  return 1;
}

function scoreLight(sunriseOverlapMinutes, sunsetOverlapMinutes) {
  const overlap = Math.max(sunriseOverlapMinutes, sunsetOverlapMinutes);
  if (overlap >= 90) {
    return 15;
  }
  if (overlap >= 45) {
    return 10;
  }
  if (overlap > 0) {
    return 6;
  }
  return 0;
}

function scoreDaylightPreference(daylightRatio, lightScore) {
  if (daylightRatio >= 0.9) {
    return 12;
  }
  if (daylightRatio >= 0.65) {
    return 8;
  }
  if (daylightRatio >= 0.4) {
    return 4;
  }
  if (daylightRatio >= 0.2) {
    return 0;
  }
  if (lightScore > 0) {
    return -4;
  }
  return -12;
}

function applyDaylightPriority(recommendations) {
  const hasStrongDaylightOption = recommendations.some(
    (recommendation) =>
      recommendation.conditions.daylightRatio >= 0.5 ||
      recommendation.lightScore >= 6,
  );

  return recommendations.map((recommendation) => {
    if (!hasStrongDaylightOption) {
      return {
        ...recommendation,
        daylightAlternativePenalty: 0,
        score: recommendation.score,
        rating: describeRating(recommendation.score),
      };
    }

    let daylightAlternativePenalty = 0;

    if (recommendation.conditions.daylightRatio < 0.15) {
      daylightAlternativePenalty = -18;
    } else if (recommendation.conditions.daylightRatio < 0.35) {
      daylightAlternativePenalty = -10;
    } else if (recommendation.conditions.daylightRatio < 0.5) {
      daylightAlternativePenalty = -4;
    }

    const score = Math.max(22, Math.min(86, recommendation.score + daylightAlternativePenalty));

    return {
      ...recommendation,
      daylightAlternativePenalty,
      score,
      rating: describeRating(score),
    };
  });
}

function computeWaterStability(recommendation) {
  const rules = SPOT_RULES[recommendation.spotKey] || SPOT_RULES.santa_barbara;
  const wind = recommendation.conditions.windSpeedMph;
  const wave = recommendation.conditions.waveHeightFeet;
  let score = 18;
  const reasons = [];

  if (wind === null) {
    score += 2;
  } else if (wind <= 6) {
    score += 10;
    reasons.push("light wind");
  } else if (wind <= 10) {
    score += 6;
    reasons.push("manageable wind");
  } else if (wind <= 14) {
    score += 1;
  } else if (wind <= 18) {
    score -= 6;
    reasons.push("wind starting to push surface water");
  } else {
    score -= 12;
    reasons.push("strong wind likely dirties the water");
  }

  if (wave === null) {
    score += 1;
  } else if (wave <= 1.5) {
    score += 8;
    reasons.push("calmer swell");
  } else if (wave <= 3) {
    score += 4;
  } else if (wave <= 4.5) {
    score -= 1;
  } else if (wave <= 6) {
    score -= 8;
    reasons.push("rougher near-pier water");
  } else {
    score -= 12;
    reasons.push("heavy swell");
  }

  if (rules.exposure === "high") {
    if (wind !== null && wind > 12) {
      score -= 5;
      reasons.push("Goleta is exposed to wind");
    }
    if (wave !== null && wave > 3.5) {
      score -= 5;
      reasons.push("Goleta gets turbulent fast with swell");
    }
    if (recommendation.tidePhase === "outgoing" && ((wind !== null && wind > 10) || (wave !== null && wave > 3))) {
      score -= 5;
      reasons.push("outgoing flow looks turbulent");
    }
  } else {
    if (recommendation.localInfluence && recommendation.localInfluence.clarityAdjustment < 0) {
      score += recommendation.localInfluence.clarityAdjustment;
      reasons.push("local report says the water is dirty");
    }
  }

  if (recommendation.localInfluence && recommendation.localInfluence.clarityAdjustment < 0 && rules.exposure === "high") {
    score += recommendation.localInfluence.clarityAdjustment * 1.5;
    reasons.push("local dirty-water report matters more here");
  }

  const boundedScore = Math.max(4, Math.min(36, Math.round(score)));
  let label = "Stable";
  if (boundedScore < 16) {
    label = "Turbulent";
  } else if (boundedScore < 25) {
    label = "Marginal";
  }

  return {
    score: boundedScore,
    label,
    note: reasons.length ? reasons.slice(0, 2).join(", ") : "no strong stability warnings",
  };
}

function computeSpotAdjustments(recommendation, baseBaitfishScore) {
  const rules = SPOT_RULES[recommendation.spotKey] || SPOT_RULES.santa_barbara;
  let tideDirectionAdjustment = 0;
  let baitPresenceAdjustment = 0;
  let sabikiCurrentPenalty = 0;
  const reasons = [];
  const isSummer = getSeason(recommendation.highTime) === "summer";
  const highHour = parseDateValue(recommendation.highTime).getHours();
  const isEvening = highHour >= 17 && highHour <= 21;
  const moderateIncoming =
    recommendation.averageSwing >= rules.moderateIncomingRange[0] &&
    recommendation.averageSwing <= rules.moderateIncomingRange[1];

  if (recommendation.spotKey === "santa_barbara") {
    if (recommendation.tidePhase === "incoming") {
      tideDirectionAdjustment += rules.incomingBonus;
      reasons.push("incoming tide usually fishes better here");
      if (isSummer && isEvening) {
        tideDirectionAdjustment += rules.summerEveningIncomingBonus;
        reasons.push("summer evening incoming tide bonus");
      }
    } else if (recommendation.tidePhase === "outgoing") {
      tideDirectionAdjustment += rules.outgoingPenalty;
    }

    if (recommendation.averageSwing >= rules.hugeSwingPenaltyThreshold && baseBaitfishScore >= 52) {
      sabikiCurrentPenalty += rules.hugeSwingPenalty;
      reasons.push("huge swing may make sabiki harder to fish");
    }
  }

  if (recommendation.spotKey === "goleta") {
    if (recommendation.tidePhase === "incoming" && moderateIncoming && recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 10) {
      tideDirectionAdjustment += rules.incomingBonus + 2;
      reasons.push("moderate incoming with low wind looks more stable");
    }

    if (recommendation.tidePhase === "outgoing" && ((recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph > 10) || (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet > 3))) {
      tideDirectionAdjustment += rules.outgoingPenalty;
      reasons.push("outgoing flow looks overly turbulent for Goleta");
    }

    if (baseBaitfishScore < 45) {
      baitPresenceAdjustment -= 6;
      reasons.push("bait schools matter more than tide direction here");
    } else if (baseBaitfishScore >= 72) {
      baitPresenceAdjustment += 2;
    }
  }

  return {
    tideDirectionAdjustment,
    baitPresenceAdjustment,
    sabikiCurrentPenalty,
    reasons,
  };
}

function computeBaitfishIndex(recommendation) {
  let score = 28;

  if (recommendation.lightScore >= 10) {
    score += 16;
  } else if (recommendation.lightScore >= 6) {
    score += 9;
  }

  if (recommendation.averageSwing >= 2) {
    score += 14;
  } else if (recommendation.averageSwing >= 1.2) {
    score += 7;
  }

  if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 10) {
    score += 10;
  } else if (recommendation.conditions.windSpeedMph !== null && recommendation.conditions.windSpeedMph <= 15) {
    score += 5;
  }

  if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 4) {
    score += 10;
  } else if (recommendation.conditions.waveHeightFeet !== null && recommendation.conditions.waveHeightFeet <= 5.5) {
    score += 4;
  }

  if (recommendation.buoyConditions && recommendation.buoyConditions.waterTempF !== null) {
    if (recommendation.buoyConditions.waterTempF < 58) {
      score -= 14;
    } else if (recommendation.buoyConditions.waterTempF < 60) {
      score -= 8;
    } else if (recommendation.buoyConditions.waterTempF < 62) {
      score -= 3;
    }
  }

  const finalScore = Math.min(100, Math.round(score));
  return {
    score: finalScore,
    label: baitfishLabel(finalScore),
  };
}

function applySpotSpeciesAdjustments(species, recommendation) {
  return species
    .map((entry) => {
      let score = entry.score;
      const reasons = [...entry.reasons];

      if (recommendation.spotKey === "santa_barbara" && recommendation.tidePhase === "incoming") {
        if (entry.key === "mackerel") {
          score += 8;
          reasons.push("Stearns incoming tide bonus");
        }
        if (entry.key === "halibut") {
          score += 6;
          reasons.push("incoming tide helps halibut here");
        }
        if (entry.key === "jacksmelt") {
          score += 3;
        }
      }

      if (
        recommendation.spotKey === "santa_barbara" &&
        recommendation.tidePhase === "incoming" &&
        getSeason(recommendation.highTime) === "summer" &&
        parseDateValue(recommendation.highTime).getHours() >= 17
      ) {
        if (entry.key === "mackerel") {
          score += 6;
          reasons.push("summer evening incoming tide");
        }
      }

      if (recommendation.spotKey === "goleta" && recommendation.waterStability.label === "Turbulent") {
        if (entry.key === "halibut" || entry.key === "mackerel") {
          score -= 7;
          reasons.push("Goleta looks too turbulent");
        }
      }

      if (recommendation.spotKey === "goleta" && recommendation.baitfishIndex.score < 45) {
        if (entry.key === "mackerel" || entry.key === "jacksmelt") {
          score -= 8;
          reasons.push("bait schools look thin for Goleta");
        }
      }

      return {
        ...entry,
        score: Math.max(0, Math.min(100, Math.round(score))),
        confidence: confidenceLabel(score),
        reasons: reasons.slice(0, 4),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function inferTripType(recommendation) {
  const topSpecies = recommendation.species || [];
  const baitfishIndex = recommendation.baitfishIndex || computeBaitfishIndex(recommendation);
  const localInfluence = recommendation.localInfluence || {};

  if (
    (localInfluence.scoreAdjustment || 0) <= -8 ||
    (localInfluence.baitfishAdjustment || 0) <= -14 ||
    recommendation.waterStability?.label === "Turbulent"
  ) {
    return {
      label: "Scratch Session",
      detail: "More of a cautious scouting trip than a strong bite window. Bring flexible gear and keep expectations low.",
    };
  }

  if (recommendation.sabikiCurrentPenalty <= -4 && baitfishIndex.score >= 55) {
    return {
      label: "Cast-Through Window",
      detail: "Bait may still be around, but the current looks too hard for an easy straight-down sabiki session.",
    };
  }

  if (baitfishIndex.score >= 82) {
    return {
      label: "Baitfish Window",
      detail: "Best for sabiki rigs, light baitfish action, and a fun mixed-family session.",
    };
  }

  if (topSpecies.some((species) => species.key === "bat_ray" || species.key === "leopard_shark")) {
    return {
      label: "Set-and-Wait Session",
      detail: "Better for a longer, patient bait-fishing session while waiting on rays or sharks.",
    };
  }

  if (topSpecies.some((species) => species.key === "halibut")) {
    return {
      label: "Predator Window",
      detail: "Better for live bait or artificials around cleaner, calmer water.",
    };
  }

  return {
    label: "Mixed Pier Session",
    detail: "Good general-purpose family fishing window with a few species in play.",
  };
}

function recommendBait(daySpecies, tripType, baitfishIndex, localInfluence = null) {
  const primary = daySpecies[0] ? daySpecies[0].key : null;

  if (tripType && tripType.label === "Cast-Through Window") {
    return {
      label: "Cast sabiki with squid tips",
      detail: "There may still be bait around, but the current looks too strong for an easy vertical drop, so a light cast-and-work approach fits better.",
    };
  }

  if (tripType && tripType.label === "Scratch Session") {
    return {
      label: "Small backup baits",
      detail: "This looks like a slower week, so keep it simple with shrimp, squid, and one flexible rig rather than planning around a hot baitfish bite.",
    };
  }

  if (tripType && tripType.label === "Baitfish Window") {
    return {
      label: "Sabiki with bait tips",
      detail: "Bring small sabiki rigs tipped with tiny pieces of squid for mackerel or jacksmelt style action.",
    };
  }

  if (primary === "halibut") {
    return {
      label: "Live bait or soft plastics",
      detail: "If available, try live baitfish. Otherwise bring swimbaits or flukes for a cleaner-water halibut window.",
    };
  }

  if (primary === "bat_ray" || primary === "leopard_shark") {
    return {
      label: "Cut squid or oily cut bait",
      detail: "A patient set-and-wait session is best with squid or other smelly cut bait left out for longer soaks.",
    };
  }

  if (primary === "surfperch") {
    return {
      label: "Small natural bait",
      detail: "Try shrimp pieces, sand-crab style bait, or small grubs when the water has some push.",
    };
  }

  if (baitfishIndex && baitfishIndex.score >= 78) {
    return {
      label: "Small sabiki and squid strips",
      detail: "The conditions look lively enough for baitfish, so bring small sabikis and a little squid for tipping hooks.",
    };
  }

  if (localInfluence && localInfluence.method === "cast sabiki") {
    return {
      label: "Cast sabiki with squid tips",
      detail: "Local reports favor light casts over a straight-down drop this week, so bring a small sabiki and tiny squid pieces.",
    };
  }

  if (localInfluence && localInfluence.method === "mixed" && localInfluence.scoreAdjustment <= -8) {
    return {
      label: "Simple mixed backup bait",
      detail: "The week looks suppressed overall, so bring a basic mix like shrimp and squid instead of committing to one aggressive pattern.",
    };
  }

  return {
    label: "Squid and shrimp",
    detail: "For a general family session, squid and shrimp are the most flexible starting baits across several likely species.",
  };
}

function getLocalWharfTip(spotKey, recommendation, baitRecommendation) {
  if (spotKey !== "santa_barbara") {
    return null;
  }

  if (baitRecommendation && baitRecommendation.label.toLowerCase().includes("sabiki")) {
    return "Stearns Wharf sabiki tip: locals often get more hits by making a light cast away from the pilings instead of dropping the rig straight down beside the wharf.";
  }

  if (recommendation && recommendation.tripType && recommendation.tripType.label === "Baitfish Window") {
    return "Stearns Wharf baitfish tip: if fish are flashing but not committing under the pier, cast the rig out a bit and work it back through the zone.";
  }

  return "Stearns Wharf localism: the outer end usually fishes best, and a nice-looking midday score can still underperform once the tourist traffic picks up.";
}

function inferSpeciesForWindow(recommendation) {
  return SPECIES_PROFILES
    .map((profile) => {
      const score = Math.min(100, Math.round(profile.score(recommendation)));
      const reasons = profile.reasons(recommendation);
      return {
        key: profile.key,
        label: profile.label,
        tripStyle: profile.tripStyle,
        score,
        confidence: confidenceLabel(score),
        reasons: reasons.length ? reasons : ["overall conditions are decent for a mixed pier session"],
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function summarizeDaySpecies(recommendations) {
  const totals = new Map();

  recommendations.forEach((recommendation, index) => {
    const weight = index === 0 ? 1 : 0.7;
    (recommendation.species || []).forEach((species, speciesIndex) => {
      const previous = totals.get(species.key) || {
        ...species,
        weightedScore: 0,
      };
      previous.weightedScore += species.score * weight * (speciesIndex === 0 ? 1 : 0.8);
      totals.set(species.key, previous);
    });
  });

  return Array.from(totals.values())
    .sort((left, right) => right.weightedScore - left.weightedScore)
    .slice(0, 3)
    .map((species) => ({
      ...species,
      weightedScore: Math.round(species.weightedScore),
      confidence: confidenceLabel(species.score),
    }));
}

function buildRecommendations(dayData, weatherSeries) {
  const highLowPredictions = dayData.highLowPredictions || [];
  const highs = highLowPredictions
    .map((prediction, index) => ({
      ...prediction,
      index,
      numericValue: Number(prediction.v),
    }))
    .filter((prediction) => prediction.type === "H");

  if (highs.length === 0) {
    return [];
  }

  const maxHigh = Math.max(...highs.map((prediction) => prediction.numericValue));
  const minHigh = Math.min(...highs.map((prediction) => prediction.numericValue));
  const highSpread = Math.max(maxHigh - minHigh, 0.1);

  return applyDaylightPriority(
    highs
    .map((high) => {
      const previous = highLowPredictions[high.index - 1];
      const next = highLowPredictions[high.index + 1];
      const incomingSwing = previous ? high.numericValue - Number(previous.v) : 0;
      const outgoingSwing = next ? high.numericValue - Number(next.v) : 0;
      const averageSwing = Math.max((incomingSwing + outgoingSwing) / 2, 0);
      const tideScore = Math.round(
        Math.min(45, 20 + ((high.numericValue - minHigh) / highSpread) * 15 + averageSwing * 8),
      );

      const start = parseDateValue(high.t);
      start.setHours(start.getHours() - 2);
      const end = parseDateValue(high.t);
      end.setHours(end.getHours() + 2);

      const windowConditions = buildWindowConditions(weatherSeries, dayData.sunTimes || {}, start, end);
      const tidePhase = classifyTidePhase(incomingSwing, outgoingSwing);
      const windScore = scoreWind(windowConditions.windSpeedMph);
      const waveScore = scoreWaveHeight(windowConditions.waveHeightFeet);
      const lightScore = scoreLight(windowConditions.sunriseOverlapMinutes, windowConditions.sunsetOverlapMinutes);
      const daylightScore = scoreDaylightPreference(windowConditions.daylightRatio, lightScore);
      const buoyConditions = dayData.buoyConditions || {};
      const localInfluence = evaluateLocalReport(dayData.localReport, dayData.spotKey, dayData.date);
      const waterTempPenalty =
        buoyConditions.waterTempF === null || buoyConditions.waterTempF === undefined
          ? 0
          : buoyConditions.waterTempF < 58
            ? -18
            : buoyConditions.waterTempF < 60
              ? -12
              : buoyConditions.waterTempF < 62
                ? -6
                : 0;
      const swellPenalty =
        buoyConditions.dominantPeriodSeconds === null || buoyConditions.dominantPeriodSeconds === undefined
          ? 0
          : buoyConditions.dominantPeriodSeconds >= 12
            ? -8
            : buoyConditions.dominantPeriodSeconds >= 10
              ? -4
              : 0;
      const baseBaitfishIndex = computeBaitfishIndex({
        averageSwing,
        lightScore,
        conditions: windowConditions,
        buoyConditions,
      });
      const waterStability = computeWaterStability({
        spotKey: dayData.spotKey,
        highTime: parseDateValue(high.t),
        averageSwing,
        incomingSwing,
        outgoingSwing,
        tidePhase,
        conditions: windowConditions,
        localInfluence,
      });
      const spotAdjustments = computeSpotAdjustments(
        {
          spotKey: dayData.spotKey,
          highTime: parseDateValue(high.t),
          averageSwing,
          incomingSwing,
          outgoingSwing,
          tidePhase,
          conditions: windowConditions,
          waterStability,
          localInfluence,
        },
        baseBaitfishIndex.score,
      );
      const baseWeightedScore =
        11 +
        (waterStability.score * 0.96) +
        (tideScore * 0.46) +
        (lightScore * 0.52) +
        daylightScore +
        spotAdjustments.tideDirectionAdjustment +
        spotAdjustments.baitPresenceAdjustment +
        spotAdjustments.sabikiCurrentPenalty +
        (dayData.spotKey === "goleta" ? ((baseBaitfishIndex.score - 50) * 0.14) : ((baseBaitfishIndex.score - 50) * 0.1)) +
        waterTempPenalty +
        swellPenalty;
      const baseScore = Math.max(22, Math.min(86, Math.round(baseWeightedScore)));
      const score = Math.max(22, Math.min(86, baseScore + localInfluence.scoreAdjustment));
      const baitfishScore = Math.max(0, Math.min(100, baseBaitfishIndex.score + localInfluence.baitfishAdjustment));
      const baitfishIndex = {
        score: baitfishScore,
        label: baitfishLabel(baitfishScore),
        baseScore: baseBaitfishIndex.score,
        localAdjustment: localInfluence.baitfishAdjustment,
      };
      const species = applySpotSpeciesAdjustments(inferSpeciesForWindow({
        highTime: parseDateValue(high.t),
        highHeight: high.numericValue,
        spotKey: dayData.spotKey,
        start,
        end,
        incomingSwing,
        outgoingSwing,
        averageSwing,
        tidePhase,
        tideScore,
        windScore,
        waveScore,
        lightScore,
        daylightScore,
        waterTempPenalty,
        swellPenalty,
        baseScore,
        score,
        conditions: windowConditions,
        baitfishIndex,
        buoyConditions,
        localInfluence,
        waterStability,
      }), {
        spotKey: dayData.spotKey,
        highTime: parseDateValue(high.t),
        tidePhase,
        waterStability,
        baitfishIndex,
      });
      const tripType = inferTripType({
        species,
        baitfishIndex,
        waterStability,
        sabikiCurrentPenalty: spotAdjustments.sabikiCurrentPenalty,
        localInfluence,
      });

      return {
        highTime: parseDateValue(high.t),
        highHeight: high.numericValue,
        spotKey: dayData.spotKey,
        start,
        end,
        incomingSwing,
        outgoingSwing,
        averageSwing,
        tidePhase,
        tideScore,
        windScore,
        waveScore,
        lightScore,
        daylightScore,
        waterTempPenalty,
        swellPenalty,
        waterStability,
        tideDirectionAdjustment: spotAdjustments.tideDirectionAdjustment,
        baitPresenceAdjustment: spotAdjustments.baitPresenceAdjustment,
        sabikiCurrentPenalty: spotAdjustments.sabikiCurrentPenalty,
        spotReasons: spotAdjustments.reasons,
        baseScore,
        score,
        rating: describeRating(score),
        conditions: windowConditions,
        buoyConditions,
        baitfishIndex,
        species,
        tripType,
        localInfluence,
      };
    })
  )
    .sort((left, right) => right.score - left.score);
}

function renderRecommendations(dayData, recommendations) {
  summary.innerHTML = "";
  dayBait.hidden = true;
  dayBait.innerHTML = "";
  localReportCard.hidden = true;
  localReportCard.innerHTML = "";
  dayVisual.hidden = true;
  dayVisual.innerHTML = "";

  if (recommendations.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No high-tide fishing windows were returned for this date.";
    summary.append(emptyState);
    return;
  }

  if (dayData.baitRecommendation) {
    dayBait.hidden = false;
    const localTip = getLocalWharfTip(spotSelect.value, recommendations[0], dayData.baitRecommendation);
    const localMethod = dayData.localReportInfluence && dayData.localReportInfluence.method ? `Local report method this week: ${dayData.localReportInfluence.method}.` : "";
    dayBait.innerHTML = `<strong>Best bait for this day: ${dayData.baitRecommendation.label}</strong><span>${dayData.baitRecommendation.detail}</span>${localMethod ? `<span>${localMethod}</span>` : ""}${localTip ? `<span>${localTip}</span>` : ""}`;
  }

  renderLocalReportCard(dayData);
  renderDayVisual(dayData, recommendations[0]);

  const lowest = (dayData.highLowPredictions || [])
    .filter((prediction) => prediction.type === "L")
    .map((prediction) => Number(prediction.v));

  recommendations.forEach((recommendation, index) => {
    const fragment = template.content.cloneNode(true);
    const title = fragment.querySelector(".window-title");
    const label = fragment.querySelector(".window-label");
    const copy = fragment.querySelector(".window-copy");
    const facts = fragment.querySelector(".facts");
    const badge = fragment.querySelector(".badge");
    const nearestLow = lowest.length ? Math.min(...lowest) : 0;
    const lightWindow =
      recommendation.conditions.sunriseOverlapMinutes > 0
        ? "Overlaps sunrise"
        : recommendation.conditions.sunsetOverlapMinutes > 0
          ? "Overlaps sunset"
          : "No dawn/dusk overlap";

    label.textContent = index === 0 ? "Top recommendation" : "Also worth watching";
    title.textContent = `${formatTime(recommendation.start)} to ${formatTime(recommendation.end)}`;
    badge.textContent = `${recommendation.rating.label} ${recommendation.score}`;
    badge.classList.add(recommendation.rating.className);
    copy.textContent =
      `Centered on the ${formatDateTime(recommendation.highTime)} high tide. ` +
      `Most likely species: ${recommendation.species.map((species) => species.label).join(", ")}. ` +
      `${recommendation.tripType.label}. ` +
      `Score breakdown: Stability ${recommendation.waterStability.score} + Tide ${recommendation.tideScore}${recommendation.tideDirectionAdjustment ? ` + Phase ${recommendation.tideDirectionAdjustment}` : ""}${recommendation.baitPresenceAdjustment ? ` + Bait ${recommendation.baitPresenceAdjustment}` : ""}${recommendation.sabikiCurrentPenalty ? ` + Current ${recommendation.sabikiCurrentPenalty}` : ""} + Light ${recommendation.lightScore}${recommendation.daylightScore ? ` + Daylight ${recommendation.daylightScore}` : ""}${recommendation.daylightAlternativePenalty ? ` + Daylight priority ${recommendation.daylightAlternativePenalty}` : ""}${recommendation.waterTempPenalty ? ` + Temp ${recommendation.waterTempPenalty}` : ""}${recommendation.swellPenalty ? ` + Swell ${recommendation.swellPenalty}` : ""} + Local ${recommendation.localInfluence.scoreAdjustment}.`;

    facts.append(
      createFact("Base score", String(recommendation.baseScore)),
      createFact("Local adjustment", recommendation.localInfluence.scoreAdjustment >= 0 ? `+${recommendation.localInfluence.scoreAdjustment}` : String(recommendation.localInfluence.scoreAdjustment)),
      createFact("Final score", String(recommendation.score)),
      createFact("High tide", `${formatTime(recommendation.highTime)} (${toFeet(recommendation.highHeight)})`),
      createFact("Tide phase", formatTidePhase(recommendation.tidePhase)),
      createFact("Incoming swing", toFeet(recommendation.incomingSwing)),
      createFact("Outgoing swing", toFeet(recommendation.outgoingSwing)),
      createFact("Water stability", `${recommendation.waterStability.label} (${recommendation.waterStability.score})`),
      createFact("Daylight fit", `${Math.round(recommendation.conditions.daylightRatio * 100)}% of window in daylight`),
      createFact("Daylight priority", recommendation.daylightAlternativePenalty ? String(recommendation.daylightAlternativePenalty) : "0"),
      createFact("Wind", `${toMph(recommendation.conditions.windSpeedMph)}${recommendation.conditions.windDirectionDegrees !== null ? ` ${degreesToCompass(recommendation.conditions.windDirectionDegrees)} (${Number(recommendation.conditions.windDirectionDegrees).toFixed(0)}°)` : ""}`),
      createFact("Wave height", toFeet(recommendation.conditions.waveHeightFeet)),
      createFact("Light window", lightWindow),
      createFact("Baitfish index", `${recommendation.baitfishIndex.label} (${recommendation.baitfishIndex.score})`),
      createFact("Trip type", recommendation.tripType.label),
      createFact("Spot rule", recommendation.spotReasons && recommendation.spotReasons.length ? recommendation.spotReasons[0] : "No major spot-specific shift"),
      createFact("Low tide context", `Day's lowest low: ${toFeet(nearestLow)}`),
      createFact("Likely species", recommendation.species.map((species) => species.label).join(", ")),
      createFact("Why", recommendation.species[0].reasons.slice(0, 2).join(", ")),
      createFact("NOAA station", dayData.station),
      createFact("Window rule", "2 hours before and after high tide"),
    );

    summary.append(fragment);
  });
}

function renderConditions(dayData, spot) {
  conditions.innerHTML = "";
  conditionsCaption.textContent = spot.notes;
  const daySpecies = dayData.daySpecies || [];
  const baitfishIndex = dayData.dayBaitfishIndex;
  const tripType = dayData.dayTripType;
  const buoyConditions = dayData.buoyConditions || {};
  const topRecommendation = dayData.recommendations && dayData.recommendations[0] ? dayData.recommendations[0] : null;
  const tideMovement = describeTideMovement(topRecommendation);

  const sunNote =
    dayData.sunTimes.sunrise && dayData.sunTimes.sunset
      ? `Sunrise ${formatTime(dayData.sunTimes.sunrise)} and sunset ${formatTime(dayData.sunTimes.sunset)} for this spot.`
      : "Sunrise or sunset could not be calculated for this date.";

  conditions.append(
    createConditionCard(
      "Average wind",
      `${toMph(dayData.dailyConditions.windSpeedMph)}${dayData.dailyConditions.windDirectionLabel ? ` ${dayData.dailyConditions.windDirectionLabel}` : ""}`,
      "Lighter wind helps keep pier fishing more comfortable and manageable.",
    ),
    createConditionCard(
      "Tide movement",
      tideMovement.value,
      tideMovement.note,
      tideMovement.variant,
      tideMovement.icon,
    ),
    createConditionCard(
      "Water stability",
      topRecommendation ? topRecommendation.waterStability.label : "Still evaluating",
      topRecommendation
        ? `${SPOT_RULES[dayData.spotKey || spotSelect.value]?.label || "This spot"} reads ${topRecommendation.waterStability.label.toLowerCase()} right now because ${topRecommendation.waterStability.note}.`
        : "A stability read will appear once the top window is scored.",
    ),
    createConditionCard(
      "Tide phase",
      topRecommendation ? formatTidePhase(topRecommendation.tidePhase) : "Still evaluating",
      topRecommendation
        ? topRecommendation.spotReasons && topRecommendation.spotReasons.length
          ? topRecommendation.spotReasons.join(". ")
          : "No major spot-specific tide-direction shift."
        : "Pick a day to see whether incoming or outgoing tide is favored.",
    ),
    createConditionCard(
      "Water temperature",
      buoyConditions.waterTempF !== null && buoyConditions.waterTempF !== undefined ? `${Number(buoyConditions.waterTempF).toFixed(1)} °F` : "Unavailable",
      buoyConditions.waterTempF !== null && buoyConditions.waterTempF !== undefined && buoyConditions.waterTempF < 60
        ? "Recent Santa Barbara buoy readings are still pretty cold, which can make even decent tide windows fish slower."
        : "Recent buoy readings help keep expectations realistic when seasonal water is still chilly.",
    ),
    createConditionCard(
      "Swell period",
      toSeconds(buoyConditions.dominantPeriodSeconds),
      buoyConditions.dominantPeriodSeconds !== null && buoyConditions.dominantPeriodSeconds !== undefined
        ? `Longer-period swell from ${toDegrees(buoyConditions.meanWaveDirectionDegrees)} can stir the water more than local wind waves alone.`
        : "Recent buoy swell timing is unavailable.",
    ),
    createConditionCard(
      "Sunrise",
      dayData.sunTimes.sunrise ? formatTime(dayData.sunTimes.sunrise) : "Unavailable",
      sunNote,
    ),
    createConditionCard(
      "Tide station",
      dayData.station,
      `${spot.name} is currently mapped to NOAA tide station ${dayData.station}.`,
    ),
    createConditionCard(
      "Likely species today",
      daySpecies.length ? daySpecies.map((species) => species.label).join(", ") : "Still evaluating",
      daySpecies.length
        ? `${daySpecies[0].label} leads with ${daySpecies[0].confidence.toLowerCase()} confidence. Best style: ${daySpecies[0].tripStyle}.`
        : "Pick a day with a stronger tide window to surface species guidance.",
    ),
    createConditionCard(
      "Baitfish index",
      baitfishIndex ? `${baitfishIndex.label} ${baitfishIndex.score}` : "Unavailable",
      baitfishIndex
        ? "Higher scores suggest better odds for sabiki-style action and a livelier mixed family trip."
        : "Waiting on a clearer signal from the day's best window.",
    ),
    createConditionCard(
      "Trip type",
      tripType ? tripType.label : "Still evaluating",
      tripType ? tripType.detail : "Trip style will appear once the day is scored.",
    ),
  );
}

function renderChart(intervalPredictions) {
  chart.innerHTML = "";

  if (!intervalPredictions || intervalPredictions.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No 30-minute tide curve is available for this day.";
    chart.append(emptyState);
    return;
  }

  const values = intervalPredictions.map((prediction) => Number(prediction.v));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(maxValue - minValue, 0.1);

  intervalPredictions.forEach((prediction, index) => {
    const bar = document.createElement("div");
    const label = document.createElement("span");
    const normalized = ((Number(prediction.v) - minValue) / spread) * 100;
    bar.className = "bar";
    bar.style.height = `${Math.max(normalized, 4)}%`;

    if (index % 4 === 0) {
      label.textContent = formatTime(prediction.t);
      bar.append(label);
    }

    chart.append(bar);
  });
}

function renderSelectedDay(date) {
  const dayData = currentWeek.find((entry) => entry.date === date);
  if (!dayData) {
    return;
  }

  selectedDate = date;
  const recommendations = buildRecommendations(dayData, currentWeatherSeries);
  const enrichedDay = {
    ...dayData,
    recommendations,
    daySpecies: summarizeDaySpecies(recommendations),
    dayBaitfishIndex: recommendations[0] ? recommendations[0].baitfishIndex : null,
    dayTripType: recommendations[0] ? recommendations[0].tripType : null,
    localReportInfluence: evaluateLocalReport(dayData.localReport, dayData.spotKey, dayData.date),
  };
  enrichedDay.baitRecommendation = recommendBait(
    enrichedDay.daySpecies,
    enrichedDay.dayTripType,
    enrichedDay.dayBaitfishIndex,
    enrichedDay.localReportInfluence,
  );
  renderRecommendations(enrichedDay, recommendations);
  renderConditions(enrichedDay, PRESET_SPOTS[spotSelect.value]);
  renderChart(dayData.intervalPredictions || []);
  statusLabel.textContent = `${PRESET_SPOTS[spotSelect.value].name} on ${formatDayLabel(date)} using NOAA station ${dayData.station}.`;

  Array.from(weekGrid.children).forEach((card) => {
    card.classList.toggle("selected", card.dataset.date === date);
  });
}

function renderWeek(spot, daysData) {
  weekGrid.innerHTML = "";

  const enrichedDays = daysData.map((dayData) => {
    const recommendations = buildRecommendations(dayData, currentWeatherSeries);
    return {
      ...dayData,
      recommendations,
      spotKey: dayData.spotKey || spot.id,
      localReport: dayData.localReport || currentLocalReport,
      daySpecies: summarizeDaySpecies(recommendations),
      dayBaitfishIndex: recommendations[0] ? recommendations[0].baitfishIndex : null,
      dayTripType: recommendations[0] ? recommendations[0].tripType : null,
      localReportInfluence: evaluateLocalReport(dayData.localReport || currentLocalReport, dayData.spotKey || spot.id, dayData.date),
      baitRecommendation: null,
      bestScore: recommendations[0] ? recommendations[0].score : 0,
      bestWindow: recommendations[0] ? `${formatTime(recommendations[0].start)}-${formatTime(recommendations[0].end)}` : "No high tide window",
      secondHighTide: recommendations[1] ? formatTime(recommendations[1].highTime) : null,
    };
  });

  enrichedDays.forEach((dayData) => {
    dayData.baitRecommendation = recommendBait(
      dayData.daySpecies,
      dayData.dayTripType,
      dayData.dayBaitfishIndex,
      dayData.localReportInfluence,
    );
  });

  currentWeek = enrichedDays;

  enrichedDays.forEach((dayData) => {
    const card = document.createElement("button");
    const dateLabel = document.createElement("p");
    const score = document.createElement("p");
    const meta = document.createElement("div");
    const tripChip = document.createElement("span");
    const baitfishChip = document.createElement("span");
    const windowLine = document.createElement("p");
    const secondLine = document.createElement("p");
    const sunLine = document.createElement("p");

    card.type = "button";
    card.className = "day-card";
    card.dataset.date = dayData.date;
    dateLabel.className = "day-date";
    score.className = "day-score";
    meta.className = "day-meta";
    tripChip.className = "day-chip trip";
    baitfishChip.className = "day-chip baitfish";
    windowLine.className = "day-window";
    secondLine.className = "day-window day-alt-window";
    sunLine.className = "day-sun";

    dateLabel.textContent = formatDayLabel(dayData.date);
    score.textContent = dayData.bestScore ? String(dayData.bestScore) : "0";
    tripChip.textContent = dayData.dayTripType ? dayData.dayTripType.label : "Mixed";
    baitfishChip.textContent = dayData.dayBaitfishIndex ? `Baitfish ${dayData.dayBaitfishIndex.label}` : "Baitfish N/A";
    windowLine.textContent = dayData.bestScore
      ? `Best window: ${dayData.bestWindow}`
      : "No strong high-tide block found";
    secondLine.textContent = dayData.secondHighTide
      ? `2nd high tide: ${dayData.secondHighTide}`
      : "2nd high tide: none";
    if (dayData.localReportInfluence && dayData.localReportInfluence.active && dayData.localReportInfluence.scoreAdjustment !== 0) {
      const adjustment = dayData.localReportInfluence.scoreAdjustment > 0 ? `+${dayData.localReportInfluence.scoreAdjustment}` : String(dayData.localReportInfluence.scoreAdjustment);
      windowLine.textContent += ` | Local ${adjustment}`;
      windowLine.classList.add("local-shift");
    }
    sunLine.innerHTML = `☀ ${dayData.sunTimes.sunrise ? formatTime(dayData.sunTimes.sunrise) : "?"}<br />☾ ${dayData.sunTimes.sunset ? formatTime(dayData.sunTimes.sunset) : "?"}`;
    meta.append(tripChip, baitfishChip);

    card.append(dateLabel, score, meta, windowLine, secondLine, sunLine);
    card.addEventListener("click", () => {
      renderSelectedDay(dayData.date);
    });
    weekGrid.append(card);
  });

  const bestDay = enrichedDays.reduce((best, day) => (!best || day.bestScore > best.bestScore ? day : best), null);
  weekStatus.textContent = bestDay
    ? `Best-looking day: ${formatDayLabel(bestDay.date)}`
    : `Loaded ${daysData.length} days`;

  const initialDate = bestDay && bestDay.bestScore > 0 ? bestDay.date : enrichedDays[0] && enrichedDays[0].date;
  if (initialDate) {
    renderSelectedDay(initialDate);
  }

  setSuccessState(
    bestDay
      ? `Loaded ${daysData.length} days for ${spot.name}. Best current score: ${bestDay.bestScore} on ${formatDayLabel(bestDay.date)}.${currentLocalReport ? ` Local weekly read from ${currentLocalReport.weekOf || "this week"} is active.` : ""}`
      : `Loaded ${daysData.length} days for ${spot.name}, but no strong high-tide windows were found.`,
  );
}

async function loadWeek(spot, startDate) {
  const requestId = ++currentRequestId;
  statusLabel.textContent = "Loading 7-day fishing plan...";
  weekStatus.textContent = "Loading this week...";
  conditionsCaption.textContent = "Waiting for forecast data";
  setLoadingState("Fetching NOAA tides, NWS conditions, and sunrise/sunset for the next 7 days...");
  summary.innerHTML = "";
  dayBait.hidden = true;
  dayBait.innerHTML = "";
  localReportCard.hidden = true;
  localReportCard.innerHTML = "";
  dayVisual.hidden = true;
  dayVisual.innerHTML = "";
  conditions.innerHTML = "";
  chart.innerHTML = "";
  weekGrid.innerHTML = "";

  try {
    const response = await fetch(`/api/week?spot=${encodeURIComponent(spot)}&start=${encodeURIComponent(startDate)}&days=7`);
    const data = await response.json();

    if (requestId !== currentRequestId) {
      return;
    }

    if (!response.ok) {
      throw new Error(data.detail ? `${data.error} ${data.detail}` : data.error || "Unable to load weekly fishing conditions.");
    }

    currentWeatherSeries = data.weatherSeries || {};
    currentLocalReport = data.localReport || null;
    renderReferences(data.source, data.station, currentLocalReport);
    renderWeek(
      data.spot,
      (data.daysData || []).map((dayData) => ({
        ...dayData,
        spotKey: data.spot && data.spot.id ? data.spot.id : spot,
        localReport: currentLocalReport,
      })),
    );
  } catch (error) {
    if (requestId !== currentRequestId) {
      return;
    }

    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = error.message;
    summary.innerHTML = "";
    summary.append(emptyState);
    statusLabel.textContent = "Unable to load conditions.";
    weekStatus.textContent = "No weekly forecast data available";
    conditionsCaption.textContent = "No forecast data available";
    currentLocalReport = null;
    renderReferences(null, PRESET_SPOTS[spot]?.station || "Unknown", null);
    setErrorState(
      `We couldn't finish loading the weekly plan. This usually means NOAA or NWS timed out, or Render couldn't reach them in time. Details: ${error.message}`,
    );
  }
}

spotSelect.addEventListener("change", () => {
  loadWeek(spotSelect.value, dateInput.value);
});

plannerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadWeek(spotSelect.value, dateInput.value);
});

dateInput.value = formatDateForInput(new Date());
loadWeek(spotSelect.value, dateInput.value);
