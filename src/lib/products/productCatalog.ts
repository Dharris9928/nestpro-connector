export interface ProductCatalogItem {
  name: string;
  pricingTiers: {
    volumeRange: string;
    minQty: number;
    maxQty: number | null;
    usPrice: number;
    caPrice: number;
  }[];
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    name: "Nest Learning Thermostat (4th Gen)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 5.0, caPrice: 7.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 10.0, caPrice: 12.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 15.0, caPrice: 17.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 20.0, caPrice: 22.0 },
    ],
  },
  {
    name: "Nest Thermostat",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 1.0, caPrice: 3.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 2.0, caPrice: 4.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 3.0, caPrice: 5.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 4.0, caPrice: 6.0 },
    ],
  },
  {
    name: "Google Nest Cam Outdoor (wired, 2nd gen)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 2.0, caPrice: 3.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 3.0, caPrice: 4.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 5.0, caPrice: 7.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 8.0, caPrice: 10.0 },
    ],
  },
  {
    name: "Google Nest Doorbell (wired, 3rd gen)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 4.0, caPrice: 5.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 8.0, caPrice: 10.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 13.0, caPrice: 17.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 16.0, caPrice: 21.0 },
    ],
  },
  {
    name: "Google Nest Cam Indoor (wired, 3rd gen)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 2.0, caPrice: 3.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 3.0, caPrice: 4.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 4.0, caPrice: 5.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 7.0, caPrice: 10.0 },
    ],
  },
  {
    name: "Google Nest Doorbell (Battery)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 3.0, caPrice: 4.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 7.0, caPrice: 9.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 12.0, caPrice: 16.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 15.0, caPrice: 20.0 },
    ],
  },
  {
    name: "Google Nest Camera (Battery)",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 2.0, caPrice: 2.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 3.0, caPrice: 4.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 5.0, caPrice: 6.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 8.0, caPrice: 10.0 },
    ],
  },
  {
    name: "Google Nest Cam w/ Floodlight",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 5.0, caPrice: 7.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 8.0, caPrice: 10.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 12.0, caPrice: 14.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 16.0, caPrice: 18.0 },
    ],
  },
  {
    name: "Nest Wifi Pro",
    pricingTiers: [
      { volumeRange: "50-150", minQty: 50, maxQty: 150, usPrice: 5.0, caPrice: 7.0 },
      { volumeRange: "150-300", minQty: 150, maxQty: 300, usPrice: 8.0, caPrice: 10.0 },
      { volumeRange: "300-600", minQty: 300, maxQty: 600, usPrice: 12.0, caPrice: 14.0 },
      { volumeRange: "600+", minQty: 600, maxQty: null, usPrice: 16.0, caPrice: 18.0 },
    ],
  },
];

export const PRODUCT_NAMES = PRODUCT_CATALOG.map((p) => p.name);

export function getUnitPrice(productName: string, quantity: number): number {
  const product = PRODUCT_CATALOG.find((p) => p.name === productName);
  if (!product) return 0;

  // Find the matching tier based on quantity
  for (const tier of product.pricingTiers) {
    if (tier.maxQty === null) {
      if (quantity >= tier.minQty) return tier.usPrice;
    } else {
      if (quantity >= tier.minQty && quantity < tier.maxQty) return tier.usPrice;
    }
  }

  // Default to first tier if quantity is below minimum
  return product.pricingTiers[0]?.usPrice ?? 0;
}

export function getVolumeTier(quantity: number): string {
  if (quantity >= 600) return "600+";
  if (quantity >= 300) return "300-600";
  if (quantity >= 150) return "150-300";
  return "50-150";
}
