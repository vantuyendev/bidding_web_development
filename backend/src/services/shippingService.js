import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let staticAddressData = [];
try {
  const filePath = path.join(__dirname, '../data/vietnam_address_data.json');
  if (fs.existsSync(filePath)) {
    staticAddressData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
} catch (err) {
  console.error('[Shipping Service] Lỗi đọc file vietnam_address_data.json:', err.message);
}

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
  // Dự phòng về MIỀN BẮC nếu không tìm thấy
  return REGIONS.NORTH;
};

/**
 * HÀM TÍNH PHÍ VẬN CHUYỂN C2C DÂN DỤNG (calculateShippingFee)
 * - Nó là gì: Hệ thống tính toán chi phí vận chuyển động dựa trên địa chỉ người bán (nơi gửi), 
 *   địa chỉ người mua (nơi nhận) và kích thước/khối lượng của sản phẩm.
 * - Để làm gì: Đảm bảo tính minh bạch về chi phí vận chuyển trước khi người mua thanh toán đơn hàng.
 *   Phí vận chuyển được tự động cộng vào đơn hàng để người mua trả 1 lần.
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

  // 1. TÍNH TRỌNG LƯỢNG QUY ĐỔI (Volumetric Weight)
  // - Nó là gì: Công thức quy đổi thể tích của thùng hàng thành khối lượng: (Dài x Rộng x Cao) / 5000.
  // - Tại sao phải chia 5000: Đây là hệ số chuẩn quốc tế của ngành hàng không và đường bộ (Vận chuyển VNPost, ViettelPost,...).
  // - Ý nghĩa: Một mặt hàng cồng kềnh tuy nhẹ (như gấu bông, thùng xốp) vẫn chiếm chỗ rất lớn trên xe tải/máy bay,
  //   do đó phải tính cước phí theo thể tích quy đổi thay vì cân nặng thực tế.
  const volumetricWeight = (length * width * height) / 5000.0;

  // 2. KHỐI LƯỢNG TÍNH CƯỚC (Chargeable Weight)
  // - Nó là gì: Lấy giá trị lớn nhất giữa cân nặng thực tế (weight) và thể tích quy đổi (volumetricWeight).
  // - Để làm gì: Bảo đảm nhà xe không bị lỗ khi chở hàng nhẹ cồng kềnh, hoặc hàng nhỏ siêu nặng (như tạ sắt).
  const chargeableWeight = Math.max(weight, volumetricWeight);

  // 3. TRA CỨU CƯỚC PHÍ THEO VÙNG ĐỊA LÝ (Matrix-based shipping fee lookup)
  // - Phí vận chuyển bao gồm: Phí cơ bản (áp dụng cho 0.5kg đầu tiên) + Phí tăng thêm (cho mỗi 0.5kg tiếp theo).
  let baseFee = 0;
  let stepFee = 0;

  const normFrom = normalizeProvince(fromProvince);
  const normTo = normalizeProvince(toProvinceId);

  if (normFrom === normTo && normFrom !== '') {
    // 3.1 NỘI TỈNH (Intra-province) - Gửi và nhận cùng tỉnh/thành phố (ví dụ: Hà Nội -> Hà Nội)
    // Giá rẻ nhất và thời gian giao nhanh nhất.
    baseFee = 22000;
    stepFee = 5000;
  } else {
    const regionFrom = getRegion(fromProvince);
    const regionTo = getRegion(toProvinceId);

    if (regionFrom === regionTo) {
      // 3.2 NỘI MIỀN (Intra-region) - Khác tỉnh nhưng cùng miền (ví dụ: Hà Nội -> Hải Phòng, cùng Miền Bắc)
      baseFee = 35000;
      stepFee = 10000;
    } else {
      // 3.3 LIÊN MIỀN (Inter-region) - Khác miền hoàn toàn (ví dụ: Hà Nội -> TP. Hồ Chí Minh, Bắc -> Nam)
      // Cước phí cao nhất do khoảng cách xa, phải trung chuyển nhiều kho.
      baseFee = 45000;
      stepFee = 15000;
    }
  }

  // 4. TÍNH PHẦN KHỐI LƯỢNG VƯỢT TRỘI (Every additional 0.5kg beyond the base 0.5kg)
  // - Trừ đi 0.5kg đầu tiên (đã bao gồm trong baseFee).
  // - Phần khối lượng dư thừa sẽ được làm tròn lên theo các mốc 0.5kg để nhân với stepFee.
  const extraWeight = Math.max(0, chargeableWeight - 0.5);
  const extraSteps = Math.ceil(extraWeight / 0.5);
  const totalFee = baseFee + extraSteps * stepFee;

  return new Prisma.Decimal(totalFee);
}

// ==========================================
// TÍCH HỢP HÀNH CHÍNH & KHU VỰC ĐỘNG TỪ GHN API (SANDBOX)
// ==========================================

const cache = {
  provinces: null,
  districts: {}, // key: provinceId
  wards: {} // key: districtId
};

// Fallback lists
const FALLBACK_PROVINCES = [
  { id: 201, name: 'Hà Nội' },
  { id: 202, name: 'TP. Hồ Chí Minh' },
  { id: 203, name: 'Đà Nẵng' },
  { id: 204, name: 'Hải Phòng' },
  { id: 205, name: 'Cần Thơ' },
  { id: 206, name: 'Bình Dương' },
  { id: 207, name: 'Đồng Nai' },
  { id: 208, name: 'Khánh Hòa' },
  { id: 209, name: 'Quảng Ninh' }
];

const FALLBACK_DISTRICTS = {
  201: [
    { id: 1454, name: 'Quận Cầu Giấy' },
    { id: 1455, name: 'Quận Đống Đa' },
    { id: 1456, name: 'Quận Ba Đình' },
    { id: 1457, name: 'Quận Hoàn Kiếm' },
    { id: 1458, name: 'Quận Hai Bà Trưng' }
  ],
  202: [
    { id: 1460, name: 'Quận 1' },
    { id: 1461, name: 'Quận 3' },
    { id: 1462, name: 'Quận 7' },
    { id: 1463, name: 'Quận Bình Thạnh' }
  ],
  203: [
    { id: 1470, name: 'Quận Hải Châu' },
    { id: 1471, name: 'Quận Thanh Khê' }
  ]
};

const FALLBACK_WARDS = {
  1454: [
    { code: '21211', name: 'Phường Dịch Vọng Hậu' },
    { code: '21212', name: 'Phường Quan Hoa' }
  ],
  1460: [
    { code: '21301', name: 'Phường Bến Nghé' },
    { code: '21302', name: 'Phường Bến Thành' }
  ]
};

function getFallbackProvinces() {
  return FALLBACK_PROVINCES;
}

function getFallbackDistricts(provinceId) {
  return FALLBACK_DISTRICTS[provinceId] || [
    { id: Number(provinceId) * 10 + 1, name: 'Quận Trung tâm' },
    { id: Number(provinceId) * 10 + 2, name: 'Huyện Ngoại thành' }
  ];
}

function getFallbackWards(districtId) {
  return FALLBACK_WARDS[districtId] || [
    { code: `${districtId}01`, name: 'Phường Trung tâm' },
    { code: `${districtId}02`, name: 'Phường Ngoại ô' }
  ];
}

// Fetch dynamic lists
export async function getProvinces() {
  if (cache.provinces) return cache.provinces;
  const token = process.env.GHN_API_TOKEN;
  if (token && token !== 'your_ghn_sandbox_token') {
    try {
      const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province', {
        headers: { 'Token': token }
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        cache.provinces = json.data.map(p => ({
          id: p.ProvinceID,
          name: p.ProvinceName
        })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        return cache.provinces;
      }
    } catch (err) {
      console.error('[GHN Provinces API Error]:', err.message);
    }
  }

  // Fallback to static fully nationwide provinces
  if (staticAddressData && staticAddressData.length > 0) {
    cache.provinces = staticAddressData.map(p => ({
      id: p.id,
      name: p.name
    })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return cache.provinces;
  }

  return getFallbackProvinces();
}

export async function getDistricts(provinceId) {
  if (cache.districts[provinceId]) return cache.districts[provinceId];
  const token = process.env.GHN_API_TOKEN;
  // If it looks like a GHN Province ID (numeric string and generally greater than 100)
  if (token && token !== 'your_ghn_sandbox_token' && Number(provinceId) > 100) {
    try {
      const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district', {
        method: 'POST',
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ province_id: Number(provinceId) })
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        cache.districts[provinceId] = json.data.map(d => ({
          id: d.DistrictID,
          name: d.DistrictName
        })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        return cache.districts[provinceId];
      }
    } catch (err) {
      console.error(`[GHN Districts API Error] province ${provinceId}:`, err.message);
    }
  }

  // Fallback to static districts in selected province
  let foundProvince = staticAddressData.find(p => String(p.id) === String(provinceId));
  if (!foundProvince) {
    // If provinceId is from GHN (e.g. 201) but we are in fallback mode (e.g. token expired), map via province name
    const provinces = await getProvinces();
    const provObj = provinces.find(p => String(p.id) === String(provinceId));
    if (provObj) {
      const normName = normalizeProvince(provObj.name);
      foundProvince = staticAddressData.find(p => normalizeProvince(p.name) === normName);
    }
  }

  if (foundProvince && foundProvince.districts) {
    cache.districts[provinceId] = foundProvince.districts.map(d => ({
      id: d.id,
      name: d.name
    })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return cache.districts[provinceId];
  }

  return getFallbackDistricts(provinceId);
}

export async function getWards(districtId) {
  if (cache.wards[districtId]) return cache.wards[districtId];
  const token = process.env.GHN_API_TOKEN;
  if (token && token !== 'your_ghn_sandbox_token' && Number(districtId) > 1000) {
    try {
      const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward', {
        method: 'POST',
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ district_id: Number(districtId) })
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        cache.wards[districtId] = json.data.map(w => ({
          code: w.WardCode,
          name: w.WardName
        })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        return cache.wards[districtId];
      }
    } catch (err) {
      console.error(`[GHN Wards API Error] district ${districtId}:`, err.message);
    }
  }
  return getFallbackWards(districtId);
}

// Fuzzy matching to find IDs from DB strings
export async function findProvinceIdByName(provinceName) {
  if (!provinceName) return null;
  const provinces = await getProvinces();
  const normSearch = normalizeProvince(provinceName);
  const found = provinces.find(p => normalizeProvince(p.name).includes(normSearch) || normSearch.includes(normalizeProvince(p.name)));
  return found ? found.id : null;
}

export async function findDistrictIdByName(provinceId, districtName) {
  if (!provinceId || !districtName) return null;
  const districts = await getDistricts(provinceId);
  const normSearch = normalizeProvince(districtName);
  const found = districts.find(d => normalizeProvince(d.name).includes(normSearch) || normSearch.includes(normalizeProvince(d.name)));
  return found ? found.id : null;
}

export async function findWardCodeByName(districtId, wardName) {
  if (!districtId || !wardName) return null;
  const wards = await getWards(districtId);
  const normSearch = normalizeProvince(wardName);
  const found = wards.find(w => normalizeProvince(w.name).includes(normSearch) || normSearch.includes(normalizeProvince(w.name)));
  return found ? found.code : null;
}

// Call GHN Sandbox API to calculate fee
export async function calculateGHNFee({ fromDistrictId, fromWardCode, toDistrictId, toWardCode, weight, length, width, height }) {
  const token = process.env.GHN_API_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;

  if (!token || token === 'your_ghn_sandbox_token') {
    throw new Error("GHN_API_TOKEN chưa được thiết lập");
  }

  const weightGrams = Math.max(100, Math.round(weight * 1000));

  const payload = {
    from_district_id: Number(fromDistrictId),
    to_district_id: Number(toDistrictId),
    weight: weightGrams,
    length: length || 10,
    width: width || 10,
    height: height || 10,
    service_type_id: 2
  };

  if (fromWardCode) payload.from_ward_code = String(fromWardCode);
  if (toWardCode) payload.to_ward_code = String(toWardCode);

  const headers = {
    'Token': token,
    'Content-Type': 'application/json'
  };
  
  if (shopId && shopId !== 'your_ghn_shop_id') {
    headers['ShopId'] = String(shopId);
  }

  const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (json.code === 200 && json.data) {
    return Number(json.data.total);
  } else {
    throw new Error(json.message || "Lỗi gọi API tính phí GHN");
  }
}

// Call GHTK Sandbox API to calculate fee
export async function calculateGHTKFee({ fromProvince, fromDistrict, toProvince, toDistrict, toWard, weight }) {
  const token = process.env.GHTK_API_TOKEN;

  if (!token || token === 'your_ghtk_sandbox_token') {
    throw new Error("GHTK_API_TOKEN chưa được thiết lập");
  }

  const weightGrams = Math.max(100, Math.round(weight * 1000));

  const query = new URLSearchParams({
    pick_province: fromProvince,
    pick_district: fromDistrict,
    province: toProvince,
    district: toDistrict,
    weight: String(weightGrams)
  });

  if (toWard) query.append('ward', toWard);

  const headers = {
    'Token': token
  };

  const partnerCode = process.env.GHTK_PARTNER_CODE;
  if (partnerCode && partnerCode !== 'your_ghtk_partner_code') {
    headers['X-Client-Source'] = partnerCode;
  }

  const res = await fetch(`https://services-staging.ghtklab.com/services/shipment/fee?${query.toString()}`, {
    headers
  });

  const json = await res.json();
  if (json.success && json.fee) {
    return Number(json.fee.fee);
  } else {
    throw new Error(json.message || "Lỗi gọi API tính phí GHTK");
  }
}

// Unified Async Shipping Fee Calculator with Fallback
export async function calculateShippingFeeAsync({ product, toProvinceId, toDistrictId, toWardId, carrier }) {
  if (!product) {
    throw new Error("Product data is required for shipping calculation");
  }

  const weight = product.weight !== undefined && product.weight !== null ? Number(product.weight) : 0.5;
  const length = product.length !== undefined && product.length !== null ? Number(product.length) : 10;
  const width = product.width !== undefined && product.width !== null ? Number(product.width) : 10;
  const height = product.height !== undefined && product.height !== null ? Number(product.height) : 10;

  const fromProvince = product.provinceId || '';
  const fromDistrict = product.districtId || '';

  const chosenCarrier = String(carrier || 'GHN').toUpperCase();

  try {
    if (chosenCarrier === 'GHN') {
      const fromProvId = await findProvinceIdByName(fromProvince);
      const fromDistId = await findDistrictIdByName(fromProvId, fromDistrict);
      const toProvId = await findProvinceIdByName(toProvinceId);
      const toDistId = await findDistrictIdByName(toProvId, toDistrictId);
      const toWardCode = toWardId ? await findWardCodeByName(toDistId, toWardId) : null;

      if (fromDistId && toDistId) {
        const fee = await calculateGHNFee({
          fromDistrictId: fromDistId,
          fromWardCode: null,
          toDistrictId: toDistId,
          toWardCode,
          weight,
          length,
          width,
          height
        });
        console.log(`[Shipping Service] GHN API calculated fee: ${fee} VNĐ`);
        return new Prisma.Decimal(fee);
      }
    } else if (chosenCarrier === 'GHTK') {
      const fee = await calculateGHTKFee({
        fromProvince,
        fromDistrict,
        toProvince: toProvinceId,
        toDistrict: toDistrictId,
        toWard: toWardId,
        weight
      });
      console.log(`[Shipping Service] GHTK API calculated fee: ${fee} VNĐ`);
      return new Prisma.Decimal(fee);
    }
  } catch (err) {
    console.warn(`[Shipping Service Warning] Không thể tính phí qua API ${chosenCarrier} (${err.message}). Đang sử dụng chế độ dự phòng...`);
  }

  // Fallback to static regional calculations
  const offlineFee = calculateShippingFee({ product, toProvinceId, toDistrictId });
  if (chosenCarrier === 'GHTK') {
    return new Prisma.Decimal(Number(offlineFee) + 2000); // simulate GHTK being slightly different
  }
  return offlineFee;
}

/**
 * Register a shipment order with a logistics partner (GHN or GHTK).
 * Automatically falls back to an internal tracking code if the partner API fails or is unconfigured.
 */
export async function registerShipmentAsync({ product, seller }) {
  const chosenCarrier = String(product.shippingCarrier || 'GHN').toUpperCase();
  const weight = product.weight !== undefined && product.weight !== null ? Number(product.weight) : 0.5;
  const length = product.length || 10;
  const width = product.width || 10;
  const height = product.height || 10;

  const weightGrams = Math.max(100, Math.round(weight * 1000));
  const fromProvince = product.provinceId || '';
  const fromDistrict = product.districtId || '';

  try {
    if (chosenCarrier === 'GHN') {
      const token = process.env.GHN_API_TOKEN;
      const shopId = process.env.GHN_SHOP_ID;

      if (!token || token === 'your_ghn_sandbox_token') {
        throw new Error("GHN_API_TOKEN chưa được cấu hình. Chuyển sang vận chuyển nội bộ.");
      }

      // Resolve location IDs
      const fromProvId = await findProvinceIdByName(fromProvince);
      const fromDistId = await findDistrictIdByName(fromProvId, fromDistrict);
      const toProvId = await findProvinceIdByName(product.toProvinceId);
      const toDistId = await findDistrictIdByName(toProvId, product.toDistrictId);
      const toWardCode = product.toWardId ? await findWardCodeByName(toDistId, product.toWardId) : null;

      if (!toDistId) {
        throw new Error("Không thể xác định mã Quận/Huyện của người nhận.");
      }

      const payload = {
        payment_type_id: 1, // Người gửi (Seller) thanh toán phí vận chuyển (AuraBid thu tiền từ Escrow trả Seller)
        note: `Đơn hàng AuraBid #${product.id.substring(0, 8)}`,
        required_note: "KHONGCHOXEMHANG",
        from_name: seller.name || "Người bán AuraBid",
        from_phone: seller.phoneNumber || "0901234567",
        from_address: seller.shopAddress || "Địa chỉ shop AuraBid",
        from_district_name: fromDistrict || "Quận Cầu Giấy",
        from_province_name: fromProvince || "Hà Nội",
        to_name: product.winnerName || "Người mua AuraBid",
        to_phone: product.winnerPhone || "0987654321",
        to_address: product.winnerAddress || "Địa chỉ nhận AuraBid",
        to_district_id: Number(toDistId),
        weight: weightGrams,
        length: length,
        width: width,
        height: height,
        service_type_id: 2,
        items: [
          {
            name: product.title.substring(0, 50),
            code: product.id.substring(0, 10),
            quantity: 1,
            price: Number(product.currentPrice),
            weight: weightGrams
          }
        ]
      };

      if (toWardCode) {
        payload.to_ward_code = String(toWardCode);
      }

      const headers = {
        'Token': token,
        'Content-Type': 'application/json'
      };

      if (shopId && shopId !== 'your_ghn_shop_id') {
        headers['ShopId'] = String(shopId);
      }

      const response = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (resJson.code === 200 && resJson.data && resJson.data.order_code) {
        console.log(`[Shipping Service] Đăng ký vận đơn GHN thành công: ${resJson.data.order_code}`);
        return {
          trackingCode: resJson.data.order_code,
          carrier: 'GHN',
          syncStatus: 'SYNCHRONIZED',
          isFallback: false
        };
      } else {
        throw new Error(resJson.message || "Lỗi phản hồi từ API GHN");
      }
    } else if (chosenCarrier === 'GHTK') {
      const token = process.env.GHTK_API_TOKEN;

      if (!token || token === 'your_ghtk_sandbox_token') {
        throw new Error("GHTK_API_TOKEN chưa được cấu hình. Chuyển sang vận chuyển nội bộ.");
      }

      const payload = {
        products: [
          {
            name: product.title.substring(0, 50),
            weight: weight,
            quantity: 1,
            product_code: product.id.substring(0, 10)
          }
        ],
        order: {
          id: `AB-${product.id.substring(0, 8)}-${Date.now().toString().slice(-4)}`,
          pick_name: seller.name || "Người bán AuraBid",
          pick_money: 0,
          pick_address: seller.shopAddress || "Địa chỉ shop AuraBid",
          pick_province: fromProvince || "Hà Nội",
          pick_district: fromDistrict || "Quận Cầu Giấy",
          pick_tel: seller.phoneNumber || "0901234567",
          tel: product.winnerPhone || "0987654321",
          name: product.winnerName || "Người mua AuraBid",
          address: product.winnerAddress || "Địa chỉ nhận AuraBid",
          province: product.toProvinceId || "Hà Nội",
          district: product.toDistrictId || "Quận Đống Đa",
          ward: product.toWardId || "Phường Láng Hạ",
          weight_option: "gram",
          value: Number(product.currentPrice),
          transport: "road"
        }
      };

      const headers = {
        'Token': token,
        'Content-Type': 'application/json'
      };

      const partnerCode = process.env.GHTK_PARTNER_CODE;
      if (partnerCode && partnerCode !== 'your_ghtk_partner_code') {
        headers['X-Client-Source'] = partnerCode;
      }

      const response = await fetch('https://services-staging.ghtklab.com/services/shipment/order', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (resJson.success && resJson.order && resJson.order.label) {
        console.log(`[Shipping Service] Đăng ký vận đơn GHTK thành công: ${resJson.order.label}`);
        return {
          trackingCode: resJson.order.label,
          carrier: 'GHTK',
          syncStatus: 'SYNCHRONIZED',
          isFallback: false
        };
      } else {
        throw new Error(resJson.message || "Lỗi phản hồi từ API GHTK");
      }
    }
  } catch (err) {
    console.warn(`[Shipping Service Warning] Không thể kết nối đối tác bưu cục (${err.message}). Kích hoạt phương án dự phòng nội bộ...`);
  }

  // Fallback internal tracking code (Exception 1)
  const internalCode = `AURABID-INT-${product.id.substring(0, 8).toUpperCase()}`;
  return {
    trackingCode: internalCode,
    carrier: chosenCarrier,
    syncStatus: 'PENDING',
    isFallback: true
  };
}

