export const DRUGS = {
  cocaine: { name: 'Cocaine',  min: 15000, max: 30000 },
  heroin:  { name: 'Heroin',   min: 5000,  max: 14000 },
  acid:    { name: 'Acid',     min: 1000,  max: 4500  },
  weed:    { name: 'Weed',     min: 400,   max: 1200  },
  speed:   { name: 'Speed',    min: 500,   max: 1500  },
  ludes:   { name: 'Ludes',    min: 150,   max: 600   },
  opium:   { name: 'Opium',    min: 500,   max: 3500  },
  shrooms: { name: 'Shrooms',  min: 600,   max: 1300  },
  pcp:     { name: 'PCP',      min: 1000,  max: 3500  },
  crack:   { name: 'Crack',    min: 1000,  max: 4000  },
  hash:    { name: 'Hash',     min: 300,   max: 900   },
  smack:   { name: 'Smack',    min: 3000,  max: 9000  },
};

export const LOCATIONS = {
  loddefjord:   {
    name: 'Loddefjord', priceModifier: 1.0, services: ['loanshark', 'bank'],
    description: 'Hjemsted. Gata du kjenner.',
    alwaysHave: ['weed', 'hash'],
    drugModifiers: { weed: 0.5, hash: 0.6 },
  },
  laksevag:     {
    name: 'Laksevåg', priceModifier: 0.9, services: [],
    description: 'Havneområdet. Billige stimulanter.',
    alwaysHave: ['speed'],
    drugModifiers: { speed: 0.65, crack: 0.75 },
  },
  fyllingsdalen: {
    name: 'Fyllingsdalen', priceModifier: 1.1, services: [],
    description: 'Kjøpesenter og stille gater.',
    alwaysHave: [],
    drugModifiers: {},
  },
  sentrum:      {
    name: 'Sentrum', priceModifier: 1.3, services: ['weapons', 'coat'],
    description: 'Bergen sentrum. Høy etterspørsel.',
    alwaysHave: ['cocaine'],
    drugModifiers: { cocaine: 1.1 },
  },
  asane:        {
    name: 'Åsane', priceModifier: 0.95, services: [],
    description: 'Nordlige forsteder. Alltid gress.',
    alwaysHave: ['weed'],
    drugModifiers: { weed: 0.7 },
  },
  nesttun:      {
    name: 'Nesttun', priceModifier: 0.88, services: [],
    description: 'Sørlige forsteder. Rabatterte opioider.',
    alwaysHave: ['opium', 'smack'],
    drugModifiers: { opium: 0.6, smack: 0.7, heroin: 0.75 },
  },
};

export const WEAPONS = [
  { id: 'beretta',   name: 'Beretta',               price: 18000, damage: 5, accuracy: 0.50 },
  { id: 'ruger',     name: 'Ruger',                 price: 14500, damage: 4, accuracy: 0.60 },
  { id: 'special38', name: '.38 Special',            price: 32500, damage: 9, accuracy: 0.50 },
  { id: 'snspecial', name: 'Saturday Night Special', price: 25500, damage: 7, accuracy: 0.65 },
];

export const NPC = {
  loanshark: 'Svein',
  cop: 'Betjent Hardnes',
};

export const SCORE_RATINGS = [
  { threshold: 250000,    label: 'Vestkantens verste' },
  { threshold: 100000,    label: 'Loddefjord-kongen' },
  { threshold: 50000,     label: 'Lokal legende' },
  { threshold: 10000,     label: 'Gateselger' },
  { threshold: 0,         label: 'Amatør' },
  { threshold: -Infinity, label: 'Gjeld og skam' },
];

export const MAX_DAYS = 30;
export const STARTING_CASH = 2000;
export const STARTING_DEBT = 5500;
export const DEBT_RATE = 0.10;
export const COAT_UPGRADE_UNITS = 50;
export const COAT_UPGRADE_PRICE = 10000;
export const MAX_COAT_SIZE = 250;
export const MAX_GUNS = 2;
