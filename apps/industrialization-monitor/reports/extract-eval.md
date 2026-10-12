# Extraction eval

Model **claude-opus-5-5**, effort **medium**, prompt version `2dcbfd4e352f7ab4`
Articles: 132 scored / 132 attempted. Tokens: 834,288 in, 139,778 out. Est. cost: **$4.07** ($0.031/article).

Expected values come from the legacy sheet, which has its own errors. A "miss" can be a sheet error, so check the quote before blaming the extractor.

## Field accuracy
| Field | Correct | Total | % |
|---|---|---|---|
| article marked relevant | 131 | 132 | 99% |
| company identified | 129 | 132 | 98% |
| announced_on within 7 days | 90 | 113 | 80% |
| milestone date: exact | 15 | 51 | 29% |
| milestone date: within 31 days | 19 | 51 | 37% |
| site city | 92 | 119 | 77% |
| site state | 102 | 120 | 85% |
| site cost_mm: extracted at all | 39 | 81 | 48% |
| site cost_mm: agrees with sheet (±10%) | 29 | 39 | 74% |
| site sqft: extracted at all | 48 | 77 | 62% |
| site sqft: agrees with sheet (±10%) | 40 | 48 | 83% |
| site full_time_jobs: extracted at all | 42 | 86 | 49% |
| site full_time_jobs: agrees with sheet (±10%) | 37 | 42 | 88% |
| site construction_jobs: extracted at all | 10 | 20 | 50% |
| site construction_jobs: agrees with sheet (±10%) | 6 | 10 | 60% |

## Recall by announcement type (expected → found)
| Field | Correct | Total | % |
|---|---|---|---|
| site_announced | 65 | 111 | 59% |
| production_start:planned | 30 | 64 | 47% |
| construction_start:actual | 7 | 7 | 100% |
| production_start:actual | 8 | 8 | 100% |
| production_at_rate:actual | 0 | 2 | 0% |
| construction_start:planned | 6 | 10 | 60% |
| status_change | 0 | 1 | 0% |
| cancellation | 2 | 2 | 100% |
| delay | 0 | 1 | 0% |

## Extra announcements (found in articles, not in the sheet)
### construction_start:planned (18)
- [Lyten](https://lyten.com/2024/10/15/lyten-announces-plans-to-build-the-worlds-first-lithium-sulfur-battery-gigafactory-in-nevada/): 2025-01-01 — "finalize contractual terms to support breaking ground in early 2025"
- [Twelve](https://www.commerce.wa.gov/twelve-announces-plans-to-scale-production-of-sustainable-aviation-fuel-made-from-co2-in-washington-state/): 2023-07-11 — "A groundbreaking event for the facility will take place on July 11"
- [Twelve](https://www.commerce.wa.gov/news/twelve-announces-plans-to-scale-production-of-sustainable-aviation-fuel-made-from-co2-in-washington-state/): 2023-07-11 — "A groundbreaking event for the facility will take place on July 11"
- [KORE Power](https://www.commercialsearch.com/news/1-25b-battery-gigafactory-set-to-rise-near-phoenix/): 2022-10-01 — "will break ground this fall on KOREPlex, its planned $1.25 billion gigafactory in Buckeye, Ariz."
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/): 2024-01-01 — "During 3 years of construction, from 2024 – 2027, DG Fuels is expected to add $769.8 million in value to the parish annu"
- [XNRGY](https://www.prnewswire.com/news-releases/xnrgy-breaks-ground-on-sustainable-manufacturing-facility-in-mesa-arizona-302114870.html): 2024-04-16 — "The groundbreaking ceremony for the new XNRGY facility will be held on April 16th at 11:00 AM."
- [Nox Metals](https://noxmetals.co/blog/nox-metals-seed-round): 2026-07-01 — "We will be revitalizing a WW2-era, 30,000 SQFT factory in Detroit this summer"
- [Solarcycle](https://www.solarcycle.us/press-releases/solarcycle-to-open-first-of-its-kind-solar-panel-glass-plant-in-georgia): 2024-01-01 — "is scheduled to begin construction in 2024"
- [Ascend Elements](https://www.prnewswire.com/news-releases/ascend-elements-to-invest-up-to-1-billion-in-southwest-kentucky-ev-battery-materials-manufacturing-facility-301597102.html): 2022-10-01 — "with groundbreaking expected in Q4 2022"
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/port-westward/): 2025-01-01 — "Anticipated Construction Timeline 2025-2027"
- [Climeworks](https://www.opportunitylouisiana.gov/news/climeworks-proposes-50-million-investment-to-expand-louisianas-direct-air-capture-hub-into-southwest-louisiana): 2026-07-01 — "Climeworks expects to make a final investment decision and begin construction in Q3 of 2026."
- [X-Energy](https://x-energy.com/media/news-releases/dows-seadrift-texas-location-selected-for-x-energy-advanced-smr-nuclear-project-to-deliver-safe-reliable-zero-carbon-emissions-power-and-steam-production): 2026-01-01 — "Construction on the four-reactor project is expected to begin in 2026"
- [Redwood Materials](https://www.redwoodmaterials.com/news/announcing-redwood-south-carolina/): 2023-01-01 — "We plan to break ground on our Carolina Campus in Q1 2023"
- [Encina](https://www.encina.com/encina-announces-1-1-billion-investment-in-new-advanced-manufacturing-facility-in-pennsylvania/): 2022-10-01 — "Construction is expected to begin in fall 2022"
- [Mach Industries](https://www.prnewswire.com/news-releases/mach-industries-announces-mach-propulsion-new-jet-engine-factory-to-fuel-the-future-of-unmanned-defense-technology-302406817.html): 2025-12-31 — "Set to begin construction later this year, the Mach Propulsion facility"
- … 3 more

### grant (23)
- [Anthro Energy](https://www.prweb.com/releases/us-department-of-energy-selects-anthro-energy-for-24-9-million-grant-under-bipartisan-infrastructure-law-to-build-us-owned-advanced-electrolyte-production-facility-302284289.html): 24,900,000 — "the U.S. Department of Energy's (DOE) Office of Manufacturing and Energy Supply Chains (MESC) announced the selection of"
- [Re:Build Manufacturing](https://rebuildmanufacturing.com/articles/rebuild-manufacturing-announcement): 1,500,000 — "Re:Build and RIDC received a funding proposal from the Department of Community and Economic Development (DCED) for a $1."
- [Re:Build Manufacturing](https://rebuildmanufacturing.com/articles/rebuild-manufacturing-announcement): 7,000,000 — "a $7 million grant through the Redevelopment Assistance Capital Program"
- [TS Conductor](https://www.wtoc.com/2026/05/13/ts-conductor-opens-134m-manufacturing-plant-hardeeville-plans-hire-hundreds/): 28,000,000 — "TS Conductor is receiving $28 million in continued support from the U.S. Department of Energy's Manufacturing Deployment"
- [LuxWall](https://www.luxwall.com/luxwall-open-new-manufacturing-facility/): 31,700,000 — "In November 2023, LuxWall received a $31.7 million grant from the U.S. Department of Energy to support the Detroit proje"
- [Forge Nano](https://www.forgenano.com/forge-nano-to-launch-u-s-battery-manufacturing-business-north-carolina-gigafactory-planned-for-2026/): 100,000,000 — "Backed by a $100M U.S. Department of Energy grant and designed with proprietary Atomic Armor™ technology"
- [Moment Energy](https://www.momentenergy.com/news-articles/moment-energy-awarded-us-20-3-million-by-us-dept-of-energy-to-establish-first-certified-ev-battery-repurposing-facility-in-the-us): 20,300,000 — "selected by the U.S. Department of Energy (DOE) for a US$20.3 million award to establish the first UL1974 Certified manu"
- [Silfab Solar](https://silfabsolar.com/silfab-solar-growing-us-presence-by-establishing-flagship-operation-in-york-county/): 2,000,000 — "The council also awarded a $2 million Set-Aside grant to York County to assist with the costs of building improvements."
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/): 50,000,000 — "The corporate contracts were crucial for the $50 million grant commitment by Breakthrough Energy Catalyst"
- [Solarcycle](https://www.solarcycle.us/press-releases/solarcycle-to-open-first-of-its-kind-solar-panel-glass-plant-in-georgia): 1,500,000 — "U.S. Department of Energy Solar Energy Technologies Office, which has invested $1.5 million in SOLARCYCLE's research and"
- [Amprius](https://amprius.com/about/news-and-events/amprius-technologies-selects-colorado-for-gigawatt-hour-scale-factory-site/): 50,000,000 — "The initial phase of 500 MWh, will be funded in part by the $50 million cost sharing grant selected for negotiation of a"
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): 1,000,000 — "REGENT has received $1 million from the Rhode Island Commerce Department under the First Wave Closing Fund Act"
- [TS Conductor](https://www.energy.gov/articles/biden-harris-administration-announces-nearly-430-million-accelerate-domestic-clean-energy): 28,200,000 — "TS Conductor- Erie, MI $28.2 million selection to establish U.S.-based manufacturing of High Voltage Direct Current (HVD"
- [Climeworks](https://www.opportunitylouisiana.gov/news/climeworks-proposes-50-million-investment-to-expand-louisianas-direct-air-capture-hub-into-southwest-louisiana): 50,000,000 — "to match the initial $50 million in funding from the U.S. Department of Energy to create one of the world's largest DAC "
- [Saronic](https://www.opportunitylouisiana.gov/news/saronic-technologies-investing-300-million-to-expand-franklin-shipyard-creating-3200-jobs-in-louisianas-bayou-region): 2,000,000 — "It also included a $2 million performance-based grant"
- … 8 more

### funding_round (28)
- [Advano](https://www.bizneworleans.com/new-orleans-tech-startup-advano-raises-18-5-million/): 18,500,000 — "upstart tech company Advano – founded by New Orleanian Alexander Girau – had raised $18.5 million"
- [Verdagy](https://verdagy.com/verdagy-to-manufacture-hydrogen-electrolyzers-in-its-new-advanced-silicon-valley-facility/): 73,000,000 — "Last month, Verdagy closed a $73-million Series B funding round, co-led by Temasek and Shell Ventures."
- [Noveon Magnetics](https://www.prnewswire.com/news-releases/noveon-magnetics-completes-215-million-series-c-to-expand-us-rare-earth-magnet-manufacturing-capacity-302664196.html): 215,000,000 — "today announced the close of a $215 million Series C financing led by a $200 million investment from One Investment Mana"
- [Pyka](https://www.flypyka.com/press-releases/pyka-secures-110-000-sq-ft-historic-aviation-hangar-in-the-bay-area-for-scaled-manufacturing-and-r-d): 37,000,000 — "The Silicon Valley startup, who secured $37m in Series A funding in 2022"
- [Atom Power](https://www.wfae.org/energy-environment/2023-05-09/atom-power-plans-4-2m-expansion-in-huntersville): 100,000,000 — "Atom Power is growing with the help of a $100 million investment last year by SK, a Korean company that is now its large"
- [Senra Systems](https://www.senrasystems.us/media/announcing-our-series-b): 65,000,000 — "today announced it has raised $65 million in a Series B funding round"
- [Nitricity](https://www.nitricity.co/news/nitricity-announces-10-million-in-fresh-funding-for-first-of-a-kind-organic-fertilizer-plant): 10,000,000 — "today announced $10 million in project funding from a strategic mix of capital providers that includes Elemental Impact "
- [LuxWall](https://www.luxwall.com/luxwall-open-new-manufacturing-facility/):  — "Last month, the company announced it had secured its Series B funding round led by Climate Investment and Barclays Susta"
- [Phoenix Tailings](https://greentownlabs.com/phoenix-tailings-is-building-the-u-s-supply-chain-for-waste-free-net-zero-rare-earth-metals/):  — "is about to close an oversubscribed Series B round with investments from BMW, Yamaha Motor, Presidio Ventures"
- [Carbice](http://carbice.com/newsroom/): 15,000,000 — "Carbice Corp. successfully closed a $15 million Series A funding round led by Downing Ventures. with additional funding "
- [Carbice](http://carbice.com/newsroom/): 1,500,000 — "raised $1.5 million in a series seed round co-led by Tech Square Labs and the GRA Venture Fund."
- [Nox Metals](https://noxmetals.co/blog/nox-metals-seed-round): 11,500,000 — "We are announcing our $11.5M Seed round led by Hyperion, with participation from Palmer Luckey, Y Combinator, Jared Frie"
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): 60,000,000 — "the largest venture-capital raise in state history in our $60 million Series A"
- [harbinger motors](https://harbingermotors.com/medium-duty-ev-manufacturer-harbinger-greatly-expands-its-footprint-with-new-headquarters-in-garden-grove/): 60,000,000 — "Harbinger, a Southern California-based automotive manufacturer, has secured $60 million in Series A funding from a diver"
- [Overland AI](https://www.overland.ai/news/overland-ai-raises-100-million-to-scale-ground-autonomy-with-u-s-armed-forces): 100,000,000 — "today announced it has raised $100 million in new funding to scale operations with end users across the U.S. Armed Force"
- … 13 more

### production_start:planned (15)
- [Advano](https://www.bizneworleans.com/new-orleans-tech-startup-advano-raises-18-5-million/): 2020-03-31 — "a 20,000 square-foot facility near the University of New Orleans that will be up and running by March"
- [Castelion](https://www.castelion.com/news/project_ranger_groundbreaking/): 2026-12-31 — "all twenty-one buildings on the campus complete and ready for production by the end of 2026"
- [Hyperion](https://www.purpose.jobs/blog/hyperion-battery-tech-investment-columbus-ohio): 2023-01-01 — "Hyperion expects to begin production in 2023."
- [Antora Energy](https://antoraenergy.com/manufacturing-facility): 2024-01-01 — "with initial units rolling off the production line in 2024"
- [Ambri](https://www.utilitydive.com/news/xcel-energy-ambri-liquid-metal-battery-test/688707/): 2025-09-30 — "Ambri aims to have the first phase of the plant, which will have the capacity to build 1 GW of battery units per year, o"
- [Agility Robotics](https://agilityrobotics.com/content/opening-robofab-worlds-first-factory-for-humanoid-robots): 2023-12-31 — "it is set to open later this year. Agility anticipates production capacity of hundreds of Digit robots in the first year"
- [Climeworks](https://www.opportunitylouisiana.gov/news/climeworks-proposes-50-million-investment-to-expand-louisianas-direct-air-capture-hub-into-southwest-louisiana): 2027-12-31 — "Production at the new DAC facility is anticipated to begin by the end of 2027."
- [Saronic](https://www.opportunitylouisiana.gov/news/saronic-technologies-investing-300-million-to-expand-franklin-shipyard-creating-3200-jobs-in-louisianas-bayou-region): 2027-01-01 — "expects construction to be completed by the end of 2026, with expanded operations beginning in 2027"
- [Lilac Solutions](https://lilacsolutions.com/2024/02/with-145m-in-fresh-capital-were-building-the-foundation-of-a-u-s-lithium-supply-chain/): 2024-12-31 — "The next step for this project involves deployment of a field pilot later this year."
- [Dimensional Energy](https://www.dimensionalenergy.com/post/2024-year-in-review): 2025-01-01 — "This project finished construction near the end of 2024 and will operate throughout 2025."
- [Mariana Minerals](https://investors.selectwater.com/news-events/press-releases/detail/134/select-water-solutions-and-mariana-minerals-break-ground-on-texass-first-commercial-produced-water-lithium-extraction-facility): 2027-01-01 — "commercial production is targeted for the first half of 2027"
- [Mangrove Lithium](https://www.connectcre.ca/stories/mangrove-commences-construction-on-lithium-refining-plant-in-delta/): 2025-12-31 — "The new facility is expected to be operational by late 2025"
- [Terra CO2](https://www.canarymedia.com/articles/clean-industry/a-former-utah-coal-town-could-soon-become-a-hub-for-low-carbon-cement): 2026-09-30 — "begin shipping out materials by late summer 2026"
- [Anduril](https://www.nbc4i.com/news/local-news/pickaway-county/anduril-quietly-starts-construction-on-ohio-arsenal-1-plant/): 2026-07-01 — "Anduril had hoped to break ground in July in order to begin weapons manufacturing in Pickaway County in July 2026."
- [Orange EV](https://orangeev.com/orange-ev-news/orange-ev-new-global-headquarters/): 2023-07-01 — "Orange EV expects to move in mid-2023"

### production_at_rate:planned (7)
- [Niron Magnetics](https://www.cbsnews.com/minnesota/news/niron-magnetics-groundbreaking-manufacturing-facility-technology/): 2027-01-01 — "The Sartell facility will be fully operational in 2027"
- [KORE Power](https://www.commercialsearch.com/news/1-25b-battery-gigafactory-set-to-rise-near-phoenix/): 2024-01-01 — "The facility is expected to be fully operational in 2024."
- [NanoGraf Corporation](https://www.nanograf.com/media/nanograf-to-launch-uss-first-large-volume-silicon-oxide-factory): 2024-01-01 — "supplying domestically produced batteries to the EV market by 2024 – and that’s when it intends to achieve its goal of p"
- [Flock Safety](https://businessfacilities.com/flock-safety-invests-10m-in-georgia-creates-210-jobs/): 2027-01-01 — "Hiring for the new facility is underway now, with projections to meet full operations in 2027."
- [Our Next Energy](https://one.ai/one-welcomes-mujeeb-ijaz-as-ceo-and-announces-strategic-investment-to-drive-next): 2027-01-01 — "is gearing up for full-scale manufacturing of domestic cells and battery packs by early 2027"
- [Encina](https://www.encina.com/encina-announces-1-1-billion-investment-in-new-advanced-manufacturing-facility-in-pennsylvania/): 2024-12-31 — "the facility is expected to be fully operational by fall 2024"
- [JetZero](https://www.jetzero.aero/jetzero-selectsgreensborro-nc-for-factory): 2039-12-31 — "capable of producing up to 20 Z4 airplanes per month at the factory's full run rate, expected to be achieved by the late"

### tax_credit (5)
- [Pyka](https://www.flypyka.com/press-releases/pyka-secures-110-000-sq-ft-historic-aviation-hangar-in-the-bay-area-for-scaled-manufacturing-and-r-d):  — "We are proud to support Pyka's expansion to Alameda Point with a California Competes Tax Credit to scale manufacturing a"
- [NanoGraf Corporation](https://www.nanograf.com/media/nanograf-to-launch-uss-first-large-volume-silicon-oxide-factory):  — "Thanks to the Inflation Reduction Act, NanoGraf will also get a 10% tax credit for domestic anode material production."
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/): 8,000,000 — "It will also benefit from an $8 million state tax credit, the maximum amount available under the Colorado Industrial Tax"
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): 3,000,000 — "the state has further committed to investing $3M under the Rebuild Rhode Island Tax Credit Act"
- [Peak Energy](https://greatersacramento.com/press-release/peak-energy-selects-sacramento-to-build-americas-first-sodium-ion-grid-storage-factory/): 10,500,000 — "Peak's growth in California is supported by a $10.5 million CalCompetes tax credit, which was awarded in May 2026."

### incentive (10)
- [Atom Power](https://www.wfae.org/energy-environment/2023-05-09/atom-power-plans-4-2m-expansion-in-huntersville): 1,600,000 — "including $1.6 million from the state"
- [Atom Power](https://www.wfae.org/energy-environment/2023-05-09/atom-power-plans-4-2m-expansion-in-huntersville): 46,000 — "$46,000 from Mecklenburg County"
- [Atom Power](https://www.wfae.org/energy-environment/2023-05-09/atom-power-plans-4-2m-expansion-in-huntersville): 5,000 — "$5,000 from Lake Norman Economic Development"
- [MetOx Technologies](https://edpnc.com/news/metox-international-announcement/): 3,184,500 — "the JDIG agreement authorizes the potential reimbursement to the company of up to $3,184,500, spread over 12 years."
- [Saronic](https://www.brownsvilletx.gov/m/newsflash/home/detail/3309): 10,000,000 — "Greater Brownsville EDC also committed $10 million toward workforce development initiatives to help prepare local reside"
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): 13,000,000 — "REGENT has committed to creating 300 jobs, with the potential for up to 750, over the next 10 years, unlocking up to $13"
- [Anthro Energy](https://newkentuckyhome.ky.gov/Newsroom/NewsPage/20251212_AnthroEnergy): 2,000,000 — "KEDFA in June 2025 preliminarily approved a 10-year incentive agreement with the company under the Kentucky Business Inv"
- [Anthro Energy](https://newkentuckyhome.ky.gov/Newsroom/NewsPage/20251212_AnthroEnergy): 340,000 — "KEDFA approved Anthro Energy for up to $340,000 in tax incentives through the Kentucky Enterprise Initiative Act (KEIA)."
- [Joby](https://www.jobyaviation.com/news/joby-selects-dayton-ohio-first-scaled-manufacturing-facility/): 325,000,000 — "The State of Ohio, JobsOhio and local political subdivisions have offered incentives and benefits of up to $325 million "
- [Form Energy Inc.](https://www.theguardian.com/us-news/2023/aug/14/weirton-west-virginia-battery-plant-steel-mill?CMP=Share_iOSApp_Other): 250,000,000 — "it has already poured more than $250m into the project and that Form Energy won't have to pay any property taxes on it"

### production_start:actual (18)
- [Terawatt](https://www.terawattinfrastructure.com/blog/terawatt-infrastructure-opens-ev-fleet-charging-site-in-los-angeles): 2024-10-09 — "today announced the opening of its first full-build charging site, which will serve light-duty fleets in high-traffic ar"
- [Soelect](https://www.kedglobal.com/batteries/newsView/ked202204260022?_gl=1*okc74m*_ga*MVRtVFVEcElVRzNoWURKdTlfcU5TUDJ4VWlxcXN0SlY1NDFDRzJkMmdiVjNqNHN2blFlMjdIYjdLODZsNDhBTg..):  — "Based in Greensboro, North Carolina, Soelect is currently producing lithium metal anodes for next-generation solid-state"
- [Standard Bots](https://www.linkedin.com/posts/standard-bots_tbt-manufacturing-automation-activity-7356685225340362754-klJj?utm_source=li_share&utm_content=feedcontent&utm_medium=g_dt_web&utm_campaign=copy): 2025-06-01 — "Last month, we opened the doors to a new 16,000 sq ft floor. Our new Glen Cove, NY factory is more than a new address"
- [Senra Systems](https://www.senrasystems.us/media/announcing-our-series-b):  — "Factory 2, Senra's second factory newly opened in Cypress, expanded the company's production footprint by 5X"
- [Amber Wave](https://www.feedandgrain.com/grain-handling-processing/news/15384912/amber-wave-opens-wheat-protein-plant-in-kansas):  — "Amber Wave has opened its state-of-the-art wheat protein ingredients facility in Phillipsburg, KS. The $250 million proj"
- [Terabase](https://www.terabase.energy/resources/terabase-energy-launches-terafab-automated-field-factory-to-accelerate-the-deployment-of-solar-power-plants): 2023-05-11 — "Terabase also announces today the grand opening of its Woodland, California, Terafab manufacturing facility — a “factory"
- [Sila Nanotechnologies](https://www.silanano.com/press/press-releases/sila-establishes-a-new-auto-scale-factory-in-washington-state-to-manufacture-next-gen-anode-materials):  — "Sila's battery materials are produced at its first-of-its-kind facility in Moses Lake, Washington."
- [Waymo](https://waymo.com/blog/2025/05/scaling-our-fleet-through-us-manufacturing/): 2025-05-05 — "With our partners at Magna, we've opened a manufacturing site that enables the cost efficiency, flexibility, and capacit"
- [LuxWall](https://www.luxwall.com/luxwall-open-new-manufacturing-facility/): 2024-01-01 — "LuxWall's first production operation, which opened earlier this year in Litchfield, Mich."
- [Formlabs](https://www.linkedin.com/posts/ma-executive-office-of-economic-development-eoed_teamma-activity-7411785100209799168-Ac7P):  — "joined the Formlabs team to celebrate the opening of their new manufacturing facility in Billerica"
- [True Anomaly](https://www.prnewswire.com/news-releases/true-anomaly-announces-grand-opening-of-gravityworks-spacecraft-manufacturing-facility-and-federal-approval-to-demonstrate-non-earth-imaging-and-rendezvous-and-proximity-operations-301904094.html): 2023-08-17 — "today hosted the grand opening of its state-of-the-art spacecraft manufacturing facility, GravityWorks, in Centennial, C"
- [Carbice](http://carbice.com/newsroom/): 2022-09-13 — "The largest maker of aligned nanotube products in the world is now open in Atlanta's Historic West End Community."
- [Nox Metals](https://noxmetals.co/blog/nox-metals-seed-round): 2025-11-01 — "Since launching production only 7 months ago, we have shipped metal to hundreds of American factories."
- [Senra Systems](https://www.senrasystems.us/media/factory-2): 2026-01-28 — "The opening of our Cypress facility marks a major step in scaling Senra’s software-powered manufacturing model. Our 80,0"
- [Our Next Energy](https://one.ai/one-welcomes-mujeeb-ijaz-as-ceo-and-announces-strategic-investment-to-drive-next): 2024-01-01 — "The company commenced production of prototype U.S.-made LFP cells at ONE Circle, its Michigan gigafactory, during 2024"
- … 3 more

### partnership (25)
- [Soelect](https://www.kedglobal.com/batteries/newsView/ked202204260022?_gl=1*okc74m*_ga*MVRtVFVEcElVRzNoWURKdTlfcU5TUDJ4VWlxcXN0SlY1NDFDRzJkMmdiVjNqNHN2blFlMjdIYjdLODZsNDhBTg..): 200,000,000 — "forming a $200 million joint venture with US battery startup Soelect Inc."
- [Blue Water Autonomy](https://www.axios.com/2025/09/24/blue-water-conrad-asv-louisiana):  — "Massachusetts-based startup Blue Water Autonomy picked Louisiana's Conrad Shipyard to build its unmanned autonomous ship"
- [Terabase](https://www.terabase.energy/resources/terabase-energy-launches-terafab-automated-field-factory-to-accelerate-the-deployment-of-solar-power-plants):  — "“Our partnership with Terabase reflects our commitment to supporting innovation in the solar industry,” stated Nextracke"
- [Waymo](https://waymo.com/blog/2025/05/scaling-our-fleet-through-us-manufacturing/):  — "we're investing in our American manufacturing operation with a new autonomous vehicle factory in Metro Phoenix with our "
- [Inlyte Energy](https://www.prnewswire.com/news-releases/inlyte-energy-and-horien-announce-strategic-partnership-to-scale-iron-sodium-battery-manufacturing-in-the-united-states-302412502.html):  — "have signed a Memorandum of Understanding to accelerate manufacturing scale-up of Inlyte's breakthrough iron-sodium batt"
- [EdgeEnergy](https://www.edgeenergyev.com/post/edgeenergy-to-invest-150-million-over-next-two-years-to-manufacture-in-ohio):  — "EdgeEnergy is working with community partners as well as industry partners like Blink Charging to develop a job training"
- [Electra (Electric Aviation)](https://www.manufacturingdive.com/news/electra-beehive-ohio-gkn-rtx-doncasters-farnborough-air-show-2026/826082/):  — "Electra's research and development agreement with Safran Helicopter Engines that was established July 15. The deal invol"
- [Carbice](http://carbice.com/newsroom/):  — "Dow and Carbice partner to advance thermal interface materials"
- [Carbice](http://carbice.com/newsroom/):  — "AMD Bundles Carbice Ice Pad with Ryzen™ 7 5800X3D"
- [Carbice](http://carbice.com/newsroom/):  — "Noctua is the exclusive retail distributor of Carbice® IP90 thermal pads for the DIY PC market"
- [Carbice](http://carbice.com/newsroom/):  — "Carbice and DarkNX Partner to Advance Reliability and Performance of AI Data Centers"
- [Carbice](http://carbice.com/newsroom/):  — "Carbice partners with SWISSto12 to advance next-generation satellites"
- [Carbice](http://carbice.com/newsroom/):  — "collaborating with RTX's subsidiary, Blue Canyon Technologies, Inc., ... as a key supplier of aligned carbon nanotechnol"
- [harbinger motors](https://harbingermotors.com/medium-duty-ev-manufacturer-harbinger-greatly-expands-its-footprint-with-new-headquarters-in-garden-grove/):  — "Through this investment, THOR deepens its collaboration with Harbinger to provide electrification solutions for their mo"
- [Monolith](https://www.bicmagazine.com/departments/operations/monolith-materials-broke-ground-on-its-manufacturing-plant-i/):  — "The San Francisco-area clean energy start-up company is partnering with the Nebraska Public Power District on the plant"
- … 10 more

### status_change (6)
- [OneD Battery Sciences](https://www.geekwire.com/2025/next-gen-battery-company-oned-shutters-pilot-manufacturing-site-in-wash-citing-tariff-impacts/):  — "OneD Battery Sciences has shut down its pilot manufacturing facility in the Eastern Washington town of Moses Lake, accor"
- [Mycoworks](https://www.linkedin.com/pulse/evolving-mycoworks-from-growing-mycelium-empowering-scullin-dawef?trk=public_post_feed-article-content):  — "MycoWorks will now enter a restructuring period that includes shifting our production from South Carolina to utilizing o"
- [KORE Power](https://www.commercialsearch.com/news/1-25b-battery-gigafactory-set-to-rise-near-phoenix/):  — "the company recently changed its plans to double the facility's size to 2 million square feet"
- [NanoGraf Corporation](https://www.nanograf.com/media/nanograf-to-launch-uss-first-large-volume-silicon-oxide-factory):  — "NanoGraf’s new US high-performance silicon anode materials factory, which is under construction, is in Chicago’s West Lo"
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/lakeview-rng/):  — "Local Facility Permits Approved State Facility Permits Approved Federal Facility Permit Approved"
- [Dimensional Energy](https://www.dimensionalenergy.com/post/2024-year-in-review):  — "This project finished construction near the end of 2024 and will operate throughout 2025."

### construction_start:actual (10)
- [OneD Battery Sciences](https://www.geekwire.com/2025/next-gen-battery-company-oned-shutters-pilot-manufacturing-site-in-wash-citing-tariff-impacts/): 2023-10-01 — "told GeekWire in October 2023 as the company was breaking ground in the area."
- [Amogy](https://amogy.co/amogy-expands-operations-to-houston-new-40-million-manufacturing-facility-to-open-early-2024/):  — "with renovation underway on a 53,000-square-foot manufacturing facility"
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): 2025-01-27 — "broke ground on REGENT's Seaglider Manufacturing Facility on Jan. 27, 2025."
- [Ambri](https://www.utilitydive.com/news/xcel-energy-ambri-liquid-metal-battery-test/688707/):  — "The company is also building a pilot manufacturing facility in Massachusetts"
- [Whisper Aero](https://www.futureflight.aero/news-article/2023-07-25/whisper-aero-breaks-ground-new-flight-test-center-tennessee): 2023-07-24 — "Whisper Aero and the city of Crossville, Tennesse held a joint groundbreaking ceremony at the site of Whisper's new Flig"
- [Agility Robotics](https://agilityrobotics.com/content/opening-robofab-worlds-first-factory-for-humanoid-robots): 2022-01-01 — "Initial construction of Agility’s 70,000 square foot robot factory began last year"
- [Monolith](https://www.bicmagazine.com/departments/operations/monolith-materials-broke-ground-on-its-manufacturing-plant-i/): 2016-10-20 — "Monolith Materials officially broke ground Thursday on its manufacturing plant next door to the Sheldon Station power pl"
- [LightForce](https://3dprint.com/302284/lightforce-orthodontics-snags-80m-for-3d-printed-braces-expansion-plans-hiring-spree/):  — "they're building a new 36,000-square-foot factory in Wilmington, Massachusetts"
- [Helion Energy](https://www.helionenergy.com/articles/helion-energy-breaks-ground-on-site-of-its-next-generation-fusion-facility-in-everett-washington/): 2021-07-27 — "today broke ground on the next iteration of its fusion facility in Everett, Washington"
- [Form Energy Inc.](https://www.theguardian.com/us-news/2023/aug/14/weirton-west-virginia-battery-plant-steel-mill?CMP=Share_iOSApp_Other): 2023-05-01 — "broke ground on its iron-air battery manufacturing plant this past May"

### customer_award (9)
- [Nitricity](https://www.nitricity.co/news/nitricity-announces-10-million-in-fresh-funding-for-first-of-a-kind-organic-fertilizer-plant):  — "the plant's full production capacity is already sold out through 2028 under binding offtake agreements with local organi"
- [NanoGraf Corporation](https://www.nanograf.com/media/nanograf-to-launch-uss-first-large-volume-silicon-oxide-factory): 10,000,000 — "it was a $10 million US Department of Defense (DoD) contract that made this new 17,000-square-foot factory possible."
- [Carbice](http://carbice.com/newsroom/):  — "Carbice Awarded Multi-Million Dollar U.S. Navy Contract for Thermal Assembly Joint Technology"
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/):  — "Nucor, the largest U.S. steel producer, which uses largely recycled scrap, will buy some of Electra's iron. Electra also"
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/):  — "Social media company Meta will buy the environmental attribute certificates related to Electra's production"
- [Peak Energy](https://greatersacramento.com/press-release/peak-energy-selects-sacramento-to-build-americas-first-sodium-ion-grid-storage-factory/):  — "Peak has secured customer agreements with Jupiter Power, Energy Vault and RWE Americas"
- [Twelve](https://www.twelve.co/post/airplant-one-opens-in-moses-lake-america-s-first-commercial-e-jet-fuel-plant-begins-operations):  — "In 2022, Alaska and Microsoft jointly committed to purchase output from Twelve's facility"
- [Mach Industries](https://www.prnewswire.com/news-releases/mach-industries-announces-mach-propulsion-new-jet-engine-factory-to-fuel-the-future-of-unmanned-defense-technology-302406817.html):  — "its Strategic Strike contract, recently awarded by the Army Application Lab"
- [SunGas Renewables](https://sungasrenewables.com/sungas-renewables-announces-beaver-lake-renewable-energy/):  — "Green methanol produced by BLRE is expected to be used to fuel A.P. Moller – Maersk's ("Maersk's") fleet of methanol-pow"

### site_announced (5)
- [Castelion](https://www.castelion.com/news/project_ranger_groundbreaking/):  — "Castelion today announced the launch of Project Ranger, a 1,000-acre hypersonic manufacturing campus in Sandoval County"
- [Anthro Energy](https://newkentuckyhome.ky.gov/Newsroom/NewsPage/20251212_AnthroEnergy):  — "announced plans to locate a new manufacturing facility in Louisville, investing over $42 million and creating 110 new, f"
- [Saronic](https://www.opportunitylouisiana.gov/news/saronic-technologies-investing-300-million-to-expand-franklin-shipyard-creating-3200-jobs-in-louisianas-bayou-region): 300,000,000 — "Saronic Technologies, Inc. is expanding operations in St. Mary Parish to increase production capacity at its autonomous "
- [Mangrove Lithium](https://www.mangrovelithium.com/mangrove-lithium-opens-north-americas-first-commercial-electrochemical-lithium-refining-facility/):  — "Mangrove has announced plans for a facility in Eastern Canada that will expand Canada's lithium supply through a spodume"
- [Saronic](https://www.workboat.com/saronic-raises-600-million-to-build-autonomous-vessels):  — "acquire a 420,000-square-foot manufacturing facility in Austin, Texas"

### cancellation (1)
- [Mycoworks](https://www.linkedin.com/pulse/evolving-mycoworks-from-growing-mycelium-empowering-scullin-dawef?trk=public_post_feed-article-content):  — "This logical transition comes with the tough decision to close our plant in South Carolina."

### other (9)
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/): 26,050,000 — "presented a proposal for a legally binding agreement to the St. James Parish Council Wednesday committing $26,050,000 to"
- [Terra CO2](https://www.canarymedia.com/articles/clean-industry/terra-co2-says-its-texas-factory-will-cut-carbon-and-cost-from-cement): 160,000,000 — "Terra CO2 has lined up roughly $160 million in commitments from project finance partners to fund two commercial-scale pl"
- [Terra CO2](https://www.canarymedia.com/articles/clean-industry/terra-co2-says-its-texas-factory-will-cut-carbon-and-cost-from-cement):  — "once we build it, we have a definitive binding agreement with a buyer"
- [PolyPlus Battery Company](https://polyplus.com/polyplus-achieves-major-u-s-battery-manufacturing-milestone-product-line-established-for-protected-lithium-electrodes-and-lithium-seawater-batteries-that-deliver-record-setting-energy-density-of-200/):  — "A one-of-a-kind multi-station pilot line for fabricating protected lithium electrodes (PLEs) and protected graphite elec"
- [Coreshell](https://www.coreshell.com/post/press-release-strategic-funding):  — "This funding will go towards scaling Coreshell's production at its newly-built 4 MWh manufacturing facility in San Leand"
- [Fabri](https://www.linkedin.com/posts/fabri-usa_big-news-coming-soon-fabri-is-already-expanding-activity-7465861595542360064-IgSn):  — "Fabri is already expanding --More space, more capacity, and a facility built around the way we work: software-first, aut"
- [RMFG](https://www.rmfg.com/about):  — "7449 E LANCASTER AVE / FORT WORTH, TX ... Designs become parts on our factory floor."
- [Element Energy](https://www.canarymedia.com/articles/long-duration-energy-storage/the-biggest-grid-storage-project-using-old-batteries-is-online-in-texas):  — "The company is in early stage site selection to build a factory capable of assembling multiple gigawatt-hours of used ba"
- [Element Energy](https://www.canarymedia.com/articles/long-duration-energy-storage/the-biggest-grid-storage-project-using-old-batteries-is-online-in-texas):  — "Now it’s getting real-world data from daily plant operations in the ERCOT energy markets."

### loan (2)
- [Guardian Bikes](https://www.prnewswire.com/news-releases/guardian-bikes-powers-american-comeback-with-nations-first-high-volume-bicycle-frame-manufacturing-plant-302425931.html): 19,000,000 — "Guardian Bikes ... has announced a $19 million financing with JPMorganChase to launch the first large-scale bicycle fram"
- [Joby](https://www.jobyaviation.com/news/joby-selects-dayton-ohio-first-scaled-manufacturing-facility/):  — "it has been invited by the U.S. Department of Energy to submit a Part II Application for financing under the Title XVII "

### delay (1)
- [Ambri](https://www.utilitydive.com/news/xcel-energy-ambri-liquid-metal-battery-test/688707/):  — "Originally slated to begin in 2022, the pilot project with Xcel Energy in Colorado was delayed by setbacks unrelated to "

### acquisition (2)
- [Wildcat Discovery Technologies](https://www.wildcatdiscovery.com/2026/06/04/wildcat-discovery-technologies-and-energyx-announce-joint-venture-for-15000-ton-commercial-lfp-cathode-manufacturing-facility-in-texas/):  — "Holyvolt Group, which acquired Wildcat Discovery Technologies in February 2026"
- [Saronic](https://www.opportunitylouisiana.gov/news/saronic-technologies-investing-300-million-to-expand-franklin-shipyard-creating-3200-jobs-in-louisianas-bayou-region):  — "When Saronic acquired the shipyard in April, it retained the existing workforce of 35 employees and has since grown to m"

## Money & parties (not scored; the sheet has no linked funding facts)
- Party roles: acquirer (4), customer (19), grantor (41), investor (101), lead_investor (20), lender (4), other (2), partner (49)
- Org types: bank (2), corporate (72), federal_agency (26), local_gov (13), nonprofit (6), other (16), state_agency (20), utility (4), vc (81)
- Parties with a parent org: 40; with a program: 32

### Amounts
- Lyten (site_announced): 1,000,000,000 — "today announced plans to invest more than $1 billion to build the world’s first Lithium-Sulfur batte"
- Anthro Energy (grant, selected): 24,900,000 — "the U.S. Department of Energy's (DOE) Office of Manufacturing and Energy Supply Chains (MESC) announ"
- Advano (funding_round): 18,500,000 — "upstart tech company Advano – founded by New Orleanian Alexander Girau – had raised $18.5 million"
- Verdagy (funding_round): 73,000,000 — "Last month, Verdagy closed a $73-million Series B funding round, co-led by Temasek and Shell Venture"
- Noveon Magnetics (funding_round): 215,000,000 — "today announced the close of a $215 million Series C financing led by a $200 million investment from"
- Pyka (funding_round): 37,000,000 — "The Silicon Valley startup, who secured $37m in Series A funding in 2022"
- Atom Power (site_announced): 4,200,000 — "Atom Power, which makes electric vehicle charging equipment, is planning a $4.2 million expansion of"
- Atom Power (incentive, selected): 1,600,000 — "including $1.6 million from the state"
- Atom Power (incentive, selected): 46,000 — "$46,000 from Mecklenburg County"
- Atom Power (incentive, selected): 5,000 — "$5,000 from Lake Norman Economic Development"
- Atom Power (funding_round): 100,000,000 — "Atom Power is growing with the help of a $100 million investment last year by SK, a Korean company t"
- Soelect (partnership): 200,000,000 — "forming a $200 million joint venture with US battery startup Soelect Inc."
- Senra Systems (funding_round): 65,000,000 — "today announced it has raised $65 million in a Series B funding round"
- Re:Build Manufacturing (site_announced): 81,000,000 — "announce an $81 million investment to create a major, innovation-focused manufacturing operation in "
- Re:Build Manufacturing (grant, selected): 1,500,000 — "Re:Build and RIDC received a funding proposal from the Department of Community and Economic Developm"
- Re:Build Manufacturing (grant, selected): 7,000,000 — "a $7 million grant through the Redevelopment Assistance Capital Program"
- TS Conductor (grant, finalized): 28,000,000 — "TS Conductor is receiving $28 million in continued support from the U.S. Department of Energy's Manu"
- Nitricity (funding_round): 10,000,000 — "today announced $10 million in project funding from a strategic mix of capital providers that includ"
- LuxWall (grant, finalized): 31,700,000 — "In November 2023, LuxWall received a $31.7 million grant from the U.S. Department of Energy to suppo"
- Forge Nano (grant, selected): 100,000,000 — "Backed by a $100M U.S. Department of Energy grant and designed with proprietary Atomic Armor™ techno"
- NanoGraf Corporation (customer_award): 10,000,000 — "it was a $10 million US Department of Defense (DoD) contract that made this new 17,000-square-foot f"
- DG Fuels (other): 26,050,000 — "presented a proposal for a legally binding agreement to the St. James Parish Council Wednesday commi"
- Moment Energy (grant, selected): 20,300,000 — "selected by the U.S. Department of Energy (DOE) for a US$20.3 million award to establish the first U"
- Silfab Solar (site_announced): 150,000,000 — "The company is leasing a 785,000-square-foot building located at 7149 Logistics Lane in Fort Mill."
- Silfab Solar (grant, finalized): 2,000,000 — "The council also awarded a $2 million Set-Aside grant to York County to assist with the costs of bui"
- EdgeEnergy (site_announced): 150,000,000 — "the company will be investing $150 million dollars over the next two years in Ohio as they expand ma"
- Guardian Bikes (loan, finalized): 19,000,000 — "Guardian Bikes ... has announced a $19 million financing with JPMorganChase to launch the first larg"
- MetOx Technologies (incentive, finalized): 3,184,500 — "the JDIG agreement authorizes the potential reimbursement to the company of up to $3,184,500, spread"
- Terra CO2 (other): 160,000,000 — "Terra CO2 has lined up roughly $160 million in commitments from project finance partners to fund two"
- Carbice (funding_round): 15,000,000 — "Carbice Corp. successfully closed a $15 million Series A funding round led by Downing Ventures. with"
- Carbice (funding_round): 1,500,000 — "raised $1.5 million in a series seed round co-led by Tech Square Labs and the GRA Venture Fund."
- Nox Metals (funding_round): 11,500,000 — "We are announcing our $11.5M Seed round led by Hyperion, with participation from Palmer Luckey, Y Co"
- Electra (grant, finalized): 50,000,000 — "The corporate contracts were crucial for the $50 million grant commitment by Breakthrough Energy Cat"
- Electra (tax_credit, selected): 8,000,000 — "It will also benefit from an $8 million state tax credit, the maximum amount available under the Col"
- SOLARCYCLE (grant, disbursed): 1,500,000 — "U.S. Department of Energy Solar Energy Technologies Office, which has invested $1.5 million in SOLAR"
- Amprius Technologies (grant, selected): 50,000,000 — "The initial phase of 500 MWh, will be funded in part by the $50 million cost sharing grant selected "
- Saronic Technologies (incentive, selected): 10,000,000 — "Greater Brownsville EDC also committed $10 million toward workforce development initiatives to help "
- REGENT (grant, disbursed): 1,000,000 — "REGENT has received $1 million from the Rhode Island Commerce Department under the First Wave Closin"
- REGENT (tax_credit, finalized): 3,000,000 — "the state has further committed to investing $3M under the Rebuild Rhode Island Tax Credit Act"
- REGENT (incentive, selected): 13,000,000 — "REGENT has committed to creating 300 jobs, with the potential for up to 750, over the next 10 years,"
- … 32 more

### Capacities (initial phase)
- Anthro Energy: 25 GWh/yr
- Anthro Energy: 25 GWh/yr
- Advano: 10 tons/yr
- Advano: 10 tons/yr
- Niron Magnetics: 1500 tons/yr
- Niron Magnetics: 1500 tons/yr
- Terawatt Infrastructure: 29 DC fast chargers
- Terabase Energy: 10 GW/yr of Terafab assembly lines
- OneD Battery Sciences: 100 tons/yr
- OneD Battery Sciences: 100 tons/yr
- KORE Power: 12 GWh/yr
- KORE Power: 12 GWh/yr
- True Anomaly: 73 satellites/yr
- Phoenix Tailings: 200 metric tons/yr
- DG Fuels: 193000000 gallons/yr
- NanoGraf Corporation: 35 tons/yr
- NanoGraf Corporation: 1000 tons/yr
- Moment Energy: 1 GWh/yr
- Electra: 400 aircraft/yr
- Electra: 500 tons/yr
- Electra: 500 tons/yr
- SOLARCYCLE: 6 GW/yr solar glass
- Amprius Technologies: 500 MWh
- Ambri: 1 GW/yr
- Ascend Elements: 250000 EVs/yr worth of cathode active material
- Wildcat Discovery Technologies: 15000 tons/yr
- Anthro Energy: 12000 metric tons/yr
- Peak Energy: 4 GWh/yr
- Sila Nanotechnologies: 5 GWh/yr
- NXTClean Fuels: 45000 barrels/yr
- Mangrove Lithium: 1000 tonnes/yr
- Mangrove Lithium: 500000 EVs/yr supplied
- Coreshell: 4 MWh
- X-energy: 4 Xe-100 reactors
- Lilac Solutions: 3000 tons/yr lithium carbonate
- Hybar: 700000 tons/yr
- Hybar: 630000 tons/yr
- Cyclic Materials: 100 tonnes magnetic material/yr
- Encina: 450000 tons/yr
- Mariana Minerals: 3000 metric tons/yr lithium salts
- … 16 more

### Parties with programs / parent orgs
- Office of Manufacturing and Energy Supply Chains (MESC) — grantor, federal_agency, parent: U.S. Department of Energy, program: Advanced Energy Manufacturing and Recycling Grants Program
- Shell Ventures — lead_investor, corporate, parent: Shell
- GO-Biz — grantor, state_agency, parent: State of California, program: California Competes Tax Credit
- Lotte Chemical Corp. — partner, corporate, parent: Lotte Group
- Lotte Chemical Corp. — partner, corporate, parent: Lotte Group
- Department of Community and Economic Development — grantor, state_agency, parent: Commonwealth of Pennsylvania, program: Pennsylvania First
- Department of Community and Economic Development — grantor, state_agency, parent: Commonwealth of Pennsylvania, program: Redevelopment Assistance Capital Program
- Manufacturing Deployment Office — grantor, federal_agency, parent: U.S. Department of Energy, program: Manufacturing Deployment Office
- Trellis Climate — investor, nonprofit, parent: Prime Coalition
- Barclays Sustainable Impact Capital — lead_investor, bank, parent: Barclays
- Presidio Ventures — investor, vc, parent: Sumitomo Corporation
- U.S. federal government — grantor, federal_agency, program: Inflation Reduction Act
- Coordinating Council for Economic Development — grantor, state_agency, parent: South Carolina Department of Commerce, program: Set-Aside grant
- JPMorganChase — lender, bank, program: Middle Market Banking
- Safran Helicopter Engines — partner, corporate, parent: Safran
- North Carolina Department of Commerce — grantor, state_agency, program: Job Development Investment Grant (JDIG)
- Breakthrough Energy Catalyst — investor, vc, parent: Breakthrough Energy
- Asher Materials — acquirer, corporate, parent: Instar Holdings
- U.S. Navy — customer, federal_agency, parent: U.S. Department of Defense
- Naval Research Laboratory — partner, federal_agency, parent: U.S. Navy
- Blue Canyon Technologies — customer, corporate, parent: RTX
- Breakthrough Energy Catalyst — grantor, nonprofit, parent: Breakthrough Energy
- State of Colorado — grantor, state_agency, program: Colorado Industrial Tax Credit Offering
- Toyota Tsusho — customer, corporate, parent: Toyota Group
- U.S. Department of Energy Solar Energy Technologies Office — grantor, federal_agency, parent: U.S. Department of Energy, program: Solar Energy Technologies Office
- Office of Manufacturing and Energy Supply Chains — grantor, federal_agency, parent: U.S. Department of Energy, program: Bipartisan Infrastructure Law
- Greater Brownsville EDC — grantor, local_gov, program: Workforce development initiatives
- Rhode Island Commerce Department — grantor, state_agency, program: First Wave Closing Fund Act
- State of Rhode Island — grantor, state_agency, program: Rebuild Rhode Island Tax Credit Act
- State of Rhode Island — grantor, state_agency, program: Qualified Jobs Program
- Greycroft — investor, vc, program: Greycroft Coca-Cola System Sustainability Fund
- U.S. Department of Energy — grantor, federal_agency, program: Advanced Energy Manufacturing and Recycling Program
- Office of Manufacturing and Energy Supply Chains — grantor, federal_agency, parent: U.S. Department of Energy, program: Advanced Energy Manufacturing and Recycling Program
- Kentucky Economic Development Finance Authority — grantor, state_agency, program: Kentucky Business Investment program
- Kentucky Economic Development Finance Authority — grantor, state_agency, program: Kentucky Enterprise Initiative Act (KEIA)
- Governor's Office of Business and Economic Development (GO-Biz) — grantor, state_agency, parent: State of California, program: CalCompetes
- GM Ventures — investor, vc, parent: General Motors
- RWE Americas — customer, corporate, parent: RWE
- U.S. Department of Energy — grantor, federal_agency, program: DAC Hubs
- Louisiana Economic Development — grantor, state_agency, parent: State of Louisiana
- … 19 more

## Schema gaps reported by the extractor
- Lyten: Full-scale capacity is up to 10 GWh/yr; Phase 1 capacity not disclosed.
- Lyten: Jobs grow from 200 initially to more than 1,000 at full capacity.
- Lyten: Site on 125-acre campus; MOU with Dermody Properties, contractual terms with Reno-Tahoe Airport Authority not yet finalized.
- Lyten: $1B+ investment figure appears to be for full build-out, not specifically Phase 1.
- Lyten: Existing semi-automated pilot facility in San Jose, CA has been producing CAM, lithium metal anodes and cells since May 2023.
- Lyten: Company has raised more than $425 million cumulatively from Stellantis, FedEx, Honeywell, Walbridge, European Investment Fund, Luxembourg Future Fund.
- Twelve: Shopify, Alaska Airlines and Microsoft are named as first offtake customers for E-Jet fuel from the plant via existing partnerships; no new contract amounts or dates given.
- Twelve: No investment, job, capacity or production-start figures disclosed for the Moses Lake facility.
- Anthro Energy: Facility capacity is also stated as 12,000 metric tons of advanced electrolyte per year.
- Anthro Energy: The 114 full-time jobs figure is stated as 'at full capacity'; no initial-phase job figure given.
- Anthro Energy: Facility is a conversion of an existing manufacturing site rather than new construction.
- Anthro Energy: Anthro Energy dedicated $2.5 million to local community benefit initiatives (workforce development, education).
- Anthro Energy: Grant is funded under the Bipartisan Infrastructure Law.
- Anthro Energy: State of Kentucky support and Kentucky Cabinet for Economic Development endorsement mentioned without any incentive amount.
- Advano: Capacity of up to 10 tons/yr of silicon powder is an aspirational target ('Girau hopes').
- Advano: A possible second funding round is in the works to fuel expansions.
- Advano: The $18.5M raise was reported in January 2020 (article refers to 'last month').
- Verdagy: The Series B closed in August 2023 ('last month'); exact close date not given.
- Verdagy: Facility sqft stated as 'more than 100,000 sq. ft.'.
- Verdagy: Verdagy expects to double its total employee count by summer 2024; no absolute job figure given.
- Verdagy: Existing Moss Landing, CA site remains focused on R&D and commercial pilot-plant operations.
- Verdagy: Factory will produce the eDynamic 20 MW electrolyzer module; no annual factory capacity stated.
- Verdagy: Company plans larger-scale production facilities in other, unspecified locations.
- Noveon Magnetics: The Series C also facilitates secondary share sales by certain existing shareholders; the secondary amount is not disclosed.
- Noveon Magnetics: Proceeds are meant to expand domestic sintered NdFeB magnet capacity beyond 2,000 tons per year; no specific site, timeline or project cost is given.
- Noveon Magnetics: OneIM will appoint two new Series C board members.
- Noveon Magnetics: The article references prior multi-year supply agreements with General Motors and ABB and partnerships with Lynas, Solvay, LG Electronics and Kangwon Energy from the past 12 months; these are not new announcements in this article.
- Niron Magnetics: CEO said first magnets will be on the market in early 2026; unclear whether from the Minneapolis pilot plant or Sartell.
- Niron Magnetics: Company operates an existing pilot plant in Minneapolis, MN.
- Niron Magnetics: Stellantis is described as a partner betting on the magnets; no new deal terms announced.
- Niron Magnetics: Company is considering an even larger future plant (no location given).
- Nanoscale Components: Move to a new, larger facility tripling existing space; the new facility's exact location and square footage are not stated (dateline is Bedford, NH).
- Nanoscale Components: The facility will demonstrate roll-to-roll prelithiation equipment automated for 24/7 operation and designed for GWh-scale deployment; large-scale equipment deployment is described as coming 'soon' with no date given.
- Pyka: Article publication date not stated; likely early 2024.
- Pyka: California Competes Tax Credit amount not disclosed.
- Pyka: Renovation and installation work at the Alameda site is underway (start date not given), with a planned mid-2024 move-in (2024-07-01); not explicitly a production start.
- Pyka: Series A of $37M was closed in 2022 (historical, mentioned for context).
- Atom Power: State incentive is performance-based: Atom must meet hiring targets over the next four years.
- Atom Power: New jobs carry an average annual salary of $92,000; Atom currently has 82 employees.
- Atom Power: SK $100M investment occurred in 2022 (reported here as background), exact date not given.
- Atom Power: Expansion includes a development center to connect EV chargers with solar panels, batteries and switches.
- Atom Power: Company recently opened an R&D center in Raleigh, NC (no date given).
- Terawatt: The site is an EV fleet charging depot rather than a manufacturing factory; it is treated as an operational site opening.
- Terawatt: Terawatt previously launched pilot charging sites in Commerce and Rancho Dominguez, CA, with no dates given.
- Terawatt: Terawatt announced a coalition with shippers and carriers to pilot heavy-duty battery-electric operations at six owned charging hubs along the I-10 corridor; no partners are named.
- Terawatt: Terawatt is developing 15 sites across several states, including the I-10 corridor from the Port of Long Beach to El Paso, TX.
- Soelect: The JV was formalized only via a memorandum of understanding signed on a Tuesday; not a definitive agreement.
- Soelect: The $200 million is the JV investment total; each party's share is not disclosed.
- Soelect: The JV mass-production site location in the US is not specified.
- Soelect: Pilot production in Greensboro is ongoing; no start date given.
- Standard Bots: The post's publication date (2025-07-31) was inferred from the LinkedIn activity ID because the page shows only a relative '1y' date.
- Standard Bots: The opening month (June 2025) is inferred from the phrase 'last month', so the milestone date is approximate.
- Standard Bots: The post describes a factory opening (a ribbon cutting) and does not explicitly confirm that production started.
- Senra Systems: Factory 2 opening date not specified beyond 'newly opened'; brought online within months of lease signing.
- Senra Systems: Company aims to grow from ~1,000 harnesses/month on average to 10,000/month by next year (2027) across its footprint.
- Senra Systems: Factory 3 location and timing not disclosed.
- Senra Systems: Total funding raised to date over $112 million.
- Senra Systems: Hired former SpaceX CIO Ken Venner as chief technology and product officer.
- Twelve: First customers for the plant's E-Jet fuel are existing partners Shopify, Alaska Airlines and Microsoft; no new offtake terms or volumes disclosed.
- Twelve: No investment, job, capacity, or production start figures were disclosed for the Moses Lake plant.
- Blue Water Autonomy: Physical construction ('welding of steel') of the first 150-foot autonomous production ship at Conrad is expected to begin 'in a few months' from September 2025; too vague to convert to a milestone date.
- Blue Water Autonomy: The first production ship is expected to hit the water in 2026.
- Blue Water Autonomy: Blue Water built a 145-ton test vessel outside Boston that it is testing at sea; the arrangement with Conrad is contract manufacturing, not a company-owned factory.
- Blue Water Autonomy: Deal value and number of ships were not disclosed.
- Amber Wave: The publication date is given only as 'Aug 16th' with no year, so announced_on and the opening milestone date are left null; the article implies the opening happened on or shortly before Aug 16.
- Amber Wave: Amber Wave was formerly Summit Sustainable Ingredients, LLC, a portfolio company of Summit Ag Investors / Summit Agricultural Group; it rebranded in July and hired Randy Cimorelli as CEO.
- Amber Wave: State officials say the facility will be the largest wheat protein producer in North America within two years, implying a ramp to full rate with no stated capacity figure.
- Amber Wave: The site includes a new wheat mill and vital wheat gluten plant, plus a retrofit of the existing Prairie Horizon Agri-Energy corn ethanol plant to make ethanol from wheat starch.
- Re:Build Manufacturing: Total $81M investment comprises $50M from Re:Build and $31M in renovations funded by grants/loans from the Commonwealth, Westmoreland County and Richard King Mellon Foundation plus equity from RIDC and WCIDC; individual shares beyond the two state grants not disclosed.
- Re:Build Manufacturing: Grants were offered jointly to Re:Build and RIDC via a DCED funding proposal; the company and RIDC were also encouraged to apply for Pennsylvania Industrial Development Authority (PIDA) loans (no amount).
- Re:Build Manufacturing: RIDC and WCIDC entered a purchase agreement with the Redevelopment Authority of the City of New Kensington to acquire and redevelop the entire park.
- Re:Build Manufacturing: 300 jobs to be created within the next three years; facility is Re:Build's first ground-up U.S. manufacturing facility and new regional headquarters, built from portions of five existing buildings.
- Re:Build Manufacturing: Workforce training partnership with Westmoreland County Community College.
- Terabase: Woodland facility capacity is stated as 'more than 10 GW of Terafabs per year'; first 1 GW of assembly lines currently in production.
- Terabase: Terafab was field-tested in 2022 building 10 MW of a 400 MW solar site in Texas.
- Terabase: Terafab system to be commercially deployed on several projects starting Q3 2023 (field deployments, not a fixed factory site).
- Terabase: Partnership with First Solar includes integration with Series 7 modules and a closed-loop packaging recycling system.
- Sila Nanotechnologies: The article text is only the company boilerplate; the press release body describing the Washington State auto-scale factory announcement (per the URL/title) is missing, so no publication date, milestone dates, investment or job figures are available.
- Sila Nanotechnologies: The boilerplate says production is underway at Moses Lake but gives no production start date.
- Sila Nanotechnologies: The boilerplate lists backers (8VC, Atreides Management, Bessemer Venture Partners, Coatue, In-Q-Tel, Matrix Partners, Sutter Hill Ventures, T. Rowe Price-advised funds) but no specific funding round or amount.
- … 479 more

## Misses
- [Twelve](https://www.commerce.wa.gov/twelve-announces-plans-to-scale-production-of-sustainable-aviation-fuel-made-from-co2-in-washington-state/): expected **production_start:planned** 2024-07-01; extracted [site_announced, construction_start:planned]
- [Noveon Magnetics](https://www.prnewswire.com/news-releases/noveon-magnetics-completes-215-million-series-c-to-expand-us-rare-earth-magnet-manufacturing-capacity-302664196.html): expected **site_announced**; extracted [funding_round]
- [Pyka](https://www.flypyka.com/press-releases/pyka-secures-110-000-sq-ft-historic-aviation-hangar-in-the-bay-area-for-scaled-manufacturing-and-r-d): expected **production_start:planned** 2024-07-01; extracted [site_announced, tax_credit, funding_round]
- [Terawatt](https://www.terawattinfrastructure.com/blog/terawatt-infrastructure-opens-ev-fleet-charging-site-in-los-angeles): expected **site_announced**; extracted [production_start:actual]
- [Terawatt](https://www.terawattinfrastructure.com/blog/terawatt-infrastructure-opens-ev-fleet-charging-site-in-los-angeles): expected **production_start:planned** 2024-03-31; extracted [production_start:actual]
- [Soelect](https://www.kedglobal.com/batteries/newsView/ked202204260022?_gl=1*okc74m*_ga*MVRtVFVEcElVRzNoWURKdTlfcU5TUDJ4VWlxcXN0SlY1NDFDRzJkMmdiVjNqNHN2blFlMjdIYjdLODZsNDhBTg..): expected **site_announced**; extracted [partnership, production_start:planned, production_start:actual]
- [Standard Bots](https://www.linkedin.com/posts/standard-bots_tbt-manufacturing-automation-activity-7356685225340362754-klJj?utm_source=li_share&utm_content=feedcontent&utm_medium=g_dt_web&utm_campaign=copy): expected **site_announced**; extracted [production_start:actual]
- [Standard Bots](https://www.linkedin.com/posts/standard-bots_tbt-manufacturing-automation-activity-7356685225340362754-klJj?utm_source=li_share&utm_content=feedcontent&utm_medium=g_dt_web&utm_campaign=copy): expected **production_start:planned** 2025-08-01; extracted [production_start:actual]
- [Twelve](https://www.commerce.wa.gov/news/twelve-announces-plans-to-scale-production-of-sustainable-aviation-fuel-made-from-co2-in-washington-state/): expected **production_start:planned** 2024-07-01; extracted [site_announced, construction_start:planned]
- [Blue Water Autonomy](https://www.axios.com/2025/09/24/blue-water-conrad-asv-louisiana): expected **site_announced**; extracted [partnership]
- [Amber Wave](https://www.feedandgrain.com/grain-handling-processing/news/15384912/amber-wave-opens-wheat-protein-plant-in-kansas): expected **site_announced**; extracted [production_start:actual]
- [Re:Build Manufacturing](https://rebuildmanufacturing.com/articles/rebuild-manufacturing-announcement): expected **production_start:planned** 2026-01-01; extracted [site_announced, grant, grant]
- [Terabase](https://www.terabase.energy/resources/terabase-energy-launches-terafab-automated-field-factory-to-accelerate-the-deployment-of-solar-power-plants): expected **site_announced**; extracted [production_start:actual, partnership]
- [Terabase](https://www.terabase.energy/resources/terabase-energy-launches-terafab-automated-field-factory-to-accelerate-the-deployment-of-solar-power-plants): expected **production_start:planned** 2023-05-11; extracted [production_start:actual, partnership]
- [Sila Nanotechnologies](https://www.silanano.com/press/press-releases/sila-establishes-a-new-auto-scale-factory-in-washington-state-to-manufacture-next-gen-anode-materials): expected **site_announced**; extracted [production_start:actual]
- [Sila Nanotechnologies](https://www.silanano.com/press/press-releases/sila-establishes-a-new-auto-scale-factory-in-washington-state-to-manufacture-next-gen-anode-materials): expected **production_start:planned** 2025-12-31; extracted [production_start:actual]
- [Waymo](https://waymo.com/blog/2025/05/scaling-our-fleet-through-us-manufacturing/): expected **site_announced**; extracted [production_start:actual, partnership]
- [Inlyte Energy](https://www.prnewswire.com/news-releases/inlyte-energy-and-horien-announce-strategic-partnership-to-scale-iron-sodium-battery-manufacturing-in-the-united-states-302412502.html): expected **site_announced**; extracted [partnership, production_start:planned]
- [Formlabs](https://www.linkedin.com/posts/ma-executive-office-of-economic-development-eoed_teamma-activity-7411785100209799168-Ac7P): expected **site_announced**; extracted [production_start:actual]
- [Formlabs](https://www.linkedin.com/posts/ma-executive-office-of-economic-development-eoed_teamma-activity-7411785100209799168-Ac7P): expected **production_start:planned** 2026-01-01; extracted [production_start:actual]
- [Mycoworks](https://www.linkedin.com/pulse/evolving-mycoworks-from-growing-mycelium-empowering-scullin-dawef?trk=public_post_feed-article-content): expected **production_at_rate:actual** 2025-10-16; extracted [cancellation, status_change]
- [KORE Power](https://www.commercialsearch.com/news/1-25b-battery-gigafactory-set-to-rise-near-phoenix/): expected **site_announced**; extracted [construction_start:planned, production_at_rate:planned, status_change]
- [KORE Power](https://www.commercialsearch.com/news/1-25b-battery-gigafactory-set-to-rise-near-phoenix/): expected **production_start:planned** 2025-06-01; extracted [construction_start:planned, production_at_rate:planned, status_change]
- [True Anomaly](https://www.prnewswire.com/news-releases/true-anomaly-announces-grand-opening-of-gravityworks-spacecraft-manufacturing-facility-and-federal-approval-to-demonstrate-non-earth-imaging-and-rendezvous-and-proximity-operations-301904094.html): expected **site_announced**; extracted [production_start:actual]
- [True Anomaly](https://www.prnewswire.com/news-releases/true-anomaly-announces-grand-opening-of-gravityworks-spacecraft-manufacturing-facility-and-federal-approval-to-demonstrate-non-earth-imaging-and-rendezvous-and-proximity-operations-301904094.html): expected **production_start:planned** 2023-08-17; extracted [production_start:actual]
- [Phoenix Tailings](https://greentownlabs.com/phoenix-tailings-is-building-the-u-s-supply-chain-for-waste-free-net-zero-rare-earth-metals/): expected **site_announced**; extracted [production_start:planned, funding_round]
- [DG Fuels](https://dgfuels.com/2024/11/07/announcement-of-new-minnesota-saf-plant-advances-strategy-to-lead-the-world-in-decarbonizing-air-travel/): expected **production_start:planned** 2030-01-01; extracted [site_announced]
- [Forge Nano](https://www.forgenano.com/forge-nano-to-launch-u-s-battery-manufacturing-business-north-carolina-gigafactory-planned-for-2026/): expected **production_start:planned** 2026-12-01; extracted [site_announced, grant]
- [XNRGY](https://www.prnewswire.com/news-releases/xnrgy-breaks-ground-on-sustainable-manufacturing-facility-in-mesa-arizona-302114870.html): expected **site_announced**; extracted [construction_start:planned]
- [XNRGY](https://www.prnewswire.com/news-releases/xnrgy-breaks-ground-on-sustainable-manufacturing-facility-in-mesa-arizona-302114870.html): expected **production_start:planned** 2025-01-01; extracted [construction_start:planned]
- [Moment Energy](https://www.momentenergy.com/news-articles/moment-energy-awarded-us-20-3-million-by-us-dept-of-energy-to-establish-first-certified-ev-battery-repurposing-facility-in-the-us): expected **site_announced**; extracted [grant]
- [Guardian Bikes](https://www.prnewswire.com/news-releases/guardian-bikes-powers-american-comeback-with-nations-first-high-volume-bicycle-frame-manufacturing-plant-302425931.html): expected **production_start:planned** 2026-01-01; extracted [loan, site_announced]
- [Terra CO2](https://www.canarymedia.com/articles/clean-industry/terra-co2-says-its-texas-factory-will-cut-carbon-and-cost-from-cement): expected **construction_start:planned** 2025-06-30; extracted [site_announced, other, other]
- [Carbice](http://carbice.com/newsroom/): expected **site_announced**; extracted [production_start:actual, funding_round, funding_round, customer_award, partnership, partnership, partnership, partnership, partnership, partnership]
- [Carbice](http://carbice.com/newsroom/): expected **production_start:planned** 2022-08-31; extracted [production_start:actual, funding_round, funding_round, customer_award, partnership, partnership, partnership, partnership, partnership, partnership]
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/): expected **site_announced**; extracted [grant, tax_credit, customer_award, customer_award, production_start:planned]
- [Saronic](https://www.brownsvilletx.gov/m/newsflash/home/detail/3309): expected **construction_start:planned** 2026-12-31; extracted [site_announced, incentive]
- [Saronic](https://www.brownsvilletx.gov/m/newsflash/home/detail/3309): expected **production_start:planned** 2028-12-31; extracted [site_announced, incentive]
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island): expected **site_announced**; extracted [construction_start:actual, production_start:planned, grant, tax_credit, incentive, funding_round]
- [Ambri](https://www.utilitydive.com/news/xcel-energy-ambri-liquid-metal-battery-test/688707/): expected **site_announced**; extracted [delay, construction_start:actual, production_start:planned]
- [Whisper Aero](https://www.futureflight.aero/news-article/2023-07-25/whisper-aero-breaks-ground-new-flight-test-center-tennessee): expected **site_announced**; extracted [construction_start:actual]
- [harbinger motors](https://harbingermotors.com/medium-duty-ev-manufacturer-harbinger-greatly-expands-its-footprint-with-new-headquarters-in-garden-grove/): expected **site_announced**; extracted [funding_round, partnership]
- [Senra Systems](https://www.senrasystems.us/media/factory-2): expected **site_announced**; extracted [production_start:actual]
- [LiCycle](https://li-cycle.com/operations/): expected **site_announced**; extracted [nothing for this company]
- [Monolith](https://www.bicmagazine.com/departments/operations/monolith-materials-broke-ground-on-its-manufacturing-plant-i/): expected **site_announced**; extracted [construction_start:actual, partnership]
- [Anthro Energy](https://newkentuckyhome.ky.gov/Newsroom/NewsPage/20251212_AnthroEnergy): expected **status_change**; extracted [site_announced, incentive, incentive]
- [Overland AI](https://www.overland.ai/news/overland-ai-raises-100-million-to-scale-ground-autonomy-with-u-s-armed-forces): expected **site_announced**; extracted [funding_round, partnership]
- [US Forged Rings](https://www.usfr.com/copy-of-press-release): expected **production_start:planned** 2028-07-01; extracted [site_announced]
- [PolyPlus Battery Company](https://polyplus.com/polyplus-achieves-major-u-s-battery-manufacturing-milestone-product-line-established-for-protected-lithium-electrodes-and-lithium-seawater-batteries-that-deliver-record-setting-energy-density-of-200/): expected **site_announced**; extracted [other]
- [LightForce](https://3dprint.com/302284/lightforce-orthodontics-snags-80m-for-3d-printed-braces-expansion-plans-hiring-spree/): expected **site_announced**; extracted [funding_round, construction_start:actual]
- [Helion Energy](https://www.helionenergy.com/articles/helion-energy-breaks-ground-on-site-of-its-next-generation-fusion-facility-in-everett-washington/): expected **site_announced**; extracted [construction_start:actual]
- [Helion Energy](https://www.helionenergy.com/articles/helion-energy-breaks-ground-on-site-of-its-next-generation-fusion-facility-in-everett-washington/): expected **production_start:planned** 2028-06-01; extracted [construction_start:actual]
- [6K Energy](https://www.6kinc.com/6k-energy-production-facilities/): expected **site_announced**; extracted [grant]
- [6K Energy](https://www.6kinc.com/6k-energy-production-facilities/): expected **production_start:planned** 2024-10-01; extracted [grant]
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/lakeview-rng/): expected **production_start:planned** 2026-06-01; extracted [site_announced, status_change]
- [Coreshell](https://www.coreshell.com/post/press-release-strategic-funding): expected **site_announced**; extracted [funding_round, other]
- [Mariana Minerals](https://marianaminerals.com/news/news-lithium-one): expected **production_start:planned** 2027-06-30; extracted [site_announced]
- [Mariana Minerals](https://marianaminerals.com/news/news-lithium-one): expected **construction_start:planned** 2025-07-01; extracted [site_announced]
- [Our Next Energy](https://one.ai/one-welcomes-mujeeb-ijaz-as-ceo-and-announces-strategic-investment-to-drive-next): expected **site_announced**; extracted [funding_round, production_start:actual, production_at_rate:planned]
- [Our Next Energy](https://one.ai/one-welcomes-mujeeb-ijaz-as-ceo-and-announces-strategic-investment-to-drive-next): expected **production_start:planned** 2027-03-01; extracted [funding_round, production_start:actual, production_at_rate:planned]
- [Lilac Solutions](https://lilacsolutions.com/2024/02/with-145m-in-fresh-capital-were-building-the-foundation-of-a-u-s-lithium-supply-chain/): expected **site_announced**; extracted [funding_round, production_start:planned, production_start:planned]
- [Cerebras](https://x.com/andrewdfeldman/status/2035341908835221616): expected **site_announced**; extracted [production_start:planned]
- [Fabri](https://www.linkedin.com/posts/fabri-usa_big-news-coming-soon-fabri-is-already-expanding-activity-7465861595542360064-IgSn): expected **site_announced**; extracted [other]
- [Dimensional Energy](https://www.dimensionalenergy.com/post/2024-year-in-review): expected **site_announced**; extracted [status_change, production_start:planned, funding_round]
- [Antora Energy](https://www.antora.com/insights/ca-manufacturing): expected **production_at_rate:actual** 2026-04-02; extracted [production_start:actual]
- [RMFG](https://www.rmfg.com/about): expected **construction_start:planned** 2025-11-19; extracted [other]
- [RMFG](https://www.rmfg.com/about): expected **production_start:planned** 2025-11-28; extracted [other]
- [RMFG](https://www.rmfg.com/about): expected **site_announced**; extracted [other]
- [Cyclic Materials](https://www.cyclicmaterials.earth/news/cyclic-materials-opens-hub100-facility-for-production-of-recycled-mixed-rare-earth-oxide): expected **site_announced**; extracted [production_start:actual]
- [Cyclic Materials](https://www.cyclicmaterials.earth/news/cyclic-materials-opens-hub100-facility-for-production-of-recycled-mixed-rare-earth-oxide): expected **production_start:planned** 2024-06-04; extracted [production_start:actual]
- [Verne](https://dced.pa.gov/newsroom/governor-shapiro-announces-4-5-million-investment-from-energy-storage-innovator-verne-inc-to-build-its-first-manufacturing-facility-in-lycoming-county-creating-61-jobs-and-growing-pennsylvania/): expected **site_announced**; extracted [nothing for this company]
- [Verne](https://dced.pa.gov/newsroom/governor-shapiro-announces-4-5-million-investment-from-energy-storage-innovator-verne-inc-to-build-its-first-manufacturing-facility-in-lycoming-county-creating-61-jobs-and-growing-pennsylvania/): expected **production_start:planned** 2027-01-01; extracted [nothing for this company]
- [Encina](https://www.encina.com/encina-announces-1-1-billion-investment-in-new-advanced-manufacturing-facility-in-pennsylvania/): expected **production_start:planned** 2024-10-01; extracted [site_announced, construction_start:planned, production_at_rate:planned]
- [JetZero](https://www.jetzero.aero/jetzero-selectsgreensborro-nc-for-factory): expected **production_start:planned** 2030-01-01; extracted [site_announced, construction_start:planned, production_at_rate:planned, partnership]
- [CleanFiber](https://www.highergov.com/grant/DEMS0000136/): expected **site_announced**; extracted [grant, grant]
- [CleanFiber](https://www.highergov.com/grant/DEMS0000136/): expected **production_start:planned** 2025-12-12; extracted [grant, grant]
- [Bright Feeds](https://www.newswire.com/news/bright-feeds-connecticuts-new-food-waste-recycler-opens-plant-in-berlin-21865778): expected **site_announced**; extracted [production_start:actual]
- [Saronic](https://www.workboat.com/saronic-raises-600-million-to-build-autonomous-vessels): expected **production_start:planned** 2027-01-01; extracted [funding_round, site_announced, site_announced, funding_round]
- [LiCycle](https://www.wxxinews.org/local-news/2023-10-23/li-cycle-to-pause-construction-work-on-rochester-project): expected **delay**; extracted [nothing for this company]
- [Element Energy](https://www.canarymedia.com/articles/long-duration-energy-storage/the-biggest-grid-storage-project-using-old-batteries-is-online-in-texas): expected **site_announced**; extracted [other, other]
- … 8 more

## Value mismatches
- [Lyten](https://lyten.com/2024/10/15/lyten-announces-plans-to-build-the-worlds-first-lithium-sulfur-battery-gigafactory-in-nevada/) production_start:planned: expected 2027-07-01, got 2027-01-01 — "Phase 1 of the facility is scheduled to come online in 2027."
- [Lyten](https://lyten.com/2024/10/15/lyten-announces-plans-to-build-the-worlds-first-lithium-sulfur-battery-gigafactory-in-nevada/) full_time_jobs: sheet 1000, extracted 200
- [Advano](https://www.bizneworleans.com/new-orleans-tech-startup-advano-raises-18-5-million/) announced_on: expected 2020-01-28, got 2020-02-05
- [Verdagy](https://verdagy.com/verdagy-to-manufacture-hydrogen-electrolyzers-in-its-new-advanced-silicon-valley-facility/) production_start:planned: expected 2025-03-01, got 2024-01-01 — "The commencement of operations at Verdagy's highly automated manufacturing facility will start in Q1 2024."
- [Pyka](https://www.flypyka.com/press-releases/pyka-secures-110-000-sq-ft-historic-aviation-hangar-in-the-bay-area-for-scaled-manufacturing-and-r-d) announced_on: expected 2024-03-24, got null
- [TS Conductor](https://www.wtoc.com/2026/05/13/ts-conductor-opens-134m-manufacturing-plant-hardeeville-plans-hire-hundreds/) cost_mm: sheet 134, extracted 42
- [OneD Battery Sciences](https://www.geekwire.com/2025/next-gen-battery-company-oned-shutters-pilot-manufacturing-site-in-wash-citing-tariff-impacts/) production_start:actual: expected 2025-05-12, got 2024-08-01 — "the California battery company announced it had successfully completed and commissioned the site, which was producing SINANODE"
- [OneD Battery Sciences](https://www.geekwire.com/2025/next-gen-battery-company-oned-shutters-pilot-manufacturing-site-in-wash-citing-tariff-impacts/) cost_mm: sheet 15, extracted 20
- [Nitricity](https://www.nitricity.co/news/nitricity-announces-10-million-in-fresh-funding-for-first-of-a-kind-organic-fertilizer-plant) production_start:planned: expected 2026-12-31, got 2026-01-01 — "Slated for operation in 2026"
- [Inlyte Energy](https://www.prnewswire.com/news-releases/inlyte-energy-and-horien-announce-strategic-partnership-to-scale-iron-sodium-battery-manufacturing-in-the-united-states-302412502.html) production_start:planned: expected 2027-01-01, got 2027-12-31 — "Inlyte Factory 1, scheduled to come online by 2027"
- [LuxWall](https://www.luxwall.com/luxwall-open-new-manufacturing-facility/) full_time_jobs: sheet 450, extracted 277
- [Amogy](https://amogy.co/amogy-expands-operations-to-houston-new-40-million-manufacturing-facility-to-open-early-2024/) production_start:planned: expected 2024-03-01, got 2024-01-01 — "Set to be operational in early 2024, the manufacturing facility, an investment of over $40 million"
- [Amogy](https://amogy.co/amogy-expands-operations-to-houston-new-40-million-manufacturing-facility-to-open-early-2024/) announced_on: expected 2023-09-01, got 2023-09-19
- [Phoenix Tailings](https://greentownlabs.com/phoenix-tailings-is-building-the-u-s-supply-chain-for-waste-free-net-zero-rare-earth-metals/) production_start:planned: expected 2025-09-30, got 2025-07-01 — "It's building a refining facility in Exeter, NH that's on track to begin operations this summer"
- [Forge Nano](https://www.forgenano.com/forge-nano-to-launch-u-s-battery-manufacturing-business-north-carolina-gigafactory-planned-for-2026/) announced_on: expected 2023-11-15, got null
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/) announced_on: expected 2022-11-14, got 2024-01-18
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/) production_start:planned: expected 2028-01-01, got 2027-01-01 — "During 3 years of construction, from 2024 – 2027"
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/) cost_mm: sheet 4960, extracted 3800
- [DG Fuels](https://dgfuels.com/2024/01/19/clean-fuel-company-dg-fuels-details-26-million-community-benefits-agreement-to-st-james-parish-council/) construction_jobs: sheet 10426, extracted 2117
- [XNRGY](https://www.prnewswire.com/news-releases/xnrgy-breaks-ground-on-sustainable-manufacturing-facility-in-mesa-arizona-302114870.html) sqft: sheet 1000000, extracted 275000
- [Silfab Solar](https://silfabsolar.com/silfab-solar-growing-us-presence-by-establishing-flagship-operation-in-york-county/) production_start:planned: expected 2024-10-01, got 2024-07-01 — "Operations are expected to be online in the third quarter of 2024."
- [Antora Energy](https://antoraenergy.com/manufacturing-facility) sqft: sheet 100000, extracted 50000
- [Electra (Electric Aviation)](https://www.manufacturingdive.com/news/electra-beehive-ohio-gkn-rtx-doncasters-farnborough-air-show-2026/826082/) construction_start:planned: expected 2027-12-31, got 2027-01-01 — "Design work is expected to begin immediately with construction set to start in 2027."
- [MetOx Technologies](https://edpnc.com/news/metox-international-announcement/) announced_on: expected 2024-10-22, got 2024-12-18
- [Electra](https://trellis.net/article/electra-gets-50-million-grant-low-carbon-iron-factory/) production_start:planned: expected 2026-12-31, got 2026-07-01 — "The 130,000-square-foot facility in Jefferson County is scheduled to open by mid-2026."
- [Amprius](https://amprius.com/about/news-and-events/amprius-technologies-selects-colorado-for-gigawatt-hour-scale-factory-site/) production_start:planned: expected 2025-12-31, got 2025-01-01 — "The initial phase is expected to create over 330 new jobs and be operational in 2025."
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island) production_start:planned: expected 2026-07-01, got 2026-01-01 — "The 255,000 square foot Seaglider Manufacturing Facility will come online in Rhode Island in 2026."
- [REGENT](https://www.regentcraft.com/news/groundbreaking-worlds-first-seaglider-manufacturing-facility-takes-shape-in-rhode-island) sqft: sheet 225000, extracted 255000
- [Ascend Elements](https://www.prnewswire.com/news-releases/ascend-elements-to-invest-up-to-1-billion-in-southwest-kentucky-ev-battery-materials-manufacturing-facility-301597102.html) production_start:planned: expected 2026-09-01, got 2023-12-31 — "the 500,000-square-foot Apex 1 facility will begin operations in late 2023"
- [Ascend Elements](https://www.prnewswire.com/news-releases/ascend-elements-to-invest-up-to-1-billion-in-southwest-kentucky-ev-battery-materials-manufacturing-facility-301597102.html) cost_mm: sheet 1000, extracted 310
- [Ascend Elements](https://www.prnewswire.com/news-releases/ascend-elements-to-invest-up-to-1-billion-in-southwest-kentucky-ev-battery-materials-manufacturing-facility-301597102.html) sqft: sheet 1000000, extracted 500000
- [Whisper Aero](https://www.futureflight.aero/news-article/2023-07-25/whisper-aero-breaks-ground-new-flight-test-center-tennessee) sqft: sheet 50000, extracted 8000
- [Monolith](https://www.bicmagazine.com/departments/operations/monolith-materials-broke-ground-on-its-manufacturing-plant-i/) full_time_jobs: sheet 60, extracted 50
- [Wildcat Discovery Technologies](https://www.wildcatdiscovery.com/2026/06/04/wildcat-discovery-technologies-and-energyx-announce-joint-venture-for-15000-ton-commercial-lfp-cathode-manufacturing-facility-in-texas/) construction_jobs: sheet 800, extracted 1200
- [Peak Energy](https://greatersacramento.com/press-release/peak-energy-selects-sacramento-to-build-americas-first-sodium-ion-grid-storage-factory/) production_start:planned: expected 2027-04-01, got 2027-01-01 — "are expected to enter production and begin shipments in Q1 2027"
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/port-westward/) announced_on: expected 2023-01-01, got 2023-08-02
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/port-westward/) production_start:planned: expected 2028-06-01, got 2028-01-01 — "Anticipated Operations Start 2028"
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/port-westward/) full_time_jobs: sheet 300, extracted 240
- [NXTClean Fuels](https://nxtclean.com/projects-facilities/port-westward/) construction_jobs: sheet 3000, extracted 3500
- [Climeworks](https://www.opportunitylouisiana.gov/news/climeworks-proposes-50-million-investment-to-expand-louisianas-direct-air-capture-hub-into-southwest-louisiana) cost_mm: sheet 100, extracted 50
- [Climeworks](https://www.opportunitylouisiana.gov/news/climeworks-proposes-50-million-investment-to-expand-louisianas-direct-air-capture-hub-into-southwest-louisiana) construction_jobs: sheet 329, extracted 800
- [Crusoe](https://www.crusoe.ai/resources/newsroom/crusoe-announces-new-manufacturing-facility-to-produce-modular-ai-factories) production_start:planned: expected 2026-10-01, got 2026-07-01 — "Crusoe expects the first factory-produced Crusoe Spark modules to be completed Q3 2026."
- [OneH2](https://governor.sc.gov/news/2023-12/oneh2-expands-us-footprint-first-south-carolina-operation-york-county) production_start:planned: expected 2026-06-01, got 2024-01-01 — "Operations will be online in stages, starting in the first quarter of 2024 with the initial workforce."
- [Lilac Solutions](https://lilacsolutions.com/2024/02/with-145m-in-fresh-capital-were-building-the-foundation-of-a-u-s-lithium-supply-chain/) production_start:planned: expected 2026-07-01, got 2026-12-31 — "we'll propose to regulators a first phase of commercial production totaling 3,000 tonnes per year of lithium carbonate by 2026"
- [Cerebras](https://x.com/andrewdfeldman/status/2035341908835221616) production_start:planned: expected 2026-10-01, got null — "120,000 sq ft of new manufacturing capacity is coming online in the next few months."
- [Hybar](https://www.prnewswire.com/news-releases/hybar-produces-its-first-steel-rebar-302470801.html) cost_mm: sheet 470, extracted 1000
- [Infinitum](https://goinfinitum.com/infinitum-among-14-companies-selected-by-the-department-of-energy-doe-for-clean-manufacturing-projects/) announced_on: expected 2024-10-22, got null
- [Hybar](https://www.arkansasbusiness.com/article/hybar-begins-construction-on-rebar-mill-in-osceola/) cost_mm: sheet 470, extracted 700
- [Niron Magnetics](https://sartellmn.com/news_detail_T74_R50.html) announced_on: expected 2024-09-30, got null
- [Niron Magnetics](https://sartellmn.com/news_detail_T74_R50.html) construction_start:planned: expected 2025-09-30, got null — "The City of Sartell is looking forward to an anticipated groundbreaking by Niron Magnetics this fall."
- [Niron Magnetics](https://sartellmn.com/news_detail_T74_R50.html) sqft: sheet 190000, extracted 150000
- [Niron Magnetics](https://sartellmn.com/news_detail_T74_R50.html) full_time_jobs: sheet 125, extracted 50
- [Redwood Materials](https://www.redwoodmaterials.com/news/announcing-redwood-south-carolina/) production_start:planned: expected 2026-01-01, got 2023-12-31 — "have our first recycling process running by the end of next year"
- [Fourth Power](https://www.connectcre.com/stories/fourth-power-comes-to-advanced-manufacturing-campus-in-bedford/) announced_on: expected 2026-01-06, got null
- [Mariana Minerals](https://investors.selectwater.com/news-events/press-releases/detail/134/select-water-solutions-and-mariana-minerals-break-ground-on-texass-first-commercial-produced-water-lithium-extraction-facility) construction_start:actual: expected 2025-10-22, got 2025-07-01 — "Site preparation began in July 2025, construction will continue through December 2026"
- [Mangrove Lithium](https://www.connectcre.ca/stories/mangrove-commences-construction-on-lithium-refining-plant-in-delta/) construction_start:actual: expected 2025-02-04, got null — "A startup company has commenced construction on North America's first electrochemical lithium-refining facility in the Vancouver suburb of D"
- [JetZero](https://www.jetzero.aero/jetzero-selectsgreensborro-nc-for-factory) construction_start:planned: expected 2026-07-01, got 2026-01-01 — "Construction on the facility is expected to begin in the first half of 2026"
- [SunGas Renewables](https://sungasrenewables.com/sungas-renewables-announces-beaver-lake-renewable-energy/) construction_start:planned: expected 2026-12-31, got 2024-12-31 — "The BLRE facility is expected to begin construction in late 2024"
- [SunGas Renewables](https://sungasrenewables.com/sungas-renewables-announces-beaver-lake-renewable-energy/) production_start:planned: expected 2028-12-31, got 2027-01-01 — "with commercial operations commencing in 2027"
- [SunGas Renewables](https://sungasrenewables.com/sungas-renewables-announces-beaver-lake-renewable-energy/) cost_mm: sheet 2400, extracted 2000
- [Flamingo Marine](https://biztimes.com/boat-manufacturer-to-expand-with-germantown-facility/) sqft: sheet 233000, extracted 146000
- [Saronic](https://www.workboat.com/saronic-raises-600-million-to-build-autonomous-vessels) announced_on: expected 2025-02-20, got null
- [Saronic](https://www.workboat.com/saronic-raises-600-million-to-build-autonomous-vessels) sqft: sheet 300000, extracted 420000
- [Castelion](https://edd.newmexico.gov/pr/castelion-chooses-new-mexico-as-home-for-project-ranger-its-newest-hypersonic-manufacturing-campus/) construction_start:planned: expected 2026-03-01, got 2026-01-01 — "The company expects to break ground in early 2026."
- [Castelion](https://edd.newmexico.gov/pr/castelion-chooses-new-mexico-as-home-for-project-ranger-its-newest-hypersonic-manufacturing-campus/) cost_mm: sheet 220, extracted 100
- [Joby](https://www.jobyaviation.com/news/joby-selects-dayton-ohio-first-scaled-manufacturing-facility/) production_start:planned: expected 2025-06-01, got 2025-01-01 — "it is expected to come online in 2025"
- [Valstad Shipworks](https://www.linkedin.com/posts/dustinwalper_just-took-the-keys-on-our-60000-sq-ft-facility-activity-7403994144332742657-H6l4?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAMIt6EBqTG8AtiBJFDzSLJaXkpavcgKUbc) construction_start:planned: expected 2025-12-09, got 2026-12-31 — "the 500,000+ sq ft space we'll be breaking ground on before the end of next year"
- [Anduril](https://www.nbc4i.com/news/local-news/pickaway-county/anduril-quietly-starts-construction-on-ohio-arsenal-1-plant/) construction_start:actual: expected 2025-09-01, got null — "An Anduril spokesperson told NBC4 the company has been doing construction for several months and recently began preparing construction and l"
- [OneD Battery Sciences](https://www.geekwire.com/2023/meet-the-latest-next-gen-battery-startup-to-put-down-roots-in-a-rural-town-in-washington/) production_start:planned: expected 2024-07-01, got 2024-01-01 — "OneD expects to start manufacturing operations in the first few months of next year."
- [OneD Battery Sciences](https://www.geekwire.com/2023/meet-the-latest-next-gen-battery-startup-to-put-down-roots-in-a-rural-town-in-washington/) cost_mm: sheet 15, extracted 20
- [Crusoe](https://crusoe.ai/newsroom/crusoe-tulsa-manufacturing-expansion/) announced_on: expected 2024-08-16, got null

## Errors
_None._
