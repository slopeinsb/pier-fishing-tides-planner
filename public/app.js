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
    commonWindPenaltyDirections: ["W", "WSW", "SW", "SSW"],
    structureZones: ["outer end", "pilings", "harbor side"],
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
    commonWindPenaltyDirections: ["W", "WNW", "NW", "WSW", "SW"],
    structureZones: ["surfline", "mid-pier", "pipeline side", "end"],
    incomingBonus: 3,
    summerEveningIncomingBonus: 1,
    outgoingPenalty: -5,
    hugeSwingPenaltyThreshold: 3.6,
    hugeSwingPenalty: -3,
    moderateIncomingRange: [1, 2.8],
  },
};

const SPECIES_TEMP_PREFERENCES = {
  mackerel: { cold: 58, ideal: 62 },
  jacksmelt: { cold: 55, ideal: 59 },
  surfperch: { cold: 54, ideal: 57 },
  halibut: { cold: 60, ideal: 64 },
  bat_ray: { cold: 57, ideal: 61 },
  leopard_shark: { cold: 58, ideal: 62 },
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
  if (score >= 72) {
    return { label: "Standout", className: "excellent" };
  }

  if (score >= 54) {
    return { label: "Promising", className: "good" };
  }

  return { label: "Watchable", className: "fair" };
}

function ordinal(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value}st`;
  }
  if (mod10 === 2 && mod100 !== 12) {
    return `${value}nd`;
  }
  if (mod10 === 3 && mod100 !== 13) {
    return `${value}rd`;
  }
  return `${value}th`;
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function buildLocalRankLabel(rank, total) {
  if (!rank || !total) {
    return "Still ranking this week";
  }

  if (rank === 1) {
    return `Best of ${total} this week`;
  }

  if (rank === total) {
    return `Lowest of ${total} this week`;
  }

  if (rank === Math.ceil(total / 2)) {
    return "Middle of this week's pack";
  }

  return `${ordinal(rank)} of ${total} this week`;
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

function getDirectionPenalty(spotKey, windDirectionDegrees, windSpeedMph) {
  if (windDirectionDegrees === null || windSpeedMph === null || windSpeedMph < 9) {
    return { score: 0, note: "wind direction is not a major factor" };
  }

  const rules = SPOT_RULES[spotKey] || SPOT_RULES.santa_barbara;
  const compass = degreesToCompass(windDirectionDegrees);

  if (rules.commonWindPenaltyDirections.includes(compass)) {
    const penalty = rules.exposure === "high" ? -6 : -3;
    return {
      score: penalty,
      note: `${compass} wind can make this pier fish rougher`,
    };
  }

  return { score: 1, note: `${compass || "variable"} wind direction is not a major penalty` };
}

function computeSwellEnergy(spotKey, conditions, buoyConditions = {}) {
  const rules = SPOT_RULES[spotKey] || SPOT_RULES.santa_barbara;
  const height = buoyConditions.significantWaveHeightFeet ?? conditions.waveHeightFeet;
  const swellHeight = buoyConditions.swellHeightFeet;
  const windWaveHeight = buoyConditions.windWaveHeightFeet;
  const period = buoyConditions.swellPeriodSeconds ?? buoyConditions.dominantPeriodSeconds;
  const steepness = buoyConditions.waveSteepness;
  let score = 22;
  const reasons = [];

  if (height !== null && height !== undefined) {
    if (height <= 2) {
      score += 6;
      reasons.push("low wave height");
    } else if (height <= 3.5) {
      score += 2;
    } else if (height <= 5) {
      score -= 5;
      reasons.push("elevated wave height");
    } else {
      score -= 11;
      reasons.push("heavy wave height");
    }
  }

  if (period !== null && period !== undefined) {
    if (period >= 13) {
      score -= 8;
      reasons.push("long-period swell can stir nearshore water");
    } else if (period >= 10) {
      score -= 4;
      reasons.push("moderate swell period");
    } else if (period >= 6) {
      score += 2;
    }
  }

  if (windWaveHeight !== null && windWaveHeight !== undefined && swellHeight !== null && swellHeight !== undefined && windWaveHeight > swellHeight) {
    score -= rules.exposure === "high" ? 5 : 3;
    reasons.push("local wind waves are stronger than the groundswell");
  }

  if (steepness && steepness.includes("steep")) {
    score -= rules.exposure === "high" ? 7 : 4;
    reasons.push("steeper waves point to choppier water");
  }

  if (rules.exposure === "high" && height !== null && height !== undefined && height > 3) {
    score -= 4;
    reasons.push("Goleta is more exposed to swell");
  }

  const boundedScore = clamp(Math.round(score), 4, 34);
  let label = "Clean";
  if (boundedScore < 14) {
    label = "Messy";
  } else if (boundedScore < 23) {
    label = "Mixed";
  }

  return {
    score: boundedScore,
    label,
    note: reasons.length ? reasons.slice(0, 2).join(", ") : "swell energy looks manageable",
  };
}

function computeClarityRisk(spotKey, conditions, buoyConditions = {}, localInfluence = {}) {
  const rules = SPOT_RULES[spotKey] || SPOT_RULES.santa_barbara;
  const wind = conditions.windSpeedMph;
  const wave = buoyConditions.significantWaveHeightFeet ?? conditions.waveHeightFeet;
  const period = buoyConditions.swellPeriodSeconds ?? buoyConditions.dominantPeriodSeconds;
  let risk = 18;
  const reasons = [];

  if (wind !== null && wind !== undefined && wind > 14) {
    risk += rules.exposure === "high" ? 14 : 9;
    reasons.push("strong wind can dirty the water");
  } else if (wind !== null && wind !== undefined && wind > 10) {
    risk += rules.exposure === "high" ? 8 : 5;
  }

  if (wave !== null && wave !== undefined && wave > 4) {
    risk += 12;
    reasons.push("larger surf can stir sediment");
  } else if (wave !== null && wave !== undefined && wave > 3) {
    risk += 7;
  }

  if (period !== null && period !== undefined && period >= 12) {
    risk += 8;
    reasons.push("longer-period swell can reach the bottom harder");
  }

  if ((localInfluence.clarityAdjustment || 0) < 0) {
    risk += 12;
    reasons.push("local report flags poorer clarity");
  }

  if (spotKey === "goleta") {
    risk += 4;
  }

  const boundedRisk = clamp(Math.round(risk), 0, 100);
  let label = "Low";
  if (boundedRisk >= 55) {
    label = "High";
  } else if (boundedRisk >= 34) {
    label = "Moderate";
  }

  return {
    score: boundedRisk,
    penalty: label === "High" ? -9 : label === "Moderate" ? -4 : 1,
    label,
    note: reasons.length ? reasons.slice(0, 2).join(", ") : "no major clarity warning from wind or swell",
  };
}

function scoreTemperatureForSpecies(speciesKey, waterTempF) {
  const preference = SPECIES_TEMP_PREFERENCES[speciesKey];
  if (!preference || waterTempF === null || waterTempF === undefined) {
    return { adjustment: 0, label: "Unknown" };
  }

  if (waterTempF >= preference.ideal) {
    return { adjustment: 7, label: "Favorable" };
  }
  if (waterTempF >= preference.cold) {
    return { adjustment: 1, label: "Usable" };
  }
  return { adjustment: -9, label: "Cold" };
}

function computeBaitfishConfidence(baitfishIndex, localInfluence = {}, clarityRisk = null, swellEnergy = null) {
  let score = baitfishIndex ? baitfishIndex.score : 35;
  const reasons = [];

  if ((localInfluence.baitfishAdjustment || 0) > 0) {
    score += 8;
    reasons.push("local report supports bait presence");
  }
  if ((localInfluence.baitfishAdjustment || 0) < 0) {
    score -= 10;
    reasons.push("local report says bait is thin");
  }
  if (clarityRisk && clarityRisk.label === "High") {
    score -= 12;
    reasons.push("dirty-water risk lowers bait confidence");
  }
  if (swellEnergy && swellEnergy.label === "Messy") {
    score -= 8;
    reasons.push("messier swell lowers bait confidence");
  }

  const boundedScore = clamp(Math.round(score), 0, 100);
  let label = "Low";
  if (boundedScore >= 76) {
    label = "High";
  } else if (boundedScore >= 56) {
    label = "Medium";
  }

  return {
    score: boundedScore,
    label,
    note: reasons.length ? reasons.slice(0, 2).join(", ") : "bait confidence is based on conditions rather than a direct live report",
  };
}

function recommendPierZone(spotKey, recommendation) {
  if (spotKey === "goleta") {
    if (recommendation.waterStability?.label === "Turbulent" || recommendation.clarityRisk?.label === "High") {
      return { label: "Mid-pier only if it settles", detail: "Goleta is exposed, so avoid reading a strong tide as enough by itself." };
    }
    if (recommendation.tidePhase === "incoming" && recommendation.baitfishConfidence?.label !== "Low") {
      return { label: "Mid-pier to end", detail: "Moderate incoming water with bait support fits Goleta best." };
    }
    return { label: "Surfline or mid-pier", detail: "Keep the plan flexible until bait or cleaner water shows." };
  }

  if (recommendation.baitfishConfidence?.label === "High" || recommendation.tripType?.label === "Baitfish Window") {
    return { label: "Outer end", detail: "Stearns usually favors the outer end for sabiki and baitfish-style fishing." };
  }
  if (recommendation.tripType?.label === "Predator Window") {
    return { label: "Outer end edges", detail: "Cleaner moving water near the outer-end edges fits live bait or lure work." };
  }
  return { label: "Outer end first", detail: "Start where the wharf has the most depth and adjust if you see bait flashing elsewhere." };
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
    low: -10,
    moderate: 0,
    high: 6,
  };
  const waterTempMap = {
    cold: -3,
    seasonal: 0,
    warm: 1,
  };
  const clarityMap = {
    poor: -3,
    fair: -1,
    good: 1,
  };
  const moodMap = {
    slow: -3,
    fair: 0,
    improving: 2,
    active: 3,
  };
  const manualAdjustment = Number(localReport.scoreAdjustment) || 0;
  const waterTempAdjustment = waterTempMap[localReport.waterTempFeel] || 0;
  const clarityAdjustment = clarityMap[localReport.waterClarity] || 0;
  const weekMoodAdjustment = moodMap[localReport.overallWeekMood] || 0;
  const combinedScoreAdjustment = manualAdjustment + waterTempAdjustment + clarityAdjustment + weekMoodAdjustment;
  const scaledScoreAdjustment = Math.round(combinedScoreAdjustment * multiplier);
  const scaledBaitfishAdjustment = Math.round(((baitfishMap[localReport.baitfishActivity] || 0) + (localReport.waterTempFeel === "cold" ? -6 : 0)) * multiplier);

  return {
    active: true,
    scoreAdjustment: clamp(scaledScoreAdjustment, -8, 6),
    baitfishAdjustment: clamp(scaledBaitfishAdjustment, -14, 8),
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
  if (score >= 74) {
    return "High";
  }
  if (score >= 56) {
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

    const score = clamp(recommendation.score + daylightAlternativePenalty, 18, 84);

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
  const directionPenalty = getDirectionPenalty(recommendation.spotKey, recommendation.conditions.windDirectionDegrees, wind);
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

  score += directionPenalty.score;
  if (directionPenalty.score < 0) {
    reasons.push(directionPenalty.note);
  }

  if (recommendation.swellEnergy) {
    if (recommendation.swellEnergy.label === "Messy") {
      score -= rules.exposure === "high" ? 8 : 5;
      reasons.push(recommendation.swellEnergy.note);
    } else if (recommendation.swellEnergy.label === "Clean") {
      score += 3;
    }
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
      score -= 10;
    } else if (recommendation.buoyConditions.waterTempF < 60) {
      score -= 6;
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

      const tempFit = scoreTemperatureForSpecies(entry.key, recommendation.buoyConditions?.waterTempF);
      score += tempFit.adjustment;
      if (tempFit.label === "Cold") {
        reasons.push(`${entry.label} temperature fit looks cold`);
      } else if (tempFit.label === "Favorable") {
        reasons.push(`${entry.label} temperature fit looks favorable`);
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
  const baitfishConfidence = recommendation.baitfishConfidence || { label: "Low", score: baitfishIndex.score };
  const localInfluence = recommendation.localInfluence || {};

  if (
    (localInfluence.scoreAdjustment || 0) <= -8 ||
    (localInfluence.baitfishAdjustment || 0) <= -14 ||
    recommendation.waterStability?.label === "Turbulent" ||
    recommendation.clarityRisk?.label === "High"
  ) {
    return {
      label: "Scratch Session",
      detail: "More of a cautious scouting trip than a strong bite window. Bring flexible gear and keep expectations low.",
    };
  }

  if (recommendation.sabikiCurrentPenalty <= -4 && baitfishConfidence.label !== "Low") {
    return {
      label: "Cast-Through Window",
      detail: "Bait may still be around, but the current looks too hard for an easy straight-down sabiki session.",
    };
  }

  if (baitfishIndex.score >= 82 && baitfishConfidence.label === "High") {
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
            ? -8
            : buoyConditions.waterTempF < 60
              ? -5
              : buoyConditions.waterTempF < 62
                ? -2
                : 0;
      const swellPenalty =
        buoyConditions.dominantPeriodSeconds === null || buoyConditions.dominantPeriodSeconds === undefined
          ? 0
          : buoyConditions.dominantPeriodSeconds >= 12
            ? -5
            : buoyConditions.dominantPeriodSeconds >= 10
              ? -2
              : 0;
      const baseBaitfishIndex = computeBaitfishIndex({
        averageSwing,
        lightScore,
        conditions: windowConditions,
        buoyConditions,
      });
      const swellEnergy = computeSwellEnergy(dayData.spotKey, windowConditions, buoyConditions);
      const waterStability = computeWaterStability({
        spotKey: dayData.spotKey,
        highTime: parseDateValue(high.t),
        averageSwing,
        incomingSwing,
        outgoingSwing,
        tidePhase,
        conditions: windowConditions,
        localInfluence,
        swellEnergy,
      });
      const clarityRisk = computeClarityRisk(dayData.spotKey, windowConditions, buoyConditions, localInfluence);
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
      const rawWindowSignals = {
        waterStability: waterStability.score,
        swellEnergy: swellEnergy.score,
        clarityQuality: 100 - clarityRisk.score,
        tideSetup: Math.round(tideScore + ((incomingSwing + outgoingSwing) * 1.2)),
        baitOpportunity: Math.round((baseBaitfishIndex.score * 0.65) + (baitfishConfidence.score * 0.35)),
        fishableTiming: Math.round((lightScore * 1.2) + daylightScore + (windowConditions.daylightRatio * 18)),
      };
      const spotAdjustedSignals = {
        tideDirectionAdjustment: spotAdjustments.tideDirectionAdjustment,
        baitPresenceAdjustment: spotAdjustments.baitPresenceAdjustment,
        sabikiCurrentPenalty: spotAdjustments.sabikiCurrentPenalty,
        coldWaterPenalty: waterTempPenalty,
        swellPenalty,
        clarityPenalty: clarityRisk.penalty,
      };
      const rawComposite =
        (rawWindowSignals.waterStability * 0.72) +
        (rawWindowSignals.swellEnergy * 0.42) +
        (rawWindowSignals.clarityQuality * 0.12) +
        (rawWindowSignals.tideSetup * 0.42) +
        ((rawWindowSignals.baitOpportunity - 50) * (dayData.spotKey === "goleta" ? 0.18 : 0.12)) +
        (rawWindowSignals.fishableTiming * 0.78) +
        spotAdjustedSignals.tideDirectionAdjustment +
        spotAdjustedSignals.baitPresenceAdjustment +
        spotAdjustedSignals.sabikiCurrentPenalty +
        spotAdjustedSignals.coldWaterPenalty +
        spotAdjustedSignals.swellPenalty +
        spotAdjustedSignals.clarityPenalty;
      const baseScore = Math.round(rawComposite);
      const score = baseScore;
      const baitfishScore = Math.max(0, Math.min(100, baseBaitfishIndex.score + localInfluence.baitfishAdjustment));
      const baitfishIndex = {
        score: baitfishScore,
        label: baitfishLabel(baitfishScore),
        baseScore: baseBaitfishIndex.score,
        localAdjustment: localInfluence.baitfishAdjustment,
      };
      const baitfishConfidence = computeBaitfishConfidence(baitfishIndex, localInfluence, clarityRisk, swellEnergy);
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
        baitfishConfidence,
        buoyConditions,
        localInfluence,
        waterStability,
        swellEnergy,
        clarityRisk,
      }), {
        spotKey: dayData.spotKey,
        highTime: parseDateValue(high.t),
        tidePhase,
        waterStability,
        baitfishIndex,
        baitfishConfidence,
        buoyConditions,
      });
      const tripType = inferTripType({
        species,
        baitfishIndex,
        baitfishConfidence,
        waterStability,
        clarityRisk,
        sabikiCurrentPenalty: spotAdjustments.sabikiCurrentPenalty,
        localInfluence,
      });
      const pierZone = recommendPierZone(dayData.spotKey, {
        tidePhase,
        waterStability,
        clarityRisk,
        baitfishConfidence,
        tripType,
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
        swellEnergy,
        clarityRisk,
        tideDirectionAdjustment: spotAdjustments.tideDirectionAdjustment,
        baitPresenceAdjustment: spotAdjustments.baitPresenceAdjustment,
        sabikiCurrentPenalty: spotAdjustments.sabikiCurrentPenalty,
        spotReasons: spotAdjustments.reasons,
        rawWindowSignals,
        spotAdjustedSignals,
        rawComposite,
        baseScore,
        score,
        rating: describeRating(score),
        conditions: windowConditions,
        buoyConditions,
        baitfishIndex,
        baitfishConfidence,
        species,
        tripType,
        pierZone,
        localInfluence,
      };
    })
  )
    .sort((left, right) => right.score - left.score);
}

function relativeScoreForWeek(daysData, spotKey) {
  const recommendations = daysData
    .flatMap((dayData) => (dayData.recommendations || []).map((recommendation) => ({ dayData, recommendation })));

  if (!recommendations.length) {
    return daysData;
  }

  const rawValues = recommendations.map((entry) => entry.recommendation.rawComposite + (entry.recommendation.daylightAlternativePenalty || 0));
  const rawMedian = median(rawValues);
  const rawMin = Math.min(...rawValues);
  const rawMax = Math.max(...rawValues);
  const rawSpread = Math.max(rawMax - rawMin, 1);
  const normalizedWeekStrength = clamp((rawMedian - 20) / 28, 0, 1);
  const weekFloor = 22 + (normalizedWeekStrength * 12);
  const weekCeiling = 44 + (normalizedWeekStrength * 28);

  const rankedRecommendations = [...recommendations].sort(
    (left, right) =>
      (right.recommendation.rawComposite + (right.recommendation.daylightAlternativePenalty || 0)) -
      (left.recommendation.rawComposite + (left.recommendation.daylightAlternativePenalty || 0)),
  );

  rankedRecommendations.forEach((entry, index) => {
    const recommendation = entry.recommendation;
    const percentile = rankedRecommendations.length === 1
      ? 1
      : 1 - (index / (rankedRecommendations.length - 1));
    const effectiveRawComposite = recommendation.rawComposite + (recommendation.daylightAlternativePenalty || 0);
    const rawDelta = effectiveRawComposite - rawMedian;
    const deltaNormalized = clamp(rawDelta / Math.max(rawSpread * 0.42, 7), -1.1, 1.1);
    const relativeBase = weekFloor + (percentile * (weekCeiling - weekFloor));
    const localNudge = clamp((recommendation.localInfluence?.scoreAdjustment || 0) * 0.8, -6, 5);
    const displayScore = Math.round(clamp(relativeBase + (deltaNormalized * 8) + localNudge, 18, 84));

    Object.assign(recommendation, {
      relativeRank: index + 1,
      relativePercentile: Math.round(percentile * 100),
      effectiveRawComposite,
      rawDelta,
      displayScore,
      score: displayScore,
      rating: describeRating(displayScore),
    });
  });

  daysData.forEach((dayData) => {
    const ranked = [...(dayData.recommendations || [])].sort((left, right) => right.score - left.score);
    dayData.recommendations = ranked;
    dayData.daySpecies = summarizeDaySpecies(ranked);
    dayData.dayBaitfishIndex = ranked[0] ? ranked[0].baitfishIndex : null;
    dayData.dayTripType = ranked[0] ? ranked[0].tripType : null;
    dayData.localReportInfluence = evaluateLocalReport(dayData.localReport || currentLocalReport, dayData.spotKey || spotKey, dayData.date);
    dayData.bestScore = ranked[0] ? ranked[0].score : 0;
    dayData.bestWindow = ranked[0] ? `${formatTime(ranked[0].start)}-${formatTime(ranked[0].end)}` : "No high tide window";
    dayData.secondHighTide = ranked[1] ? formatTime(ranked[1].highTime) : null;
  });

  const rankedDays = [...daysData].sort((left, right) => right.bestScore - left.bestScore);
  rankedDays.forEach((dayData, index) => {
    dayData.dayRank = index + 1;
    dayData.relativePercentile = rankedDays.length === 1
      ? 100
      : Math.round((1 - (index / (rankedDays.length - 1))) * 100);
    dayData.localRankLabel = buildLocalRankLabel(dayData.dayRank, rankedDays.length);
  });

  return daysData;
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
      `This local index compares this window with the rest of the week's options for the same pier, then applies a small local-report nudge.`;

    facts.append(
      createFact("Local rank", `${ordinal(recommendation.relativeRank)} of ${dayData.totalWindows || recommendations.length}`),
      createFact("Raw setup", String(Math.round(recommendation.effectiveRawComposite ?? recommendation.rawComposite))),
      createFact("Local nudge", recommendation.localInfluence.scoreAdjustment >= 0 ? `+${recommendation.localInfluence.scoreAdjustment}` : String(recommendation.localInfluence.scoreAdjustment)),
      createFact("Displayed index", String(recommendation.score)),
      createFact("High tide", `${formatTime(recommendation.highTime)} (${toFeet(recommendation.highHeight)})`),
      createFact("Tide phase", formatTidePhase(recommendation.tidePhase)),
      createFact("Incoming swing", toFeet(recommendation.incomingSwing)),
      createFact("Outgoing swing", toFeet(recommendation.outgoingSwing)),
      createFact("Water stability", `${recommendation.waterStability.label} (${recommendation.waterStability.score})`),
      createFact("Swell energy", `${recommendation.swellEnergy.label} (${recommendation.swellEnergy.score})`),
      createFact("Clarity risk", `${recommendation.clarityRisk.label} (${recommendation.clarityRisk.score})`),
      createFact("Daylight fit", `${Math.round(recommendation.conditions.daylightRatio * 100)}% of window in daylight`),
      createFact("Daylight priority", recommendation.daylightAlternativePenalty ? String(recommendation.daylightAlternativePenalty) : "0"),
      createFact("Wind", `${toMph(recommendation.conditions.windSpeedMph)}${recommendation.conditions.windDirectionDegrees !== null ? ` ${degreesToCompass(recommendation.conditions.windDirectionDegrees)} (${Number(recommendation.conditions.windDirectionDegrees).toFixed(0)}°)` : ""}`),
      createFact("Wave height", toFeet(recommendation.conditions.waveHeightFeet)),
      createFact("Light window", lightWindow),
      createFact("Baitfish index", `${recommendation.baitfishIndex.label} (${recommendation.baitfishIndex.score})`),
      createFact("Bait confidence", `${recommendation.baitfishConfidence.label} (${recommendation.baitfishConfidence.score})`),
      createFact("Trip type", recommendation.tripType.label),
      createFact("Pier zone", recommendation.pierZone ? recommendation.pierZone.label : "Flexible"),
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
      "Swell energy",
      topRecommendation ? topRecommendation.swellEnergy.label : "Still evaluating",
      topRecommendation
        ? `${topRecommendation.swellEnergy.note}. This uses buoy swell/wind-wave context where available, not just the forecast wave-height number.`
        : "Swell energy will appear once the top window is scored.",
    ),
    createConditionCard(
      "Clarity risk",
      topRecommendation ? topRecommendation.clarityRisk.label : "Still evaluating",
      topRecommendation
        ? topRecommendation.clarityRisk.note
        : "Clarity risk will appear once wind, swell, and local-report context are scored.",
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
      "Bait confidence",
      topRecommendation ? `${topRecommendation.baitfishConfidence.label} ${topRecommendation.baitfishConfidence.score}` : "Unavailable",
      topRecommendation
        ? topRecommendation.baitfishConfidence.note
        : "Waiting on the baitfish confidence read.",
    ),
    createConditionCard(
      "Trip type",
      tripType ? tripType.label : "Still evaluating",
      tripType ? tripType.detail : "Trip style will appear once the day is scored.",
    ),
    createConditionCard(
      "Pier zone",
      topRecommendation && topRecommendation.pierZone ? topRecommendation.pierZone.label : "Flexible",
      topRecommendation && topRecommendation.pierZone
        ? topRecommendation.pierZone.detail
        : "The app will suggest a pier zone once a top window is scored.",
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
  const recommendations = dayData.recommendations || [];
  const enrichedDay = {
    ...dayData,
    recommendations,
    totalWindows: currentWeek.reduce((sum, entry) => sum + ((entry.recommendations || []).length), 0),
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
  statusLabel.textContent = `${PRESET_SPOTS[spotSelect.value].name} on ${formatDayLabel(date)}. ${dayData.localRankLabel || "Still ranking this week"} using NOAA station ${dayData.station}.`;

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
      baitRecommendation: null,
    };
  });

  relativeScoreForWeek(enrichedDays, spot.id);

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
    const rankLine = document.createElement("p");
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
    rankLine.className = "day-rank";
    tripChip.className = "day-chip trip";
    baitfishChip.className = "day-chip baitfish";
    windowLine.className = "day-window";
    secondLine.className = "day-window day-alt-window";
    sunLine.className = "day-sun";

    dateLabel.textContent = formatDayLabel(dayData.date);
    score.textContent = dayData.bestScore ? String(dayData.bestScore) : "0";
    rankLine.textContent = dayData.localRankLabel || "Still ranking this week";
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

    card.append(dateLabel, score, rankLine, meta, windowLine, secondLine, sunLine);
    card.addEventListener("click", () => {
      renderSelectedDay(dayData.date);
    });
    weekGrid.append(card);
  });

  const bestDay = enrichedDays.reduce((best, day) => (!best || day.bestScore > best.bestScore ? day : best), null);
  weekStatus.textContent = bestDay
    ? `Best local setup this week: ${formatDayLabel(bestDay.date)}`
    : `Loaded ${daysData.length} days`;

  const initialDate = bestDay && bestDay.bestScore > 0 ? bestDay.date : enrichedDays[0] && enrichedDays[0].date;
  if (initialDate) {
    renderSelectedDay(initialDate);
  }

  setSuccessState(
    bestDay
      ? `Loaded ${daysData.length} days for ${spot.name}. Top local setup is ${bestDay.bestScore} on ${formatDayLabel(bestDay.date)}, ranked ${bestDay.dayRank} of ${enrichedDays.length} for this pier.${currentLocalReport ? ` Local weekly read from ${currentLocalReport.weekOf || "this week"} is active as a small nudge.` : ""}`
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
