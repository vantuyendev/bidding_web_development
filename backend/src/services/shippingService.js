import { Prisma } from '@prisma/client';

const REGIONS = {
  NORTH: 'North',
  CENTRAL: 'Central',
  SOUTH: 'South'
};

const PROVINCE_TO_REGION = {
  // Northern Region (Miền Bắc)
  '01': REGIONS.NORTH, 'ha noi': REGIONS.NORTH, 'hanoi': REGIONS.NORTH,
  '02': REGIONS.NORTH, 'ha giang': REGIONS.NORTH, 'hagiang': REGIONS.NORTH,
  '04': REGIONS.NORTH, 'cao bang': REGIONS.NORTH, 'caobang': REGIONS.NORTH,
  '06': REGIONS.NORTH, 'bac kan': REGIONS.NORTH, 'backan': REGIONS.NORTH,
  '08': REGIONS.NORTH, 'tuyen quang': REGIONS.NORTH, 'tuyenquang': REGIONS.NORTH,
  '10': REGIONS.NORTH, 'lao cai': REGIONS.NORTH, 'laocai': REGIONS.NORTH,
  '11': REGIONS.NORTH, 'dien bien': REGIONS.NORTH, 'dienbien': REGIONS.NORTH,
  '12': REGIONS.NORTH, 'lai chau': REGIONS.NORTH, 'laichau': REGIONS.NORTH,
  '14': REGIONS.NORTH, 'son la': REGIONS.NORTH, 'sonla': REGIONS.NORTH,
  '15': REGIONS.NORTH, 'yen bai': REGIONS.NORTH, 'yenbai': REGIONS.NORTH,
  '17': REGIONS.NORTH, 'hoa binh': REGIONS.NORTH, 'hoabinh': REGIONS.NORTH,
  '19': REGIONS.NORTH, 'thai nguyen': REGIONS.NORTH, 'thainguyen': REGIONS.NORTH,
  '20': REGIONS.NORTH, 'lang son': REGIONS.NORTH, 'langson': REGIONS.NORTH,
  '22': REGIONS.NORTH, 'quang ninh': REGIONS.NORTH, 'quangninh': REGIONS.NORTH,
  '24': REGIONS.NORTH, 'bac giang': REGIONS.NORTH, 'bacgiang': REGIONS.NORTH,
  '25': REGIONS.NORTH, 'phu tho': REGIONS.NORTH, 'phutho': REGIONS.NORTH,
  '26': REGIONS.NORTH, 'vinh phuc': REGIONS.NORTH, 'vinhphuc': REGIONS.NORTH,
  '27': REGIONS.NORTH, 'bac ninh': REGIONS.NORTH, 'bacninh': REGIONS.NORTH,
  '30': REGIONS.NORTH, 'hai duong': REGIONS.NORTH, 'haiduong': REGIONS.NORTH,
  '31': REGIONS.NORTH, 'hai phong': REGIONS.NORTH, 'haiphong': REGIONS.NORTH,
  '33': REGIONS.NORTH, 'hung yen': REGIONS.NORTH, 'hungyen': REGIONS.NORTH,
  '34': REGIONS.NORTH, 'thai binh': REGIONS.NORTH, 'thaibinh': REGIONS.NORTH,
  '35': REGIONS.NORTH, 'ha nam': REGIONS.NORTH, 'hanam': REGIONS.NORTH,
  '36': REGIONS.NORTH, 'nam dinh': REGIONS.NORTH, 'namdinh': REGIONS.NORTH,
  '37': REGIONS.NORTH, 'ninh binh': REGIONS.NORTH, 'ninhbinh': REGIONS.NORTH,

  // Central Region (Miền Trung)
  '38': REGIONS.CENTRAL, 'thanh hoa': REGIONS.CENTRAL, 'thanhhoa': REGIONS.CENTRAL,
  '40': REGIONS.CENTRAL, 'nghe an': REGIONS.CENTRAL, 'nghean': REGIONS.CENTRAL,
  '42': REGIONS.CENTRAL, 'ha tinh': REGIONS.CENTRAL, 'hatinh': REGIONS.CENTRAL,
  '44': REGIONS.CENTRAL, 'quang binh': REGIONS.CENTRAL, 'quangbinh': REGIONS.CENTRAL,
  '45': REGIONS.CENTRAL, 'quang tri': REGIONS.CENTRAL, 'quangtri': REGIONS.CENTRAL,
  '46': REGIONS.CENTRAL, 'thua thien hue': REGIONS.CENTRAL, 'thuathienhue': REGIONS.CENTRAL, 'hue': REGIONS.CENTRAL,
  '48': REGIONS.CENTRAL, 'da nang': REGIONS.CENTRAL, 'danang': REGIONS.CENTRAL,
  '49': REGIONS.CENTRAL, 'quang nam': REGIONS.CENTRAL, 'quangnam': REGIONS.CENTRAL,
  '51': REGIONS.CENTRAL, 'quang ngai': REGIONS.CENTRAL, 'quangngai': REGIONS.CENTRAL,
  '52': REGIONS.CENTRAL, 'binh dinh': REGIONS.CENTRAL, 'binhdinh': REGIONS.CENTRAL,
  '54': REGIONS.CENTRAL, 'phu yen': REGIONS.CENTRAL, 'phuyen': REGIONS.CENTRAL,
  '56': REGIONS.CENTRAL, 'khanh hoa': REGIONS.CENTRAL, 'khanhhoa': REGIONS.CENTRAL, 'nha trang': REGIONS.CENTRAL,
  '58': REGIONS.CENTRAL, 'ninh thuan': REGIONS.CENTRAL, 'ninhthuan': REGIONS.CENTRAL,
  '60': REGIONS.CENTRAL, 'binh thuan': REGIONS.CENTRAL, 'binhthuan': REGIONS.CENTRAL,
  '62': REGIONS.CENTRAL, 'kon tum': REGIONS.CENTRAL, 'kontum': REGIONS.CENTRAL,
  '64': REGIONS.CENTRAL, 'gia lai': REGIONS.CENTRAL, 'gialai': REGIONS.CENTRAL,
  '66': REGIONS.CENTRAL, 'dak lak': REGIONS.CENTRAL, 'daklak': REGIONS.CENTRAL, 'dac lac': REGIONS.CENTRAL, 'daclac': REGIONS.CENTRAL,
  '67': REGIONS.CENTRAL, 'dak nong': REGIONS.CENTRAL, 'daknong': REGIONS.CENTRAL, 'dac nong': REGIONS.CENTRAL, 'dacnong': REGIONS.CENTRAL,
  '68': REGIONS.CENTRAL, 'lam dong': REGIONS.CENTRAL, 'lamdong': REGIONS.CENTRAL, 'da lat': REGIONS.CENTRAL, 'dalat': REGIONS.CENTRAL,

  // Southern Region (Miền Nam)
  '70': REGIONS.SOUTH, 'binh phuoc': REGIONS.SOUTH, 'binhphuoc': REGIONS.SOUTH,
  '72': REGIONS.SOUTH, 'tay ninh': REGIONS.SOUTH, 'tayninh': REGIONS.SOUTH,
  '74': REGIONS.SOUTH, 'binh duong': REGIONS.SOUTH, 'binhduong': REGIONS.SOUTH,
  '75': REGIONS.SOUTH, 'dong nai': REGIONS.SOUTH, 'dongnai': REGIONS.SOUTH,
  '77': REGIONS.SOUTH, 'ba ria vung tau': REGIONS.SOUTH, 'bariavungtau': REGIONS.SOUTH, 'vung tau': REGIONS.SOUTH,
  '79': REGIONS.SOUTH, 'ho chi minh': REGIONS.SOUTH, 'hochiminh': REGIONS.SOUTH, 'hcm': REGIONS.SOUTH, 'sai gon': REGIONS.SOUTH, 'saigon': REGIONS.SOUTH, 'tphcm': REGIONS.SOUTH,
  '80': REGIONS.SOUTH, 'long an': REGIONS.SOUTH, 'longan': REGIONS.SOUTH,
  '82': REGIONS.SOUTH, 'tien giang': REGIONS.SOUTH, 'tiengiang': REGIONS.SOUTH,
  '83': REGIONS.SOUTH, 'ben tre': REGIONS.SOUTH, 'bentre': REGIONS.SOUTH,
  '84': REGIONS.SOUTH, 'tra vinh': REGIONS.SOUTH, 'travinh': REGIONS.SOUTH,
  '86': REGIONS.SOUTH, 'vinh long': REGIONS.SOUTH, 'vinhlong': REGIONS.SOUTH,
  '87': REGIONS.SOUTH, 'dong thap': REGIONS.SOUTH, 'dongthap': REGIONS.SOUTH,
  '89': REGIONS.SOUTH, 'an giang': REGIONS.SOUTH, 'angiang': REGIONS.SOUTH,
  '91': REGIONS.SOUTH, 'kien giang': REGIONS.SOUTH, 'kiengiang': REGIONS.SOUTH,
  '92': REGIONS.SOUTH, 'can tho': REGIONS.SOUTH, 'cantho': REGIONS.SOUTH,
  '93': REGIONS.SOUTH, 'hau giang': REGIONS.SOUTH, 'haugiang': REGIONS.SOUTH,
  '94': REGIONS.SOUTH, 'soc trang': REGIONS.SOUTH, 'soctrang': REGIONS.SOUTH,
  '95': REGIONS.SOUTH, 'bac lieu': REGIONS.SOUTH, 'baclieu': REGIONS.SOUTH,
  '96': REGIONS.SOUTH, 'ca mau': REGIONS.SOUTH, 'camau': REGIONS.SOUTH
};

export const normalizeProvince = (val) => {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getRegion = (provinceId) => {
  const norm = normalizeProvince(provinceId);
  if (PROVINCE_TO_REGION[norm]) {
    return PROVINCE_TO_REGION[norm];
  }
  for (const [key, region] of Object.entries(PROVINCE_TO_REGION)) {
    if (norm.includes(key) || key.includes(norm)) {
      return region;
    }
  }
  // Fallback to NORTH if not found
  return REGIONS.NORTH;
};

/**
 * Calculates the shipping fee based on the product specifications and destination.
 * 
 * @param {Object} params
 * @param {Object} params.product - Product object from DB
 * @param {string} params.toProvinceId - Destination Province ID
 * @param {string} params.toDistrictId - Destination District ID
 * @returns {Prisma.Decimal}
 */
export function calculateShippingFee({ product, toProvinceId, toDistrictId }) {
  if (!product) {
    throw new Error("Product data is required for shipping calculation");
  }

  const weight = product.weight !== undefined && product.weight !== null ? Number(product.weight) : 0.5;
  const length = product.length !== undefined && product.length !== null ? Number(product.length) : 10;
  const width = product.width !== undefined && product.width !== null ? Number(product.width) : 10;
  const height = product.height !== undefined && product.height !== null ? Number(product.height) : 10;
  
  const fromProvince = product.provinceId || '';

  // 1. Volumetric weight calculation
  const volumetricWeight = (length * width * height) / 5000.0;

  // 2. Chargeable weight
  const chargeableWeight = Math.max(weight, volumetricWeight);

  // 3. Matrix-based shipping fee lookup
  let baseFee = 0;
  let stepFee = 0;

  const normFrom = normalizeProvince(fromProvince);
  const normTo = normalizeProvince(toProvinceId);

  if (normFrom === normTo && normFrom !== '') {
    // Intra-province (Nội tỉnh)
    baseFee = 22000;
    stepFee = 5000;
  } else {
    const regionFrom = getRegion(fromProvince);
    const regionTo = getRegion(toProvinceId);

    if (regionFrom === regionTo) {
      // Intra-region (Nội miền)
      baseFee = 35000;
      stepFee = 10000;
    } else {
      // Inter-region (Liên miền)
      baseFee = 45000;
      stepFee = 15000;
    }
  }

  // Every additional 0.5kg beyond the base 0.5kg
  const extraWeight = Math.max(0, chargeableWeight - 0.5);
  const extraSteps = Math.ceil(extraWeight / 0.5);
  const totalFee = baseFee + extraSteps * stepFee;

  return new Prisma.Decimal(totalFee);
}
