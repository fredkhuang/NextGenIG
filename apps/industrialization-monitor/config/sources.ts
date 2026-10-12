// Sources for the weekly news scrub. Edit freely: feeds are read every run; the domain allowlist
// limits Claude's per-company web searches to reputable outlets (plus each company's own site).

export const FEEDS: { name: string; url: string }[] = [
  { name: "Canary Media", url: "https://www.canarymedia.com/rss.rss" },
  { name: "Utility Dive", url: "https://www.utilitydive.com/feeds/news/" },
  { name: "Manufacturing Dive", url: "https://www.manufacturingdive.com/feeds/news/" },
  { name: "Supply Chain Dive", url: "https://www.supplychaindive.com/feeds/news/" },
  { name: "Waste Dive", url: "https://www.wastedive.com/feeds/news/" },
  { name: "Electrek", url: "https://electrek.co/feed/" },
  { name: "TechCrunch Climate", url: "https://techcrunch.com/category/climate/feed/" },
  { name: "Energy-Storage.news", url: "https://www.energy-storage.news/feed/" },
  { name: "PV Magazine USA", url: "https://pv-magazine-usa.com/feed/" },
  { name: "PR Newswire Energy", url: "https://www.prnewswire.com/rss/energy-latest-news/energy-latest-news-list.rss" },
  { name: "PR Newswire Manufacturing", url: "https://www.prnewswire.com/rss/manufacturing-latest-news/manufacturing-latest-news-list.rss" },
  { name: "CleanTechnica", url: "https://cleantechnica.com/feed/" },
  { name: "Trellis", url: "https://www.trellis.net/rss" },
  { name: "World Nuclear News", url: "https://www.world-nuclear-news.org/rss" },
  { name: "Mining.com", url: "https://www.mining.com/feed/" },
  { name: "Hydrogen Central", url: "https://hydrogen-central.com/feed/" },
  { name: "Carbon Herald", url: "https://www.carbonherald.com/feed/" },
];

/** Reputable domains for web search (Claude's web_search allowed_domains; subdomains included). */
export const ALLOWED_DOMAINS = [
  // Wires and newsrooms
  "prnewswire.com", "businesswire.com", "globenewswire.com", "accesswire.com", "prweb.com",
  // General and business press
  // (Reuters, AP, WSJ, NYT, FT, LA Times, The Verge and Bizjournals block Anthropic's crawler, so
  //  Claude's web search rejects them; their stories still reach us through the feeds and wires.)
  "bloomberg.com", "cnbc.com", "axios.com", "fortune.com", "forbes.com", "washingtonpost.com",
  // Trade and climate/industrial press
  "canarymedia.com", "utilitydive.com", "manufacturingdive.com", "supplychaindive.com", "wastedive.com",
  "electrek.co", "techcrunch.com", "energy-storage.news", "pv-magazine-usa.com", "cleantechnica.com",
  "trellis.net", "world-nuclear-news.org", "mining.com", "hydrogen-central.com", "carbonherald.com",
  "geekwire.com", "insideevs.com", "heatmap.news", "latitudemedia.com", "spglobal.com",
  "areadevelopment.com", "governing.com",
  // Government
  "energy.gov", "commerce.gov", "whitehouse.gov", "nist.gov", "defense.gov", "darpa.mil",
];

/** Words that make a feed item about a startup site or its money worth reading. */
export const SITE_KEYWORDS = /\b(factory|plant|facility|gigafactory|manufactur\w*|production line|pilot line|groundbreak\w*|broke ground|headquarters and production|site selection|raises|raised|funding|series [a-f]|grant|loan|tax credit|incentive)\b/i;
export const STARTUP_KEYWORDS = /\b(startup|start-up|venture-backed|first-of-a-kind|first commercial|scale-up)\b/i;
export const NORTH_AMERICA = /\b(U\.S\.|United States|USA|American|Canada|Canadian|Mexico|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Ontario|Quebec|British Columbia|Alberta)\b/;
