// Datos del juego: ligas, clubes y selecciones con sus nombres reales (uso personal).
// No incluye escudos ni fotos oficiales: los escudos se dibujan con los colores del club
// y cada jugador puede cargar sus propias imágenes desde el juego.

export type Pos = "DC" | "EXT" | "ENG";
export type Foot = "der" | "izq" | "ambi";
export type StatKey = "tiro" | "pase" | "regate" | "velocidad" | "fisico";
export type Stats = Record<StatKey, number>;

export type Look = {
  skin: number;
  hair: number;
  hairColor: number;
  beard: number;
  eyes: number;
  boots: number;
  band?: number;
};

export type CrestPattern = "stripes" | "half" | "band" | "cross" | "plain" | "hoops" | "flag";

export type Team = {
  id: string;
  name: string;
  short: string;
  c1: string;
  c2: string;
  alt: [string, string];
  pattern: CrestPattern;
  strength: number;
  star: string;
  league: string; // id de liga, o "nac"
  city: string;
  stadium: string;
  flag?: string; // selecciones: emoji de bandera
  confed?: Confed;
};
export type Club = Team;
export type Confed = "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC";

export type League = { id: string; name: string; country: string; flag: string; vibe: string; cup: string; region: "eu" | "sa" | "na" | "tr" };

export const POS_INFO: Record<Pos, { name: string; desc: string }> = {
  DC: { name: "Delantero centro", desc: "Vive en el área. Más mano a mano, cabezazos y definiciones." },
  EXT: { name: "Extremo", desc: "Rápido por la banda. Más contraataques y desbordes." },
  ENG: { name: "Enganche", desc: "La pausa y el último pase. Más toque, paredes y remates de afuera." },
};

export const STAT_INFO: Record<StatKey, { name: string; short: string; desc: string; train: string; icon: string }> = {
  tiro: { name: "Tiro", short: "TIR", desc: "Potencia y precisión del remate", train: "Definición", icon: "🎯" },
  pase: { name: "Pase", short: "PAS", desc: "Precisión de pases y centros", train: "Rondos de pase", icon: "🦶" },
  regate: { name: "Regate", short: "REG", desc: "Pelota pegada al pie, amagues", train: "Conos y gambeta", icon: "🌀" },
  velocidad: { name: "Velocidad", short: "VEL", desc: "Velocidad máxima", train: "Pasadas de sprint", icon: "⚡" },
  fisico: { name: "Físico", short: "FIS", desc: "Energía, quite y resistencia", train: "Gimnasio", icon: "💪" },
};
export const STAT_KEYS: StatKey[] = ["tiro", "pase", "regate", "velocidad", "fisico"];

export const SKINS = ["#f8d5b8", "#eebc94", "#d39a6e", "#a86e45", "#7a4a2b", "#4e2f1d"];
export const HAIR_COLORS = ["#1d1410", "#4a2c17", "#8a5a2b", "#d9a441", "#c2410c", "#e5e7eb", "#2563eb"];
export const HAIR_NAMES = ["Rapado", "Corto", "Jopo", "Rulos", "Melena", "Cresta", "Rodete"];
export const BEARD_NAMES = ["Sin barba", "Bigote", "Candado", "Barba"];
export const EYES_NAMES = ["Tranquilo", "Picante", "Feliz"];
export const BOOTS = ["#111827", "#f8fafc", "#ef4444", "#22d3ee", "#facc15", "#a3e635", "#f472b6"];
export const UGLY_BOOTS = 7;
export const GOLD_BOOTS = 8;
export const RAINBOW_BOOTS = 9;
export const BAND_COLORS = ["#ef4444", "#f8fafc", "#111827", "#22d3ee", "#facc15"];

export const CELEBRATIONS: Record<string, string> = {
  salto: "Salto con puño",
  avion: "Avioncito",
  rodilla: "Rodilla al piso",
  oido: "Mano al oído",
  baile: "Bailecito",
  corazon: "Corazón con las manos",
};

// ---------- Azar ----------

export function rand() {
  return Math.random();
}
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const shuffle = <T,>(xs: T[]): T[] => [...xs].sort(() => Math.random() - 0.5);

export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ---------- Ligas ----------

export const LEAGUES: League[] = [
  { id: "ita", name: "Serie A", country: "Italia", flag: "🇮🇹", vibe: "Táctica y catenaccio", cup: "Coppa Italia", region: "eu" },
  { id: "esp", name: "LaLiga", country: "España", flag: "🇪🇸", vibe: "Toque y técnica", cup: "Copa del Rey", region: "eu" },
  { id: "eng", name: "Premier League", country: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", vibe: "Ritmo y lluvia", cup: "FA Cup", region: "eu" },
  { id: "ger", name: "Bundesliga", country: "Alemania", flag: "🇩🇪", vibe: "Presión y goles", cup: "DFB-Pokal", region: "eu" },
  { id: "fra", name: "Ligue 1", country: "Francia", flag: "🇫🇷", vibe: "Talento joven", cup: "Coupe de France", region: "eu" },
  { id: "por", name: "Liga Portugal", country: "Portugal", flag: "🇵🇹", vibe: "Vidriera de cracks", cup: "Taça de Portugal", region: "eu" },
  { id: "ned", name: "Eredivisie", country: "Países Bajos", flag: "🇳🇱", vibe: "Fútbol total", cup: "KNVB Beker", region: "eu" },
  { id: "tur", name: "Süper Lig", country: "Turquía", flag: "🇹🇷", vibe: "Estadios que arden", cup: "Copa de Turquía", region: "tr" },
  { id: "arg", name: "Liga Profesional", country: "Argentina", flag: "🇦🇷", vibe: "Pasión y garra", cup: "Copa Argentina", region: "sa" },
  { id: "bra", name: "Brasileirão", country: "Brasil", flag: "🇧🇷", vibe: "Jogo bonito", cup: "Copa do Brasil", region: "sa" },
  { id: "mex", name: "Liga MX", country: "México", flag: "🇲🇽", vibe: "Altura y picante", cup: "Copa MX", region: "na" },
  { id: "usa", name: "MLS", country: "Estados Unidos", flag: "🇺🇸", vibe: "Show y estrellas", cup: "US Open Cup", region: "na" },
];

// id|Nombre|ABR|color1|color2|patrón|nivel   (patrón: s=rayas h=mitad b=banda c=cruz p=liso o=aros)
const RAW: Record<string, string> = {
  ita: `
inter|Inter|INT|#0b3d91|#111827|s|86
nap|Napoli|NAP|#12a0d7|#f8fafc|p|84
juv|Juventus|JUV|#f8fafc|#111827|s|84
mil|Milan|MIL|#d1001c|#111827|s|83
ata|Atalanta|ATA|#1e40af|#111827|s|82
rom|Roma|ROM|#8e1f2f|#f0bc42|p|80
laz|Lazio|LAZ|#87d8f7|#f8fafc|p|79
fio|Fiorentina|FIO|#5b2d8e|#f8fafc|p|78
bol|Bologna|BOL|#1a2f48|#a21c26|h|78
tor|Torino|TOR|#8a1e03|#f8fafc|p|74
como|Como|COM|#1d4f91|#f8fafc|p|73
udi|Udinese|UDI|#f8fafc|#111827|s|72
gen|Genoa|GEN|#a6192e|#0b2a4a|h|71
cag|Cagliari|CAG|#a6192e|#0b2a4a|h|70
par|Parma|PAR|#f8fafc|#1e3a8a|c|70
lec|Lecce|LEC|#ffd200|#d71920|s|69
ver|Hellas Verona|VER|#0b3d91|#ffd200|p|68
emp|Empoli|EMP|#0b4ea2|#f8fafc|p|68
mon|Monza|MON|#d71920|#f8fafc|h|68
ven|Venezia|VEN|#111827|#f97316|b|67`,
  esp: `
rma|Real Madrid|RMA|#f8fafc|#d4af37|p|89
bar|Barcelona|BAR|#a50044|#004d98|s|87
atm|Atlético de Madrid|ATM|#cb3524|#f8fafc|s|84
ath|Athletic Club|ATH|#ee2523|#f8fafc|s|80
vil|Villarreal|VIL|#ffe667|#005187|p|79
rso|Real Sociedad|RSO|#0067b1|#f8fafc|s|79
bet|Real Betis|BET|#0bb363|#f8fafc|s|78
sev|Sevilla|SEV|#f8fafc|#d81920|p|77
gir|Girona|GIR|#cd2534|#f8fafc|s|77
val|Valencia|VAL|#f8fafc|#111827|p|75
cel|Celta de Vigo|CEL|#8ac3ee|#f8fafc|p|74
osa|Osasuna|OSA|#d91a21|#0a346f|p|74
ray|Rayo Vallecano|RAY|#f8fafc|#e53027|b|73
mal|Mallorca|MLL|#e20613|#111827|p|73
get|Getafe|GET|#005999|#f8fafc|p|72
ala|Alavés|ALA|#0761af|#f8fafc|s|71
esy|Espanyol|ESP|#007fc8|#f8fafc|s|71
lpa|Las Palmas|LPA|#ffe400|#0061a8|p|70
leg|Leganés|LEG|#f8fafc|#0b4ea2|s|69
vll|Real Valladolid|VLL|#5b2d8e|#f8fafc|s|68`,
  eng: `
mci|Manchester City|MCI|#6cabdd|#f8fafc|p|89
ars|Arsenal|ARS|#ef0107|#f8fafc|p|88
liv|Liverpool|LIV|#c8102e|#f8fafc|p|88
che|Chelsea|CHE|#034694|#f8fafc|p|84
mun|Manchester United|MUN|#da291c|#111827|p|83
tot|Tottenham|TOT|#f8fafc|#132257|p|83
new|Newcastle|NEW|#241f20|#f8fafc|s|82
avl|Aston Villa|AVL|#670e36|#95bfe5|p|82
bha|Brighton|BHA|#0057b8|#f8fafc|s|79
whu|West Ham|WHU|#7a263a|#1bb1e7|p|78
nfo|Nottingham Forest|NFO|#dd0000|#f8fafc|p|77
cry|Crystal Palace|CRY|#1b458f|#c4122e|s|76
bre|Brentford|BRE|#e30613|#f8fafc|s|76
ful|Fulham|FUL|#f8fafc|#111827|p|76
bou|Bournemouth|BOU|#da291c|#111827|s|76
wol|Wolverhampton|WOL|#fdb913|#231f20|p|75
eve|Everton|EVE|#003399|#f8fafc|p|75
lei|Leicester City|LEI|#003090|#fdbe11|p|72
ips|Ipswich Town|IPS|#0033a0|#f8fafc|p|70
sou|Southampton|SOU|#d71920|#f8fafc|s|70`,
  ger: `
bay|Bayern Múnich|FCB|#dc052d|#f8fafc|p|88
b04|Bayer Leverkusen|B04|#e32221|#111827|p|85
bvb|Borussia Dortmund|BVB|#fde100|#111827|p|84
rbl|RB Leipzig|RBL|#f8fafc|#dd0741|p|83
vfb|Stuttgart|VFB|#f8fafc|#e32219|b|80
sge|Eintracht Frankfurt|SGE|#e1000f|#111827|p|80
wob|Wolfsburg|WOB|#65b32e|#f8fafc|p|77
scf|Freiburg|SCF|#111827|#e2001a|p|77
bmg|Borussia M'gladbach|BMG|#f8fafc|#0b8c43|p|76
tsg|Hoffenheim|TSG|#1c63b7|#f8fafc|p|76
svw|Werder Bremen|SVW|#1d9053|#f8fafc|p|75
fcu|Union Berlin|FCU|#eb1923|#f8fafc|p|75
m05|Mainz 05|M05|#c3141e|#f8fafc|p|74
fca|Augsburg|FCA|#ba3733|#46714d|p|73
fch|Heidenheim|FCH|#e30613|#003e8a|h|71
boc|Bochum|BOC|#005ca9|#f8fafc|p|70
stp|St. Pauli|STP|#6c3b2a|#f8fafc|p|70
ksv|Holstein Kiel|KSV|#0e5aa7|#f8fafc|p|69`,
  fra: `
psg|Paris Saint-Germain|PSG|#004170|#da291c|b|87
asm|Monaco|ASM|#e51b22|#f8fafc|h|81
om|Marseille|OM|#f8fafc|#2faee0|p|81
losc|Lille|LIL|#e01e13|#1e3a8a|p|80
ol|Lyon|OL|#f8fafc|#1e3a8a|p|80
ogcn|Nice|NIC|#c8102e|#111827|s|78
rcl|Lens|RCL|#ffd200|#e51b22|p|77
srfc|Rennes|REN|#e13327|#111827|p|77
sb29|Brest|BRE|#e30613|#f8fafc|p|74
rcsa|Strasbourg|STR|#0075bf|#f8fafc|p|74
tfc|Toulouse|TFC|#5b2d8e|#f8fafc|p|73
fcn|Nantes|NAN|#fde100|#0b8c43|p|72
sdr|Reims|REI|#e30613|#f8fafc|h|72
aja|Auxerre|AJA|#f8fafc|#0b4ea2|p|70
sco|Angers|ANG|#111827|#f8fafc|s|69
hac|Le Havre|HAC|#87ceeb|#1e3a8a|h|69
asse|Saint-Étienne|ASSE|#009639|#f8fafc|p|69
mhsc|Montpellier|MHSC|#1e3a8a|#f97316|p|68`,
  por: `
slb|Benfica|SLB|#e20e0e|#f8fafc|p|82
scp|Sporting CP|SCP|#008057|#f8fafc|o|82
fcp|Porto|FCP|#00428c|#f8fafc|s|81
scb|Braga|SCB|#e2001a|#f8fafc|p|78
vsc|Vitória de Guimarães|VSC|#f8fafc|#111827|p|74
fam|Famalicão|FAM|#1e3a8a|#f8fafc|p|71
csc|Santa Clara|CSC|#e2001a|#f8fafc|p|70
cpi|Casa Pia|CPI|#111827|#f8fafc|p|69
est|Estoril|EST|#ffd200|#0b4ea2|s|69
rav|Rio Ave|RAV|#0b8c43|#f8fafc|s|69
mor|Moreirense|MOR|#0b8c43|#f8fafc|p|68
gil|Gil Vicente|GIL|#e2001a|#0b4ea2|h|68
aro|Arouca|ARO|#ffd200|#1e3a8a|p|68
bvs|Boavista|BOA|#111827|#f8fafc|c|67
nac|Nacional|NAC|#111827|#f8fafc|s|66
eam|Estrela da Amadora|EAM|#e2001a|#0b8c43|s|66
avs|AVS|AVS|#e2001a|#f8fafc|p|65
far|Farense|FAR|#111827|#f8fafc|p|65`,
  ned: `
psv|PSV|PSV|#e2001a|#f8fafc|s|81
aja2|Ajax|AJA|#f8fafc|#d2122e|b|81
fey|Feyenoord|FEY|#e2001a|#f8fafc|h|81
az|AZ Alkmaar|AZ|#e2001a|#f8fafc|p|77
twe|Twente|TWE|#e2001a|#f8fafc|p|77
utr|Utrecht|UTR|#e2001a|#f8fafc|h|74
gae|Go Ahead Eagles|GAE|#e2001a|#ffd200|b|71
nec|NEC Nijmegen|NEC|#e2001a|#0b8c43|s|71
hee|Heerenveen|HEE|#1e3a8a|#f8fafc|s|70
spa|Sparta Rotterdam|SPA|#e2001a|#f8fafc|s|69
for|Fortuna Sittard|FOR|#ffd200|#0b8c43|p|69
gro|Groningen|GRO|#f8fafc|#0b8c43|p|69
her|Heracles|HER|#111827|#f8fafc|s|68
pec|PEC Zwolle|PEC|#1e3a8a|#f8fafc|p|68
nab|NAC Breda|NAB|#ffd200|#111827|p|68
wil|Willem II|WIL|#e2001a|#1e3a8a|s|67
rkc|RKC Waalwijk|RKC|#ffd200|#1e3a8a|p|66
alm|Almere City|ALM|#e2001a|#111827|p|66`,
  tur: `
gs|Galatasaray|GS|#a90432|#fdb912|h|80
fb|Fenerbahçe|FB|#ffed00|#002d72|s|80
bjk|Beşiktaş|BJK|#111827|#f8fafc|h|78
ts|Trabzonspor|TS|#7a1d2e|#5ab5e6|s|75
ibfk|Başakşehir|IBFK|#ed7d31|#0b3d91|p|73
sam|Samsunspor|SAM|#e2001a|#f8fafc|p|72
eyu|Eyüpspor|EYU|#7c3aed|#ffd200|p|71
goz|Göztepe|GOZ|#ffd200|#e2001a|h|70
kas|Kasımpaşa|KAS|#0b3d91|#f8fafc|p|70
ant|Antalyaspor|ANT|#e2001a|#f8fafc|p|70
aln|Alanyaspor|ALN|#f97316|#0b8c43|p|70
kon|Konyaspor|KON|#0b8c43|#f8fafc|p|69
kay|Kayserispor|KAY|#ffd200|#e2001a|p|68
siv|Sivasspor|SIV|#e2001a|#f8fafc|p|68
riz|Rizespor|RIZ|#0b8c43|#0b3d91|h|68
gfk|Gaziantep FK|GFK|#e2001a|#111827|p|68
hat|Hatayspor|HAT|#7a1d2e|#f8fafc|p|67
bod|Bodrum FK|BOD|#0b8c43|#f8fafc|p|66`,
  arg: `
riv|River Plate|RIV|#f8fafc|#e2001a|b|82
boc2|Boca Juniors|BOC|#0b3d91|#ffd200|o|82
rac|Racing Club|RAC|#75aadb|#f8fafc|s|79
vel|Vélez Sarsfield|VEL|#f8fafc|#0b3d91|b|78
est2|Estudiantes|EST|#e2001a|#f8fafc|s|77
ind|Independiente|IND|#e2001a|#f8fafc|p|77
tal|Talleres|TAL|#0b3d91|#f8fafc|s|77
sl|San Lorenzo|SLO|#0b3d91|#e2001a|s|76
arj|Argentinos Juniors|ARJ|#e2001a|#f8fafc|p|75
lan|Lanús|LAN|#7a1d2e|#f8fafc|p|75
ros|Rosario Central|ROS|#0b3d91|#ffd200|s|75
hur|Huracán|HUR|#f8fafc|#e2001a|p|74
nob|Newell's Old Boys|NOB|#e2001a|#111827|h|73
dyj|Defensa y Justicia|DYJ|#ffd200|#0b8c43|h|73
bel|Belgrano|BEL|#75aadb|#f8fafc|p|73
gcr|Godoy Cruz|GCR|#0b3d91|#f8fafc|s|72
gim|Gimnasia LP|GIM|#f8fafc|#0b3d91|o|71
uni|Unión|UNI|#e2001a|#f8fafc|s|71
tig|Tigre|TIG|#0b3d91|#e2001a|o|71
pla|Platense|PLA|#f8fafc|#6b3e26|b|71
ban|Banfield|BAN|#f8fafc|#0b8c43|s|70
ins|Instituto|INS|#e2001a|#f8fafc|s|70
atu|Atlético Tucumán|ATU|#75aadb|#f8fafc|s|70
bcs|Barracas Central|BCS|#e2001a|#f8fafc|p|69
sar|Sarmiento|SAR|#0b8c43|#f8fafc|p|69
ccc|Central Córdoba|CCC|#111827|#f8fafc|s|69
ivr|Independiente Rivadavia|IRV|#0b3d91|#f8fafc|p|69
rie|Deportivo Riestra|RIE|#111827|#f8fafc|p|68`,
  bra: `
fla|Flamengo|FLA|#c8102e|#111827|o|83
pal|Palmeiras|PAL|#006437|#f8fafc|p|83
bot|Botafogo|BOT|#111827|#f8fafc|s|80
spfc|São Paulo|SAO|#f8fafc|#e2001a|o|79
flu|Fluminense|FLU|#7a0026|#0b8c43|s|79
cam|Atlético Mineiro|CAM|#111827|#f8fafc|s|79
int|Internacional|INT|#e2001a|#f8fafc|p|78
cor|Corinthians|COR|#f8fafc|#111827|p|78
gre|Grêmio|GRE|#0d80bf|#111827|s|77
cru|Cruzeiro|CRU|#0b3d91|#f8fafc|p|77
bah|Bahia|BAH|#0b3d91|#e2001a|h|75
for2|Fortaleza|FOR|#0b3d91|#e2001a|o|75
vas|Vasco da Gama|VAS|#111827|#f8fafc|b|75
rbb|Bragantino|RBB|#f8fafc|#e2001a|p|75
cap|Athletico Paranaense|CAP|#e2001a|#111827|s|74
juv2|Juventude|JUV|#0b8c43|#f8fafc|p|71
vit|Vitória|VIT|#e2001a|#111827|o|71
cri|Criciúma|CRI|#ffd200|#111827|p|70
cui|Cuiabá|CUI|#ffd200|#0b8c43|p|70
acg|Atlético Goianiense|ACG|#e2001a|#111827|s|70`,
  mex: `
ame|América|AME|#ffd200|#0b3d91|p|80
mty|Monterrey|MTY|#0b3d91|#f8fafc|s|80
tig2|Tigres UANL|TIG|#ffd200|#0b3d91|p|80
caz|Cruz Azul|CAZ|#0b3d91|#f8fafc|p|79
tol|Toluca|TOL|#e2001a|#f8fafc|p|77
gua|Guadalajara|GDL|#e2001a|#f8fafc|s|77
pac|Pachuca|PAC|#f8fafc|#0b3d91|s|76
pum|Pumas UNAM|PUM|#0b3d91|#d4af37|p|75
leo|León|LEO|#0b8c43|#f8fafc|p|75
san|Santos Laguna|SAN|#0b8c43|#f8fafc|s|72
tij|Tijuana|TIJ|#e2001a|#111827|s|72
atl|Atlas|ATL|#e2001a|#111827|h|72
nec2|Necaxa|NEC|#e2001a|#f8fafc|b|71
pue|Puebla|PUE|#f8fafc|#0b3d91|b|70
que|Querétaro|QRO|#111827|#0b3d91|s|69
maz|Mazatlán|MAZ|#7c3aed|#f8fafc|p|69
jua|FC Juárez|JUA|#111827|#0b8c43|p|69
asl|Atlético San Luis|ASL|#e2001a|#0b3d91|p|69`,
  usa: `
mia|Inter Miami|MIA|#f7b5cd|#111827|p|78
lag|LA Galaxy|LAG|#f8fafc|#00245d|b|77
lafc|LAFC|LAFC|#111827|#c39e6d|p|77
clb|Columbus Crew|CLB|#ffd200|#111827|p|76
sea|Seattle Sounders|SEA|#5d9741|#236192|p|75
cin|FC Cincinnati|CIN|#003087|#fe5000|p|75
orl|Orlando City|ORL|#61259e|#f8fafc|p|74
atu2|Atlanta United|ATL|#80000a|#111827|s|74
phi|Philadelphia Union|PHI|#071b2c|#b1872d|p|74
nyrb|New York Red Bulls|RBNY|#f8fafc|#ed1e36|p|73
nyc|New York City FC|NYC|#6cace4|#041e42|p|73
rsl|Real Salt Lake|RSL|#b30838|#013a81|p|73
nsh|Nashville SC|NSH|#ece83a|#1f1646|p|72
por2|Portland Timbers|POR|#00482b|#d69a00|p|72
hou|Houston Dynamo|HOU|#ff6b00|#101820|p|71
atx|Austin FC|ATX|#00b140|#111827|p|71`,
};

const PAT: Record<string, CrestPattern> = { s: "stripes", h: "half", b: "band", c: "cross", p: "plain", o: "hoops" };

// nombres inventados para las figuras de cada club (no son jugadores reales)
const NAME_POOL: Record<string, [string[], string[]]> = {
  eu: [["Luca", "Marco", "Pablo", "Hugo", "Leo", "Jonas", "Theo", "Rafa", "Dani", "Nico", "Iker", "Joao", "Kai", "Ruben", "Tim", "Max"], ["Ferretti", "Navarro", "Brooks", "Keller", "Moreau", "Silva", "Van Dijkstra", "Rossi", "Hartmann", "Lambert", "Ortega", "Costa", "Bakker", "Dubois", "Whitmore", "Kaya"]],
  sa: [["Thiago", "Mateo", "Facu", "Gabriel", "Rodrigo", "Lucas", "Enzo", "Bruno", "Franco", "Vini", "Joaquín", "Pedro"], ["Benítez", "Sosa", "Ferreira", "Gómez", "Alves", "Romero", "Barbosa", "Acosta", "Duarte", "Pereyra", "Lima", "Quiroga"]],
  na: [["Diego", "Chucho", "Tyler", "Santi", "Jordan", "Luis", "Cole", "Héctor", "Brandon", "Raúl"], ["Hernández", "Miller", "Ruiz", "Carter", "Lozano", "Reyes", "Walker", "Ochoa", "Parker", "Vega"]],
  tr: [["Emre", "Burak", "Arda", "Kerem", "Mert", "Okan"], ["Yılmaz", "Demir", "Kaya", "Aydın", "Öztürk", "Çelik"]],
};

function starName(id: string, region: string) {
  const r = seeded(id);
  const [a, b] = NAME_POOL[region] ?? NAME_POOL.eu;
  return `${a[Math.floor(r() * a.length)]} ${b[Math.floor(r() * b.length)]}`;
}

export const CLUBS: Team[] = LEAGUES.flatMap((l) =>
  RAW[l.id]
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, short, c1, c2, p, s] = line.trim().split("|");
      return {
        id, name, short, c1, c2, alt: [c2, c1] as [string, string], pattern: PAT[p] ?? "plain", strength: Number(s),
        star: starName(id, l.region), league: l.id, city: l.country, stadium: `Estadio del ${name}`,
      };
    }),
);

// ---------- Selecciones ----------

const NAT_RAW: [string, string, string, string, string, number, Confed, string][] = [
  ["arg", "Argentina", "ARG", "#75aadb", "#f8fafc", 88, "CONMEBOL", "🇦🇷"],
  ["fra", "Francia", "FRA", "#1e3a8a", "#f8fafc", 88, "UEFA", "🇫🇷"],
  ["esp", "España", "ESP", "#c60b1e", "#ffc400", 88, "UEFA", "🇪🇸"],
  ["eng", "Inglaterra", "ENG", "#f8fafc", "#c8102e", 86, "UEFA", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
  ["bra", "Brasil", "BRA", "#ffdf00", "#009c3b", 86, "CONMEBOL", "🇧🇷"],
  ["por", "Portugal", "POR", "#da291c", "#046a38", 85, "UEFA", "🇵🇹"],
  ["ger", "Alemania", "GER", "#f8fafc", "#111827", 84, "UEFA", "🇩🇪"],
  ["ned", "Países Bajos", "NED", "#f36c21", "#f8fafc", 84, "UEFA", "🇳🇱"],
  ["ita", "Italia", "ITA", "#0066cc", "#f8fafc", 83, "UEFA", "🇮🇹"],
  ["bel", "Bélgica", "BEL", "#e30613", "#111827", 82, "UEFA", "🇧🇪"],
  ["cro", "Croacia", "CRO", "#f8fafc", "#e30613", 81, "UEFA", "🇭🇷"],
  ["uru", "Uruguay", "URU", "#55a8e0", "#111827", 81, "CONMEBOL", "🇺🇾"],
  ["col", "Colombia", "COL", "#fcd116", "#003893", 80, "CONMEBOL", "🇨🇴"],
  ["mar", "Marruecos", "MAR", "#c1272d", "#006233", 80, "CAF", "🇲🇦"],
  ["sui", "Suiza", "SUI", "#d52b1e", "#f8fafc", 78, "UEFA", "🇨🇭"],
  ["den", "Dinamarca", "DEN", "#c8102e", "#f8fafc", 78, "UEFA", "🇩🇰"],
  ["usa", "Estados Unidos", "USA", "#f8fafc", "#002868", 77, "CONCACAF", "🇺🇸"],
  ["mex", "México", "MEX", "#006847", "#f8fafc", 77, "CONCACAF", "🇲🇽"],
  ["jpn", "Japón", "JPN", "#0b3d91", "#f8fafc", 77, "AFC", "🇯🇵"],
  ["sen", "Senegal", "SEN", "#f8fafc", "#00853f", 77, "CAF", "🇸🇳"],
  ["ecu", "Ecuador", "ECU", "#ffd100", "#034ea2", 76, "CONMEBOL", "🇪🇨"],
  ["aut", "Austria", "AUT", "#ed2939", "#f8fafc", 76, "UEFA", "🇦🇹"],
  ["tur", "Turquía", "TUR", "#e30a17", "#f8fafc", 76, "UEFA", "🇹🇷"],
  ["pol", "Polonia", "POL", "#f8fafc", "#dc143c", 75, "UEFA", "🇵🇱"],
  ["kor", "Corea del Sur", "KOR", "#c60c30", "#f8fafc", 75, "AFC", "🇰🇷"],
  ["srb", "Serbia", "SRB", "#c6363c", "#f8fafc", 75, "UEFA", "🇷🇸"],
  ["nga", "Nigeria", "NGA", "#008751", "#f8fafc", 75, "CAF", "🇳🇬"],
  ["civ", "Costa de Marfil", "CIV", "#f77f00", "#009e60", 74, "CAF", "🇨🇮"],
  ["egy", "Egipto", "EGY", "#ce1126", "#f8fafc", 74, "CAF", "🇪🇬"],
  ["sco", "Escocia", "SCO", "#003078", "#f8fafc", 73, "UEFA", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
  ["par", "Paraguay", "PAR", "#d52b1e", "#f8fafc", 73, "CONMEBOL", "🇵🇾"],
  ["can", "Canadá", "CAN", "#d80621", "#f8fafc", 73, "CONCACAF", "🇨🇦"],
  ["irn", "Irán", "IRN", "#f8fafc", "#da0000", 73, "AFC", "🇮🇷"],
  ["aus", "Australia", "AUS", "#ffcd00", "#00843d", 72, "AFC", "🇦🇺"],
  ["alg", "Argelia", "ALG", "#f8fafc", "#006233", 72, "CAF", "🇩🇿"],
  ["cmr", "Camerún", "CMR", "#007a5e", "#ce1126", 72, "CAF", "🇨🇲"],
  ["chi", "Chile", "CHI", "#d52b1e", "#0039a6", 72, "CONMEBOL", "🇨🇱"],
  ["per", "Perú", "PER", "#f8fafc", "#d91023", 71, "CONMEBOL", "🇵🇪"],
  ["gha", "Ghana", "GHA", "#f8fafc", "#006b3f", 71, "CAF", "🇬🇭"],
  ["ksa", "Arabia Saudita", "KSA", "#006c35", "#f8fafc", 70, "AFC", "🇸🇦"],
  ["crc", "Costa Rica", "CRC", "#ce1126", "#002b7f", 70, "CONCACAF", "🇨🇷"],
  ["ven", "Venezuela", "VEN", "#7a1d2e", "#ffcc00", 70, "CONMEBOL", "🇻🇪"],
  ["pan", "Panamá", "PAN", "#da121a", "#f8fafc", 69, "CONCACAF", "🇵🇦"],
  ["qat", "Catar", "QAT", "#8d1b3d", "#f8fafc", 69, "AFC", "🇶🇦"],
  ["uzb", "Uzbekistán", "UZB", "#f8fafc", "#1eb53a", 68, "AFC", "🇺🇿"],
  ["bol", "Bolivia", "BOL", "#007934", "#f8fafc", 67, "CONMEBOL", "🇧🇴"],
  ["jam", "Jamaica", "JAM", "#ffd100", "#009b3a", 67, "CONCACAF", "🇯🇲"],
  ["hon", "Honduras", "HON", "#f8fafc", "#0073cf", 66, "CONCACAF", "🇭🇳"],
  ["uae", "Emiratos Árabes", "UAE", "#f8fafc", "#00732f", 66, "AFC", "🇦🇪"],
];

export const NATIONS: Team[] = NAT_RAW.map(([id, name, short, c1, c2, strength, confed, flag]) => ({
  id: `n-${id}`, name, short, c1, c2, alt: [c2, c1] as [string, string], pattern: "flag" as const, strength,
  star: starName(`n-${id}`, confed === "CONMEBOL" ? "sa" : confed === "CONCACAF" ? "na" : "eu"), league: "nac", city: name, stadium: `Estadio Nacional de ${name}`, flag, confed,
}));

const ALL = [...CLUBS, ...NATIONS];
const BY_ID = new Map(ALL.map((t) => [t.id, t]));
export const club = (id: string): Team => BY_ID.get(id)!;
export const league = (id: string) => LEAGUES.find((l) => l.id === id)!;
export const clubsOf = (leagueId: string) => CLUBS.filter((c) => c.league === leagueId);
export const nation = (id: string) => NATIONS.find((n) => n.id === id)!;

// ---------- Tienda ----------

export type ShopItem = { id: string; name: string; emoji: string; price: number; kind: "botines" | "festejo" | "vincha" | "vida"; desc: string; value?: string | number };

export const SHOP: ShopItem[] = [
  { id: "b-dorados", name: "Botines dorados", emoji: "👟", price: 400, kind: "botines", value: GOLD_BOOTS, desc: "Brillan con el sol. Pura facha." },
  { id: "b-arcoiris", name: "Botines arcoíris", emoji: "🌈", price: 250, kind: "botines", value: RAINBOW_BOOTS, desc: "Para que te vean desde la tribuna." },
  { id: "v-roja", name: "Vincha roja", emoji: "🎽", price: 15, kind: "vincha", value: 0, desc: "Estilo guerrero." },
  { id: "v-blanca", name: "Vincha blanca", emoji: "🎽", price: 15, kind: "vincha", value: 1, desc: "Clásica de los 90." },
  { id: "v-negra", name: "Vincha negra", emoji: "🎽", price: 15, kind: "vincha", value: 2, desc: "Seria y elegante." },
  { id: "v-celeste", name: "Vincha celeste", emoji: "🎽", price: 15, kind: "vincha", value: 3, desc: "Fresca." },
  { id: "f-avion", name: "Festejo: Avioncito", emoji: "✈️", price: 30, kind: "festejo", value: "avion", desc: "Brazos abiertos y a volar." },
  { id: "f-rodilla", name: "Festejo: Rodilla al piso", emoji: "🧎", price: 60, kind: "festejo", value: "rodilla", desc: "Deslizarse de rodillas al córner." },
  { id: "f-oido", name: "Festejo: Mano al oído", emoji: "👂", price: 45, kind: "festejo", value: "oido", desc: "\"No los escucho...\"" },
  { id: "f-baile", name: "Festejo: Bailecito", emoji: "🕺", price: 80, kind: "festejo", value: "baile", desc: "Coreografía ensayada en el vestuario." },
  { id: "f-corazon", name: "Festejo: Corazón", emoji: "🫶", price: 40, kind: "festejo", value: "corazon", desc: "Para tu gente." },
  { id: "chef", name: "Chef personal", emoji: "👨‍🍳", price: 60, kind: "vida", desc: "Recuperás más energía entre partidos." },
  { id: "pf", name: "Preparador físico privado", emoji: "🏋️", price: 150, kind: "vida", desc: "Tus entrenamientos rinden 50% más." },
  { id: "depto", name: "Departamento con vista", emoji: "🏙️", price: 350, kind: "vida", desc: "La moral nunca baja de 40." },
  { id: "psico", name: "Psicólogo deportivo", emoji: "🧠", price: 200, kind: "vida", desc: "Rendís mejor en los partidos importantes." },
  { id: "auto", name: "Auto deportivo", emoji: "🏎️", price: 900, kind: "vida", desc: "+10 de fama al instante. Ojo con las multas." },
  { id: "mansion", name: "Mansión con pileta", emoji: "🏰", price: 4000, kind: "vida", desc: "+15 de fama y +10 de moral. Leyenda." },
  { id: "barrio", name: "Comprar el club de tu barrio", emoji: "🏟️", price: 20000, kind: "vida", desc: "Le devolvés al potrero lo que te dio. +20 de fama." },
  { id: "isla", name: "Isla privada", emoji: "🏝️", price: 60000, kind: "vida", desc: "Vacaciones eternas: tu moral nunca baja de 60." },
];

export function overall(s: Stats, pos: Pos) {
  const w: Record<Pos, Stats> = {
    DC: { tiro: 0.36, pase: 0.12, regate: 0.2, velocidad: 0.2, fisico: 0.12 },
    EXT: { tiro: 0.18, pase: 0.2, regate: 0.24, velocidad: 0.3, fisico: 0.08 },
    ENG: { tiro: 0.2, pase: 0.36, regate: 0.26, velocidad: 0.1, fisico: 0.08 },
  };
  let t = 0;
  for (const k of STAT_KEYS) t += s[k] * w[pos][k];
  return Math.round(t);
}

export function fmtMoney(k: number) {
  if (k >= 1000) return `€${(k / 1000).toFixed(k >= 10000 ? 0 : 1)}M`;
  return `€${Math.round(k)}k`;
}

// ---------- Escudos propios (los carga el jugador) ----------

const crestKey = (id: string) => `crack-crest-${id}`;
// Cache en memoria: las tablas dibujan cientos de escudos y leer localStorage en cada render traba.
const crestCache = new Map<string, string | null>();
export function customCrest(id: string): string | null {
  if (crestCache.has(id)) return crestCache.get(id)!;
  let v: string | null = null;
  try {
    v = localStorage.getItem(crestKey(id));
  } catch {
    /* sin almacenamiento */
  }
  crestCache.set(id, v);
  return v;
}
export function setCustomCrest(id: string, dataUrl: string | null) {
  crestCache.set(id, dataUrl);
  try {
    if (dataUrl) localStorage.setItem(crestKey(id), dataUrl);
    else localStorage.removeItem(crestKey(id));
  } catch {
    /* sin almacenamiento */
  }
}

// ---------- Clásicos ----------
// Rivalidades históricas de cada liga (ids de CLUBS). Un partido entre dos de estos es un clásico.
const DERBY_LIST: [string, string, string][] = [
  ["inter", "mil", "Derby della Madonnina"], ["juv", "inter", "Derby d'Italia"], ["rom", "laz", "Derby della Capitale"], ["juv", "tor", "Derby della Mole"], ["gen", "cag", "Clásico isleño"],
  ["rma", "bar", "El Clásico"], ["rma", "atm", "Derbi madrileño"], ["bet", "sev", "Derbi sevillano"], ["ath", "rso", "Derbi vasco"], ["bar", "esy", "Derbi barceloní"],
  ["mun", "liv", "Clásico del noroeste"], ["mci", "mun", "Derbi de Manchester"], ["ars", "tot", "Derbi del norte de Londres"], ["liv", "eve", "Derbi de Merseyside"], ["che", "ars", "Derbi de Londres"],
  ["bay", "bvb", "Der Klassiker"], ["bvb", "boc", "Derbi del Ruhr"], ["svw", "stp", "Derbi del norte"], ["sge", "m05", "Derbi del Rin"],
  ["psg", "om", "Le Classique"], ["ol", "asse", "Derbi del Ródano"], ["losc", "rcl", "Derbi del norte"], ["ogcn", "asm", "Derbi de la Costa Azul"],
  ["slb", "scp", "Derbi de Lisboa"], ["fcp", "slb", "O Clássico"], ["fcp", "bvs", "Derbi de Oporto"], ["scb", "vsc", "Derbi del Miño"],
  ["aja2", "fey", "De Klassieker"], ["psv", "aja2", "Clásico holandés"], ["fey", "spa", "Derbi de Róterdam"],
  ["gs", "fb", "Kıtalararası Derbi"], ["bjk", "gs", "Derbi de Estambul"], ["fb", "bjk", "Derbi de Estambul"], ["ts", "fb", "Clásico del Mar Negro"],
  ["riv", "boc2", "Superclásico"], ["rac", "ind", "Clásico de Avellaneda"], ["est2", "gim", "Clásico platense"], ["ros", "nob", "Clásico rosarino"], ["sl", "hur", "Clásico de barrio"], ["tal", "bel", "Clásico cordobés"], ["lan", "ban", "Clásico del sur"],
  ["fla", "flu", "Fla-Flu"], ["fla", "vas", "Clássico dos Milhões"], ["pal", "cor", "Derby Paulista"], ["gre", "int", "Gre-Nal"], ["cam", "cru", "Clássico Mineiro"], ["spfc", "cor", "Majestoso"], ["bot", "fla", "Clássico da Rivalidade"],
  ["ame", "gua", "Clásico Nacional"], ["mty", "tig2", "Clásico Regio"], ["ame", "caz", "Clásico Joven"], ["gua", "atl", "Clásico Tapatío"], ["ame", "pum", "Clásico Capitalino"],
  ["lag", "lafc", "El Tráfico"], ["sea", "por2", "Cascadia Cup"], ["nyrb", "nyc", "Hudson River Derby"], ["mia", "orl", "Derbi de Florida"], ["atx", "hou", "Texas Derby"],
];
const DERBIES = new Map<string, string>();
for (const [a, b, name] of DERBY_LIST) {
  DERBIES.set(`${a}|${b}`, name);
  DERBIES.set(`${b}|${a}`, name);
}
/** Nombre del clásico entre dos equipos, o null si no lo es. */
export const derbyName = (a: string, b: string) => DERBIES.get(`${a}|${b}`) ?? null;

// ---------- Fuerza dinámica de los clubes ----------
/** Fuerza original de cada club (la de fábrica). La partida guarda su propia versión en `Career.power`. */
export const BASE_STRENGTH: Record<string, number> = Object.fromEntries(CLUBS.map((c) => [c.id, c.strength]));
/** Pone la fuerza de cada club según la partida activa (o la de fábrica si no hay dato). */
export function applyPower(power: Record<string, number> | undefined) {
  for (const c of CLUBS) c.strength = power?.[c.id] ?? BASE_STRENGTH[c.id];
}
/** Nombre inventado al azar para fichajes. */
export function randomName(region: string, r: () => number = rand) {
  const [a, b] = NAME_POOL[region] ?? NAME_POOL.eu;
  return `${a[Math.floor(r() * a.length)]} ${b[Math.floor(r() * b.length)]}`;
}
