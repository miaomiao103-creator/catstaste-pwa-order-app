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
  'orderId','deviceId','deviceModel','deviceCopyNo','staffName','createdAt','customerName','phone','email','address','notes',
  'paymentMethod','paymentStatus','shippingMethod','retailSubtotal','subtotal','boxDiscountAmount','discountAmount',
  'discountedSubtotal','totalDiscountAmount','total','giftEligible',
  'syncStatus','syncedAt','lastSyncError','itemsJson','whatsappText','serverReceivedAt','staffNotes'
];

const CATALOG_HEADERS = ["active", "id", "sku", "category", "name", "spec", "texture", "unitPrice", "boxPrice", "remarks", "updatedAt"];

const ORDERS_VIEW_SHEET_NAME = 'Orders_View';
const PACKING_LIST_SHEET_NAME = 'Packing_List';
const FOLLOW_UP_SHEET_NAME = 'Follow_Up';
const DAILY_SUMMARY_SHEET_NAME = 'Daily_Summary';

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
    if (action === 'sheetSummary') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      rebuildHelperSheets_(ss);
      return output_(params, buildSheetSummary_(ss));
    }
    if (action === 'rebuildReports') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      rebuildHelperSheets_(ss);
      return output_(params, { ok: true, message: 'Reports rebuilt' });
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

    if (action === 'markVerifiedOrder') {
      return markVerifiedOrder_(ss, payload);
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

  let action;
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
    action = 'updated';
  } else {
    sheet.appendRow(row);
    action = 'inserted';
  }
  rebuildHelperSheets_(ss);
  return json_({ ok: true, action, orderId: order.orderId });
}

function markVerifiedOrder_(ss, order) {
  const sheet = getOrCreateSheet_(ss);
  const orderId = String(order && order.orderId || '').trim();
  if (!orderId) throw new Error('Missing orderId');
  const existingRow = findOrderRow_(sheet, orderId);
  if (!existingRow) throw new Error('Order not found: ' + orderId);

  const current = readOrders_(ss).find(o => String(o.orderId) === orderId);
  if (!current) throw new Error('Order not found: ' + orderId);

  const merged = Object.assign({}, current, order, {
    orderId,
    syncStatus: 'verified',
    syncedAt: new Date().toISOString(),
    lastSyncError: ''
  });

  const row = HEADERS.map(h => {
    if (h === 'itemsJson') return JSON.stringify(merged.items || []);
    if (h === 'serverReceivedAt') return new Date().toISOString();
    return merged[h] === undefined || merged[h] === null ? '' : merged[h];
  });

  sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
  rebuildHelperSheets_(ss);
  return json_({ ok: true, action: 'markVerifiedOrder', orderId });
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


function readOrders_(ss) {
  const sheet = getOrCreateSheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(row => {
    const o = {};
    HEADERS.forEach((h, i) => o[h] = row[i]);
    try { o.items = JSON.parse(o.itemsJson || '[]'); } catch (err) { o.items = []; }
    ['retailSubtotal','subtotal','boxDiscountAmount','discountAmount','discountedSubtotal','totalDiscountAmount','total'].forEach(k => o[k] = Number(o[k] || 0));
    return o;
  }).filter(o => o.orderId);
}

function todayHK_() {
  return Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
}

function writeSheet_(ss, name, headers, rows) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  try { sheet.autoResizeColumns(1, headers.length); } catch (err) {}
  return sheet;
}

function orderItemsText_(order) {
  return (order.items || []).map(i => [i.sku, i.priceMode === 'box' ? '原箱' : '單件', 'x' + i.qty].join(' ')).join(', ');
}

function itemCount_(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function rebuildHelperSheets_(ss) {
  const orders = readOrders_(ss);
  writeOrdersView_(ss, orders);
  writePackingList_(ss, orders);
  writeFollowUp_(ss, orders);
  writeDailySummary_(ss, orders);
}

function writeOrdersView_(ss, orders) {
  const headers = ['狀態','Order No','時間','同事','Device','客人','WhatsApp','地址','應收','Items','備註'];
  const rows = orders.slice().sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(o => [
    o.syncStatus || '', o.orderId || '', o.createdAt || '', o.staffName || '', o.deviceId || '',
    o.customerName || '', o.phone || '', o.address || '', o.total || 0, orderItemsText_(o), o.notes || o.staffNotes || ''
  ]);
  writeSheet_(ss, ORDERS_VIEW_SHEET_NAME, headers, rows);
}

function writePackingList_(ss, orders) {
  const map = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    const key = String(item.sku || '').toUpperCase() + '|' + String(item.priceMode || 'unit');
    if (!map[key]) map[key] = { sku: item.sku || '', product: item.name || '', mode: item.priceMode || 'unit', qty: 0, total: 0 };
    map[key].qty += Number(item.qty || 0);
    map[key].total += Number(item.lineSubtotal || 0);
  }));
  const rows = Object.values(map).sort((a,b) => String(a.sku).localeCompare(String(b.sku))).map(x => [x.sku, x.product, x.mode === 'box' ? '原箱' : '單件', x.qty, x.total]);
  writeSheet_(ss, PACKING_LIST_SHEET_NAME, ['SKU','Product','模式','Total Qty','Amount'], rows);
}

function writeFollowUp_(ss, orders) {
  const rows = [];
  orders.forEach(o => {
    const reasons = [];
    if (!o.phone) reasons.push('Missing WhatsApp');
    if (!o.address) reasons.push('Missing address');
    if (String(o.syncStatus || '') !== 'verified') reasons.push('未核實');
    if (o.notes || o.staffNotes) reasons.push('有備註');
    if (reasons.length) rows.push([reasons.join(', '), o.orderId || '', o.customerName || '', o.phone || '', o.address || '', o.total || 0, orderItemsText_(o), o.notes || '', o.staffNotes || '']);
  });
  writeSheet_(ss, FOLLOW_UP_SHEET_NAME, ['原因','Order No','客人','WhatsApp','地址','應收','Items','客人備註','同事備註'], rows);
}

function writeDailySummary_(ss, orders) {
  const today = todayHK_();
  const todayOrders = orders.filter(o => String(o.createdAt || '').slice(0, 10) === today);
  const total = todayOrders.reduce((s,o) => s + Number(o.total || 0), 0);
  const sentUnverified = todayOrders.filter(o => String(o.syncStatus || '') === 'sent_unverified').length;
  const verified = todayOrders.filter(o => String(o.syncStatus || '') === 'verified' || String(o.syncStatus || '') === 'synced').length;
  const top = topItems_(todayOrders).slice(0, 10);
  const rows = [
    ['Date', today],
    ['Today Orders', todayOrders.length],
    ['Today Total', total],
    ['Sent but not verified', sentUnverified],
    ['Verified', verified],
    ['', ''],
    ['Top Items', 'Qty']
  ].concat(top.map(x => [x.sku + ' ' + x.name, x.qty]));
  writeSheet_(ss, DAILY_SUMMARY_SHEET_NAME, ['Metric','Value'], rows);
}

function topItems_(orders) {
  const map = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    const sku = String(item.sku || '').toUpperCase();
    if (!sku) return;
    if (!map[sku]) map[sku] = { sku, name: item.name || '', qty: 0 };
    map[sku].qty += Number(item.qty || 0);
  }));
  return Object.values(map).sort((a,b) => b.qty - a.qty);
}

function compactOrderForApp_(o) {
  return {
    orderId: o.orderId || '',
    createdAt: o.createdAt || '',
    staffName: o.staffName || '',
    deviceId: o.deviceId || '',
    customerName: o.customerName || '',
    phone: o.phone || '',
    address: o.address || '',
    notes: o.notes || '',
    staffNotes: o.staffNotes || '',
    total: o.total || 0,
    totalDiscountAmount: o.totalDiscountAmount || 0,
    syncStatus: o.syncStatus || '',
    itemCount: itemCount_(o),
    itemsText: orderItemsText_(o),
    whatsappText: o.whatsappText || '',
    items: (o.items || []).map(i => ({
      sku: i.sku || '',
      name: i.name || '',
      qty: Number(i.qty || 0),
      priceMode: i.priceMode || 'unit',
      lineSubtotal: Number(i.lineSubtotal || 0)
    }))
  };
}

function packingListForApp_(orders) {
  const map = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    const key = String(item.sku || '').toUpperCase() + '|' + String(item.priceMode || 'unit');
    if (!map[key]) map[key] = { sku: item.sku || '', product: item.name || '', mode: item.priceMode === 'box' ? '原箱' : '單件', qty: 0, amount: 0 };
    map[key].qty += Number(item.qty || 0);
    map[key].amount += Number(item.lineSubtotal || 0);
  }));
  return Object.values(map).sort((a,b) => String(a.sku).localeCompare(String(b.sku)));
}

function needsFollowUp_(o) {
  return !o.phone || !o.address || String(o.syncStatus || '') !== 'verified' || o.notes || o.staffNotes;
}

function buildSheetSummary_(ss) {
  const orders = readOrders_(ss);
  const today = todayHK_();
  const todayOrders = orders.filter(o => String(o.createdAt || '').slice(0, 10) === today);
  const sortedToday = todayOrders.slice().sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const followUpOrders = sortedToday.filter(needsFollowUp_).slice(0, 40).map(compactOrderForApp_);
  const allFollowUpCount = orders.filter(needsFollowUp_).length;
  return {
    ok: true,
    viewMode: 'app_cards',
    today,
    allOrders: orders.length,
    todayOrders: todayOrders.length,
    todayTotal: todayOrders.reduce((s,o) => s + Number(o.total || 0), 0),
    sentUnverified: todayOrders.filter(o => String(o.syncStatus || '') === 'sent_unverified').length,
    verified: todayOrders.filter(o => String(o.syncStatus || '') === 'verified' || String(o.syncStatus || '') === 'synced').length,
    followUpCount: allFollowUpCount,
    topItems: topItems_(todayOrders).slice(0, 8),
    todayOrderCards: sortedToday.slice(0, 80).map(compactOrderForApp_),
    recentOrders: sortedToday.slice(0, 12).map(compactOrderForApp_),
    packingList: packingListForApp_(todayOrders).slice(0, 120),
    followUpOrders,
    serverTime: new Date().toISOString()
  };
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
