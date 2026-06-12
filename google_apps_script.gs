/**
 * CatsTaste PWA Order Sync + Catalog Admin → Google Sheets
 *
 * Sheets:
 * - Orders: order sync rows
 * - Catalog: product source for the PWA
 *
 * Admin PIN:
 * - Apps Script Project Settings → Script properties → add ADMIN_PIN
 * - PIN is verified server-side and is not hard-coded in index.html
 */

const SHEET_NAME = 'Orders';
const CATALOG_SHEET_NAME = 'Catalog';
const ADMIN_PIN_PROPERTY = 'ADMIN_PIN';

const HEADERS = [
  'orderId','deviceId','createdAt','customerName','phone','email','address','notes',
  'paymentMethod','paymentStatus','shippingMethod','subtotal','discountAmount',
  'discountedSubtotal','shippingFee','total','giftEligible','freeShipping','isCod',
  'syncStatus','syncedAt','lastSyncError','itemsJson','whatsappText','serverReceivedAt','staffNotes'
];

const CATALOG_HEADERS = ["active", "id", "sku", "category", "name", "spec", "texture", "unitPrice", "boxPrice", "remarks", "updatedAt"];

const INITIAL_CATALOG = [
  {
    "active": true,
    "id": "TSH",
    "sku": "TSH",
    "category": "Snack 小食系列",
    "name": "吞拿魚帶子風味肉棒小食 30g",
    "spec": "30g",
    "texture": "肉棒",
    "unitPrice": 9.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "TSK",
    "sku": "TSK",
    "category": "Snack 小食系列",
    "name": "吞拿魚鰹魚風味肉棒小食 30g",
    "spec": "30g",
    "texture": "肉棒",
    "unitPrice": 9.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "TS",
    "sku": "TS",
    "category": "Snack 小食系列",
    "name": "吞拿魚魚肉棒小食 30g",
    "spec": "30g",
    "texture": "肉棒",
    "unitPrice": 9.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T01",
    "sku": "T01",
    "category": "Toy 公仔",
    "name": "黃貓",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T02",
    "sku": "T02",
    "category": "Toy 公仔",
    "name": "red cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T03",
    "sku": "T03",
    "category": "Toy 公仔",
    "name": "blue cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T04",
    "sku": "T04",
    "category": "Toy 公仔",
    "name": "old cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T05",
    "sku": "T05",
    "category": "Toy 公仔",
    "name": "pink cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T06",
    "sku": "T06",
    "category": "Toy 公仔",
    "name": "green cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "T07",
    "sku": "T07",
    "category": "Toy 公仔",
    "name": "purple cat",
    "spec": "Toy",
    "texture": "Toy",
    "unitPrice": 8.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PPU",
    "sku": "PPU",
    "category": "Healthy 健康系列",
    "name": "吞拿魚南瓜啫喱濕貓糧 針對消化用 70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PCR",
    "sku": "PCR",
    "category": "Healthy 健康系列",
    "name": "吞拿魚小紅莓啫喱濕貓糧 淨味用 70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PQC",
    "sku": "PQC",
    "category": "Healthy 健康系列",
    "name": "吞拿魚小紅莓藜麥啫喱濕貓糧 針對泌尿系統用 70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PPA",
    "sku": "PPA",
    "category": "Healthy 健康系列",
    "name": "吞拿魚木瓜啫喱濕貓糧 針對關節用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PCA",
    "sku": "PCA",
    "category": "Healthy 健康系列",
    "name": "吞拿魚椰菜啫喱濕貓糧 腎臟護理用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PM",
    "sku": "PM",
    "category": "Healthy 健康系列",
    "name": "吞拿魚芒果啫喱濕貓糧 針對化毛用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PSPIN",
    "sku": "PSPIN",
    "category": "Healthy 健康系列",
    "name": "吞拿魚菠菜啫喱濕貓糧 針對免疫系統用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PT",
    "sku": "PT",
    "category": "Healthy 健康系列",
    "name": "吞拿魚蕃茄啫喱濕貓糧 針對皮膚用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PCS",
    "sku": "PCS",
    "category": "Healthy 健康系列",
    "name": "吞拿魚蕃薯奇亞籽啫喱濕貓糧 控制體重用70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PA",
    "sku": "PA",
    "category": "Healthy 健康系列",
    "name": "吞拿魚鯷魚啫喱濕貓糧 鈣質補充70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "KMT",
    "sku": "KMT",
    "category": "Kitten 幼貓系列",
    "name": "幼貓吞拿魚雞肉慕絲70g",
    "spec": "包裝",
    "texture": "慕絲",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "KMC",
    "sku": "KMC",
    "category": "Kitten 幼貓系列",
    "name": "幼貓雞肉慕絲70g",
    "spec": "包裝",
    "texture": "慕絲",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PSSA",
    "sku": "PSSA",
    "category": "Senior 7+ 老年貓系列",
    "name": "吞拿魚三文魚啫喱貓糧70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PST",
    "sku": "PST",
    "category": "Senior 7+ 老年貓系列",
    "name": "老年7歲+吞拿魚啫喱貓糧70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PSK",
    "sku": "PSK",
    "category": "Senior 7+ 老年貓系列",
    "name": "老年7歲+吞拿魚鰹魚啫喱貓糧70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJCS",
    "sku": "PJCS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蟹肉啫喱濕貓糧70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJK",
    "sku": "PJK",
    "category": "Tasty 美味系列",
    "name": "吞拿魚鰹魚啫喱濕貓糧70g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGS",
    "sku": "PGS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蝦肉汁貓糧70g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGCS",
    "sku": "PGCS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蟹肉肉汁貓糧70g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGK",
    "sku": "PGK",
    "category": "Tasty 美味系列",
    "name": "吞拿魚鰹魚肉汁貓糧70g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJSA",
    "sku": "PJSA",
    "category": "Tasty 美味系列",
    "name": "吞拿魚三文魚啫喱貓糧75g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJ",
    "sku": "PJ",
    "category": "Tasty 美味系列",
    "name": "吞拿魚啫喱濕貓糧75g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJSH",
    "sku": "PJSH",
    "category": "Tasty 美味系列",
    "name": "吞拿魚白飯魚啫喱貓糧75g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJS",
    "sku": "PJS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蝦啫喱濕貓糧75g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PJC",
    "sku": "PJC",
    "category": "Tasty 美味系列",
    "name": "吞拿魚雞肉啫喱濕貓糧75g",
    "spec": "包裝",
    "texture": "啫喱",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGSA",
    "sku": "PGSA",
    "category": "Tasty 美味系列",
    "name": "吞拿魚三文魚肉汁貓糧75g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PG",
    "sku": "PG",
    "category": "Tasty 美味系列",
    "name": "吞拿魚肉汁貓糧75g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGSH",
    "sku": "PGSH",
    "category": "Tasty 美味系列",
    "name": "吞拿魚白飯魚肉汁貓糧75g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "PGC",
    "sku": "PGC",
    "category": "Tasty 美味系列",
    "name": "吞拿魚雞肉肉汁貓糧75g",
    "spec": "包裝",
    "texture": "肉汁",
    "unitPrice": 8.0,
    "boxPrice": 280.0,
    "remarks": "1 箱 48 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CCA",
    "sku": "CCA",
    "category": "Healthy 健康系列",
    "name": "吞拿魚椰菜肉汁罐 針對腎臟護理75g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CSPIN",
    "sku": "CSPIN",
    "category": "Healthy 健康系列",
    "name": "吞拿魚菠菜肉汁罐 針對免疫系統75g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CQC",
    "sku": "CQC",
    "category": "Healthy 健康系列",
    "name": "吞拿魚小紅莓藜麥肉汁罐 針對泌尿系統75g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAAT",
    "sku": "CAAT",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 淨吞拿魚口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAASA",
    "sku": "CAASA",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 吞拿魚三文魚口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAAB",
    "sku": "CAAB",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 吞拿魚牛肉口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAASH",
    "sku": "CAASH",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 吞拿魚白飯魚口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAAC",
    "sku": "CAAC",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 吞拿魚雞肉口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CAAD",
    "sku": "CAAD",
    "category": "Purrfect Balance 主食罐系列",
    "name": "無膠肉絲主食罐 吞拿魚鴨肉口味85g",
    "spec": "罐裝",
    "texture": "肉絲",
    "unitPrice": 11.0,
    "boxPrice": 220.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJ",
    "sku": "CJ",
    "category": "Tasty 美味系列",
    "name": "吞拿魚啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJSH",
    "sku": "CJSH",
    "category": "Tasty 美味系列",
    "name": "吞拿魚白飯魚啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJS",
    "sku": "CJS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蝦啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJCS",
    "sku": "CJCS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蟹肉啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJC",
    "sku": "CJC",
    "category": "Tasty 美味系列",
    "name": "吞拿魚雞肉啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJK",
    "sku": "CJK",
    "category": "Tasty 美味系列",
    "name": "吞拿魚鰹魚啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGSA",
    "sku": "CGSA",
    "category": "Tasty 美味系列",
    "name": "吞拿魚三文魚肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGSH",
    "sku": "CGSH",
    "category": "Tasty 美味系列",
    "name": "吞拿魚白飯魚肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGS",
    "sku": "CGS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蝦肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGCS",
    "sku": "CGCS",
    "category": "Tasty 美味系列",
    "name": "吞拿魚蟹肉肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGC",
    "sku": "CGC",
    "category": "Tasty 美味系列",
    "name": "吞拿魚雞肉肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CGK",
    "sku": "CGK",
    "category": "Tasty 美味系列",
    "name": "吞拿魚鰹魚肉汁罐85g",
    "spec": "罐裝",
    "texture": "肉汁",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "CJSA",
    "sku": "CJSA",
    "category": "Tasty 美味系列",
    "name": "吞拿魚三文魚啫喱罐85g",
    "spec": "罐裝",
    "texture": "啫喱",
    "unitPrice": 9.0,
    "boxPrice": 180.0,
    "remarks": "1 箱 24 件 (原箱價不可與九折優惠同時使用)",
    "updatedAt": ""
  },
  {
    "active": true,
    "id": "FK1",
    "sku": "FK1",
    "category": "主食罐福袋",
    "name": "主食罐福袋\n淨吞拿魚口味x1\n吞拿魚三文魚口味x1\n吞拿魚雞肉口味x2\n吞拿魚牛肉口味x2\n吞拿魚鴨肉口味x2\n吞拿魚白飯魚口味x2",
    "spec": "福袋",
    "texture": "福袋",
    "unitPrice": 100.0,
    "boxPrice": null,
    "remarks": "",
    "updatedAt": ""
  }
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || 'ping';
  try {
    if (action === 'catalog') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = setupCatalogSheet_(ss);
      return output_(params, { ok: true, products: readCatalog_(sheet), serverTime: new Date().toISOString() });
    }
    if (action === 'verifyAdmin') {
      verifyAdminPin_(params.pin || '');
      return output_(params, { ok: true, message: 'Admin PIN OK' });
    }
    return output_(params, { ok: true, message: 'CatsTaste order sync endpoint is running.' });
  } catch (err) {
    return output_(params, { ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(body);
    const action = payload.action || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'saveProduct') {
      verifyAdminPin_(payload.pin || '');
      const product = payload.product || {};
      const sheet = setupCatalogSheet_(ss);
      saveProduct_(sheet, product);
      return json_({ ok: true, action: 'saveProduct', sku: product.sku });
    }

    if (action === 'toggleProduct') {
      verifyAdminPin_(payload.pin || '');
      const sheet = setupCatalogSheet_(ss);
      toggleProduct_(sheet, payload.sku, payload.active);
      return json_({ ok: true, action: 'toggleProduct', sku: payload.sku, active: payload.active });
    }

    return saveOrder_(ss, payload);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function saveOrder_(ss, order) {
  const sheet = getOrCreateSheet_(ss);
  if (!order.orderId) throw new Error('Missing orderId');

  const existingRow = findOrderRow_(sheet, order.orderId);
  const row = HEADERS.map(h => {
    if (h === 'itemsJson') return JSON.stringify(order.items || []);
    if (h === 'serverReceivedAt') return new Date().toISOString();
    return order[h] === undefined || order[h] === null ? '' : order[h];
  });

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
    return json_({ ok: true, action: 'updated', orderId: order.orderId });
  } else {
    sheet.appendRow(row);
    return json_({ ok: true, action: 'inserted', orderId: order.orderId });
  }
}

function getOrCreateSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  const width = Math.max(HEADERS.length, sheet.getLastColumn() || HEADERS.length);
  const firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  const needsHeaders = firstRow.join('') === '' || HEADERS.some((h, i) => firstRow[i] !== h);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(orderId)) return i + 2;
  }
  return null;
}

function setupCatalogSheet_(ss) {
  let sheet = ss.getSheetByName(CATALOG_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CATALOG_SHEET_NAME);
  const width = Math.max(CATALOG_HEADERS.length, sheet.getLastColumn() || CATALOG_HEADERS.length);
  const firstRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  const needsHeaders = firstRow.join('') === '' || CATALOG_HEADERS.some((h, i) => firstRow[i] !== h);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, CATALOG_HEADERS.length).setValues([CATALOG_HEADERS]);
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() < 2 && INITIAL_CATALOG.length) {
    const now = new Date().toISOString();
    const rows = INITIAL_CATALOG.map(p => CATALOG_HEADERS.map(h => h === 'updatedAt' ? now : normalizeCatalogValue_(h, p[h])));
    sheet.getRange(2, 1, rows.length, CATALOG_HEADERS.length).setValues(rows);
  }
  return sheet;
}

function readCatalog_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, CATALOG_HEADERS.length).getValues();
  return values.map(row => {
    const obj = {};
    CATALOG_HEADERS.forEach((h, i) => obj[h] = row[i]);
    obj.active = String(obj.active).toLowerCase() !== 'false' && String(obj.active) !== '0';
    obj.unitPrice = Number(obj.unitPrice || 0);
    obj.boxPrice = obj.boxPrice === '' ? '' : Number(obj.boxPrice || 0);
    return obj;
  }).filter(p => p.sku || p.id || p.name);
}

function findCatalogRow_(sheet, sku) {
  const target = String(sku || '').trim().toUpperCase();
  if (!target) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // sku column
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === target) return i + 2;
  }
  return null;
}

function saveProduct_(sheet, product) {
  const p = normalizeProduct_(product);
  const row = CATALOG_HEADERS.map(h => h === 'updatedAt' ? new Date().toISOString() : normalizeCatalogValue_(h, p[h]));
  const existing = findCatalogRow_(sheet, p.sku);
  if (existing) sheet.getRange(existing, 1, 1, CATALOG_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
}

function toggleProduct_(sheet, sku, active) {
  const row = findCatalogRow_(sheet, sku);
  if (!row) throw new Error('SKU not found: ' + sku);
  sheet.getRange(row, 1).setValue(active === true || String(active).toLowerCase() === 'true');
  sheet.getRange(row, CATALOG_HEADERS.indexOf('updatedAt') + 1).setValue(new Date().toISOString());
}

function normalizeProduct_(p) {
  const sku = String(p.sku || p.id || '').trim().toUpperCase();
  if (!sku) throw new Error('Missing sku');
  const name = String(p.name || '').trim();
  if (!name) throw new Error('Missing name');
  return {
    active: p.active === undefined ? true : (p.active === true || String(p.active).toLowerCase() === 'true'),
    id: String(p.id || sku).trim().toUpperCase(),
    sku,
    category: String(p.category || '').trim(),
    name,
    spec: String(p.spec || '').trim(),
    texture: String(p.texture || '').trim(),
    unitPrice: Number(p.unitPrice || 0),
    boxPrice: p.boxPrice === '' || p.boxPrice === null || p.boxPrice === undefined ? '' : Number(p.boxPrice || 0),
    remarks: String(p.remarks || '').trim()
  };
}

function normalizeCatalogValue_(h, v) {
  if (h === 'active') return v === true || String(v).toLowerCase() === 'true';
  if (h === 'unitPrice' || h === 'boxPrice') return v === '' || v === null || v === undefined ? '' : Number(v || 0);
  return v === undefined || v === null ? '' : v;
}

function verifyAdminPin_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_PIN_PROPERTY);
  if (!expected) throw new Error('ADMIN_PIN is not configured in Script Properties');
  if (String(pin || '') !== String(expected)) throw new Error('Invalid PIN');
  return true;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function output_(params, obj) {
  const callback = params && params.callback;
  const text = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(String(callback).replace(/[^A-Za-z0-9_.$]/g, '') + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
