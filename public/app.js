const plannerForm = document.querySelector("#planner-form");
const spotSelect = document.querySelector("#spot");
const stationInput = document.querySelector("#station");
const dateInput = document.querySelector("#date");
const summary = document.querySelector("#summary");
const chart = document.querySelector("#chart");
const statusLabel = document.querySelector("#status");
const conditionsCaption = document.querySelector("#conditions-caption");
const conditions = document.querySelector("#conditions");
const weekGrid = document.querySelector("#week-grid");
const weekStatus = document.querySelector("#week-status");
const loadingBanner = document.querySelector("#loading-banner");
const template = document.querySelector("#window-template");

const PRESET_SPOTS = {
  santa_barbara: {
    station: "9411340",
    name: "Santa Barbara Harbor / City Pier",
    notes: "Tides and nearby forecast conditions centered on Santa Barbara Harbor.",
  },
  goleta: {
    station: "9411340",
    name: "Goleta Pier",
    notes: "Tides use the nearby Santa Barbara NOAA station while weather and light center on Goleta.",
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

function degreesToCompass(degrees) {
  if (degrees === null || Number.isNaN(Number(degrees))) {
    return null;
  }

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(Number(degrees) / 22.5) % 16;
  return directions[index];
}

function describeRating(score) {
  if (score >= 85) {
    return { label: "Excellent", className: "excellent" };
  }

  if (score >= 70) {
    return { label: "Good", className: "good" };
  }

  return { label: "Fair", className: "fair" };
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

function createConditionCard(label, value, note) {
  const card = document.createElement("article");
  const cardLabel = document.createElement("p");
  const cardValue = document.createElement("p");
  const cardNote = document.createElement("p");

  card.className = "condition-card";
  cardLabel.className = "condition-label";
  cardValue.className = "condition-value";
  cardNote.className = "condition-note";
  cardLabel.textContent = label;
  cardValue.textContent = value;
  cardNote.textContent = note;
  card.append(cardLabel, cardValue, cardNote);
  return card;
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

  return {
    windSpeedMph: averageSeriesValue(weatherSeries.windSpeedMph || [], windowStart, windowEnd),
    windDirectionDegrees: averageSeriesValue(weatherSeries.windDirectionDegrees || [], windowStart, windowEnd),
    waveHeightFeet: averageSeriesValue(weatherSeries.waveHeightFeet || [], windowStart, windowEnd),
    sunriseOverlapMinutes: sunriseWindowStart ? overlapMinutes(windowStart, windowEnd, sunriseWindowStart, sunriseWindowEnd) : 0,
    sunsetOverlapMinutes: sunsetWindowStart ? overlapMinutes(windowStart, windowEnd, sunsetWindowStart, sunsetWindowEnd) : 0,
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

  return highs
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
      const windScore = scoreWind(windowConditions.windSpeedMph);
      const waveScore = scoreWaveHeight(windowConditions.waveHeightFeet);
      const lightScore = scoreLight(windowConditions.sunriseOverlapMinutes, windowConditions.sunsetOverlapMinutes);
      const score = tideScore + windScore + waveScore + lightScore;
      const species = inferSpeciesForWindow({
        highTime: parseDateValue(high.t),
        highHeight: high.numericValue,
        start,
        end,
        incomingSwing,
        outgoingSwing,
        averageSwing,
        tideScore,
        windScore,
        waveScore,
        lightScore,
        score,
        conditions: windowConditions,
      });

      return {
        highTime: parseDateValue(high.t),
        highHeight: high.numericValue,
        start,
        end,
        incomingSwing,
        outgoingSwing,
        averageSwing,
        tideScore,
        windScore,
        waveScore,
        lightScore,
        score,
        rating: describeRating(score),
        conditions: windowConditions,
        species,
      };
    })
    .sort((left, right) => right.score - left.score);
}

function renderRecommendations(dayData, recommendations) {
  summary.innerHTML = "";

  if (recommendations.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No high-tide fishing windows were returned for this date.";
    summary.append(emptyState);
    return;
  }

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
      `Score breakdown: Tide ${recommendation.tideScore} + Wind ${recommendation.windScore} + Waves ${recommendation.waveScore} + Light ${recommendation.lightScore}.`;

    facts.append(
      createFact("High tide", `${formatTime(recommendation.highTime)} (${toFeet(recommendation.highHeight)})`),
      createFact("Incoming swing", toFeet(recommendation.incomingSwing)),
      createFact("Outgoing swing", toFeet(recommendation.outgoingSwing)),
      createFact("Wind", `${toMph(recommendation.conditions.windSpeedMph)}${recommendation.conditions.windDirectionDegrees !== null ? ` ${degreesToCompass(recommendation.conditions.windDirectionDegrees)} (${Number(recommendation.conditions.windDirectionDegrees).toFixed(0)}°)` : ""}`),
      createFact("Wave height", toFeet(recommendation.conditions.waveHeightFeet)),
      createFact("Light window", lightWindow),
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
      "Wave height",
      toFeet(dayData.dailyConditions.waveHeightFeet),
      "Uses NWS marine wave height as a practical surf-and-swell proxy for first-pass planning.",
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
  };
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
      daySpecies: summarizeDaySpecies(recommendations),
      bestScore: recommendations[0] ? recommendations[0].score : 0,
      bestWindow: recommendations[0] ? `${formatTime(recommendations[0].start)}-${formatTime(recommendations[0].end)}` : "No high tide window",
    };
  });

  currentWeek = enrichedDays;

  enrichedDays.forEach((dayData) => {
    const card = document.createElement("button");
    const dateLabel = document.createElement("p");
    const score = document.createElement("p");
    const note = document.createElement("p");

    card.type = "button";
    card.className = "day-card";
    card.dataset.date = dayData.date;
    dateLabel.className = "day-date";
    score.className = "day-score";
    note.className = "day-note";

    dateLabel.textContent = formatDayLabel(dayData.date);
    score.textContent = dayData.bestScore ? String(dayData.bestScore) : "0";
    note.textContent = dayData.bestScore
      ? `${dayData.daySpecies.slice(0, 2).map((species) => species.label).join(", ")} • ${dayData.bestWindow}`
      : "No strong high-tide block found";

    card.append(dateLabel, score, note);
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

  stationInput.value = spot.station;
  setSuccessState(
    bestDay
      ? `Loaded ${daysData.length} days for ${spot.name}. Best current score: ${bestDay.bestScore} on ${formatDayLabel(bestDay.date)}.`
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
    renderWeek(data.spot, data.daysData || []);
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
    setErrorState(
      `We couldn't finish loading the weekly plan. This usually means NOAA or NWS timed out, or Render couldn't reach them in time. Details: ${error.message}`,
    );
  }
}

spotSelect.addEventListener("change", () => {
  const preset = PRESET_SPOTS[spotSelect.value];
  stationInput.value = preset ? preset.station : stationInput.value;
  loadWeek(spotSelect.value, dateInput.value);
});

plannerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadWeek(spotSelect.value, dateInput.value);
});

dateInput.value = formatDateForInput(new Date());
stationInput.value = PRESET_SPOTS[spotSelect.value].station;
loadWeek(spotSelect.value, dateInput.value);
