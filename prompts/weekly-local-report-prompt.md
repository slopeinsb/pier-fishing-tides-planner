# Weekly Local Report Prompt

Use this prompt in ChatGPT after pasting the Santa Barbara-relevant portion of your subscribed fishing report.

```text
Convert this fishing report into a compact JSON object for my Santa Barbara / Goleta pier fishing planning app.

Rules:
- Focus only on Santa Barbara, Stearns Wharf, Santa Barbara Harbor / City Pier, Goleta Pier, and nearby pier-relevant details.
- Do not quote or preserve newsletter wording.
- Rewrite everything into short original summary phrases.
- Be cautious, not optimistic.
- If a detail is unclear, use null.
- Output valid JSON only.
- Keep scoreAdjustment modest. Use a range between -10 and 10.

Schema:
{
  "weekOf": "YYYY-MM-DD",
  "region": "Santa Barbara",
  "appliesTo": ["santa_barbara", "goleta"],
  "overallWeekMood": "slow | fair | improving | active | null",
  "baitfishActivity": "low | moderate | high | null",
  "waterClarity": "poor | fair | good | null",
  "waterTempFeel": "cold | seasonal | warm | null",
  "topReportedSpecies": ["species"],
  "productiveMethod": "drop sabiki | cast sabiki | soak bait | lures | mixed | null",
  "stearnsWharfNotes": "short original summary",
  "goletaNotes": "short original summary",
  "scoreAdjustment": 0,
  "confidence": "low | medium | high",
  "why": ["reason 1", "reason 2", "reason 3"],
  "sourceNote": "Manually distilled from a subscribed Southern California fishing report."
}

Guidance for scoreAdjustment:
-10 = much worse than the forecast alone suggests
-5 = somewhat worse
0 = no meaningful change
+5 = somewhat better
+10 = unusually encouraging week

Before outputting JSON, think through:
- whether water still feels seasonally cold
- whether baitfish are actually showing
- whether local method advice should change the sabiki recommendation
- whether the report sounds slow overall even if one species is still available
```
