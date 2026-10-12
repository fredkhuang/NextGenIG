# Import report

Source: `/Users/fred/Downloads/Manufacturing Database_NEW.xlsx`
Generated: 2026-10-11T18:25:25.090Z

| | Count |
|---|---|
| Sheet rows | 219 |
| Sites (after merges) | 217 |
| Companies (after merging same-name rows) | 190 |
| Announcements | 565 |
| sqft = 1 placeholder treated as unknown | 86 |
| Sites with coordinates | 192 |

## Sites by industry
| Industry | Sites |
|---|---|
| Advanced Manufacturing | 75 |
| Energy | 56 |
| Batteries | 48 |
| Metals & Refining | 13 |
| Life Sciences | 9 |
| Chemicals | 9 |
| Carbon Capture | 4 |
| Other | 2 |
| (none) | 1 |

## Merged sites (config/site-merges.json)
- **Phoenix Tailings**: UID 201 merged into UID 168 (0 duplicate announcement(s) collapsed into extra sources) — Phoenix Tailings, Exeter NH (confirmed 2026-10-11)
- **Twelve**: UID 210 merged into UID 120 (3 duplicate announcement(s) collapsed into extra sources) — Twelve AirPlant One, Moses Lake WA (confirmed 2026-10-11)

## Duplicate UIDs in the sheet
- UID 204 is used by both **TS Conductor** and **VEIR**; VEIR imported as UID 100204. Give it a unique UID in the sheet.

## Possible duplicate companies (review in /admin/duplicates)
_None._

## Company field conflicts across rows
- **Crusoe** `hq_city`: kept "San Francisco", also saw "Denver"
- **Crusoe** `hq_state`: kept "CA", also saw "CO"
- **Infinitum** `hq_city`: kept "Round Rock", also saw "Austin"
- **Nitricity** `industry`: kept "Life Sciences", also saw "Chemicals"
- **Nitricity** `sub_industry`: kept "Agriculture", also saw "Chemicals"
- **Nitricity** `hq_city`: kept "San Francisco", also saw "Fremont"
- **Redwood Materials** `hq_city`: kept "Carson City", also saw "Reno"
- **Solarcycle** also spelled "SolarCycle" (merged)
- **Anduril** `hq_city`: kept "Long Beach", also saw "Costa Mesa"

## Possible duplicate sites
_None._

## Geocoded (verify city-level ones)
- Standard Bots (UID 185): Glen Cove, NY → city (nominatim)
- DG Matrix (UID 203): Morrisville, NC → city (nominatim)
- Cerebras (UID 206): Santa Clara, CA → city (nominatim)

## No coordinates (won't appear on the map)
- Addionics (UID 1): no location
- Coreshell (UID 173): no location
- Element Energy (UID 38): no location
- Enevate (UID 41): no location
- Infinitum (UID 59): no location
- Iotecha (UID 61): no location
- Koloma (UID 65): no location
- Mori (UID 80): VA
- CubicPV (UID 30): no location
- LiCycle (UID 68): no location
- PolyPlus Battery Company (UID 100): no location
- Rondo Energy (UID 132): no location
- Soelect (UID 110): no location
- South 8 Technologies (UID 113): no location
- Mach Industries (UID 175): no location
- Span (UID 164): no location
- Lunar Energy (UID 165): no location
- Inlyte Energy (UID 166): no location
- Enovix (UID 176): no location
- Zipline (UID 186): no location
- Syntropic Power (UID 193): no location
- VEIR (UID 100204): no location
- Fabri (UID 211): MA
- Phoenix Tailings (UID 212): no location
- Senra Systems (UID 222): no location

## Cell values needing review
### first_of_kind (5)
- InductEV (UID 56): "R&D Facility" — free text moved to notes
- Nanoscale Components (UID 85): "Expansion of R&D Facility" — free text moved to notes
- Natron Energy (UID 86): "Merger of Facilities" — free text moved to notes
- Phoenix Tailings (UID 96): "first factory ("demonstrated viability at pilot scale in its R&D facility")" — free text moved to notes
- Pivot Bio (UID 97): "one of a few projects, but seemingly the only one capable of development, production, and manufacturing (others include): 110,000 sq ft distribution center in Omaha, NE; facility at Iowa State University Research Park in Ames, IA; expansion at first distribution center in Chicago, IL" — free text moved to notes

### actual_construction_start (8)
- Mote (UID 81): "2026" — parsed "2026" as 2026-01-01
- Mote (UID 82): "2023" — parsed "2023" as 2023-01-01
- NXTClean Fuels (UID 87): "2023" — parsed "2023" as 2023-01-01
- NXTClean Fuels (UID 88): "2025" — parsed "2025" as 2025-01-01
- OneH2 (UID 93): "Late 2024" — parsed "Late 2024" as 2024-12-31
- Silfab Solar (UID 108): "Mar/Apr 2024 (building permit approved Mar 1 2024)" — parsed "Mar/Apr 2024 (building permit approved Mar 1 2024)" as 2024-03-01
- Solarcycle (UID 111): "2024" — parsed "2024" as 2024-01-01
- Verdagy (UID 123): "2024 Q1?" — parsed "2024 Q1?" as 2024-01-01

### cost_mm (1)
- CubicPV (UID 30): "cancelled" — not a number

### full_time_jobs (1)
- Phoenix Tailings (UID 96): "22 (43 per pitchbook)" — kept 22, dropped text

### planned_production_start (3)
- PolyPlus Battery Company (UID 100): "No news since 2022" — status note, not a date
- Sion Power (UID 109): "2026" — parsed "2026" as 2026-01-01
- Soelect (UID 110): "2025 - no news since JV announced" — parsed "2025 - no news since JV announced" as 2025-01-01

### land_acres (1)
- Re:Build Manufacturing (UID 103): "occupies a portion of a 70-acre park" — not a number

### announced_date (2)
- Soelect (UID 110): "JV MOU announced 4/26/2022" — parsed "JV MOU announced 4/26/2022" as 2022-04-26
- Whisper Aero (UID 127): "Limited info and manufacturing to date" — unparseable date

### actual_production_start (2)
- unspun (UID 121): "Unknown - assume built at this point" — unparseable date
- Twelve (UID 210): "https://www.twelve.co/post/airplant-one-opens-in-moses-lake-america-s-first-commercial-e-jet-fuel-plant-begins-operations" — date and URL columns swapped; corrected
