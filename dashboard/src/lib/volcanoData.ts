export interface VolcanoLocation {
  name: string;
  aliases: string[];
  pos: [number, number]; // [lat, lon]
  elevation: number; // meters above sea level
  island: string;
  province: string;
  pgaStation: string;
  sensorType: string;
  defaultLevel: string;
}

export const INDONESIAN_VOLCANOES: VolcanoLocation[] = [
  {
    name: 'Anak Krakatau',
    aliases: ['krakatau', 'anak krakatau', 'g. anak krakatau'],
    pos: [-6.102, 105.423],
    elevation: 157,
    island: 'Selat Sunda',
    province: 'Lampung / Banten',
    pgaStation: 'Pos PGA Pasauran, Anyer',
    sensorType: 'Short-Period Mark L4C + Broadband Güralp CMG-40T',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Ibu',
    aliases: ['ibu', 'g. ibu'],
    pos: [1.488, 127.630],
    elevation: 1325,
    island: 'Halmahera Barat',
    province: 'Maluku Utara',
    pgaStation: 'Pos PGA Gam Ici, Ibu',
    sensorType: 'Lennartz 3D 1-Hz + Kinemetrics Basalt 24-bit',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Lewotobi Laki-laki',
    aliases: ['lewotobi laki-laki', 'lewotobi', 'g. lewotobi laki-laki', 'lewotobi perempuan'],
    pos: [-8.538, 122.768],
    elevation: 1584,
    island: 'Flores Timur',
    province: 'Nusa Tenggara Timur',
    pgaStation: 'Pos PGA Pululera, Wulanggitang',
    sensorType: 'Broadband Güralp CMG-6TD (100 Hz)',
    defaultLevel: 'LEVEL IV (AWAS)',
  },
  {
    name: 'Ili Lewotolok',
    aliases: ['ili lewotolok', 'lewotolok', 'g. ili lewotolok'],
    pos: [-8.272, 123.505],
    elevation: 1423,
    island: 'Lembata',
    province: 'Nusa Tenggara Timur',
    pgaStation: 'Pos PGA Lamahora, Ile Ape',
    sensorType: 'Short-Period Mark L4C + Digitizer 24-bit',
    defaultLevel: 'LEVEL II (WASPADA)',
  },
  {
    name: 'Semeru',
    aliases: ['semeru', 'g. semeru', 'mahameru'],
    pos: [-8.108, 112.922],
    elevation: 3676,
    island: 'Jawa Timur',
    province: 'Lumajang / Malang',
    pgaStation: 'Pos PGA Gunung Sawur, Candipuro',
    sensorType: 'Broadband Güralp CMG-40T + Telemetri RTS',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Merapi',
    aliases: ['merapi', 'g. merapi'],
    pos: [-7.540, 110.446],
    elevation: 2968,
    island: 'Jawa Tengah / DIY',
    province: 'Sleman / Klaten / Boyolali / Magelang',
    pgaStation: 'Pos PGA Kaliurang & Babadan (BPPTKG)',
    sensorType: 'Broadband Nanometrics Trillium Compact 120s',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Marapi',
    aliases: ['marapi', 'g. marapi'],
    pos: [-0.381, 100.473],
    elevation: 2891,
    island: 'Sumatera Barat',
    province: 'Agam / Tanah Datar',
    pgaStation: 'Pos PGA Batu Palano, Sungai Pua',
    sensorType: 'Short-Period Mark L4C + Broadband Seismometer',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Sinabung',
    aliases: ['sinabung', 'g. sinabung'],
    pos: [3.170, 98.392],
    elevation: 2460,
    island: 'Sumatera Utara',
    province: 'Karo',
    pgaStation: 'Pos PGA Ndokum Siroga, Simpang Empat',
    sensorType: 'Broadband Güralp CMG-40T + Seismic Array',
    defaultLevel: 'LEVEL II (WASPADA)',
  },
  {
    name: 'Ruang',
    aliases: ['ruang', 'g. ruang'],
    pos: [2.300, 125.370],
    elevation: 725,
    island: 'Kepulauan Sitaro',
    province: 'Sulawesi Utara',
    pgaStation: 'Pos PGA Tagulandang',
    sensorType: 'Broadband Seismometer + Buoy Warning Interface',
    defaultLevel: 'LEVEL III (SIAGA)',
  },
  {
    name: 'Dukono',
    aliases: ['dukono', 'g. dukono'],
    pos: [1.680, 127.880],
    elevation: 1335,
    island: 'Halmahera Utara',
    province: 'Maluku Utara',
    pgaStation: 'Pos PGA Mamuya, Tobelo',
    sensorType: 'Short-Period Mark L4C + Real-Time Telemetry',
    defaultLevel: 'LEVEL II (WASPADA)',
  },
  {
    name: 'Bromo',
    aliases: ['bromo', 'g. bromo'],
    pos: [-7.942, 112.950],
    elevation: 2329,
    island: 'Jawa Timur',
    province: 'Probolinggo / Pasuruan',
    pgaStation: 'Pos PGA Ngadisari, Sukapura',
    sensorType: 'Broadband Güralp CMG-40T',
    defaultLevel: 'LEVEL II (WASPADA)',
  },
  {
    name: 'Tangkuban Parahu',
    aliases: ['tangkuban parahu', 'tangkuban perahu', 'g. tangkuban parahu'],
    pos: [-6.770, 107.600],
    elevation: 2084,
    island: 'Jawa Barat',
    province: 'Subang / Bandung Barat',
    pgaStation: 'Pos PGA Cikole, Lembang',
    sensorType: 'Short-Period Mark L4C + Geophone Array',
    defaultLevel: 'LEVEL I (NORMAL)',
  },
  {
    name: 'Kelud',
    aliases: ['kelud', 'g. kelud'],
    pos: [-7.930, 112.308],
    elevation: 1731,
    island: 'Jawa Timur',
    province: 'Kediri / Blitar',
    pgaStation: 'Pos PGA Sugihwaras, Ngancar',
    sensorType: 'Broadband Trillium Compact',
    defaultLevel: 'LEVEL I (NORMAL)',
  },
  {
    name: 'Kerinci',
    aliases: ['kerinci', 'g. kerinci'],
    pos: [-1.697, 101.264],
    elevation: 3805,
    island: 'Sumatera Tengah',
    province: 'Jambi / Sumatera Barat',
    pgaStation: 'Pos PGA Kayu Aro, Kerinci',
    sensorType: 'Short-Period Mark L4C',
    defaultLevel: 'LEVEL II (WASPADA)',
  },
  {
    name: 'Agung',
    aliases: ['agung', 'g. agung'],
    pos: [-8.343, 115.508],
    elevation: 3142,
    island: 'Bali',
    province: 'Karangasem',
    pgaStation: 'Pos PGA Rendang, Karangasem',
    sensorType: 'Broadband Güralp CMG-40T',
    defaultLevel: 'LEVEL I (NORMAL)',
  },
];

export function findVolcanoLocation(name: string): VolcanoLocation | null {
  if (!name) return null;
  const clean = name.toLowerCase().trim().replace(/^g\.\s*/, '');
  for (const v of INDONESIAN_VOLCANOES) {
    if (v.name.toLowerCase() === clean) return v;
    for (const alias of v.aliases) {
      if (clean.includes(alias) || alias.includes(clean)) {
        return v;
      }
    }
  }
  return null;
}
