export const SITE = {
  brand: "Morena Collection",
  brandShort: "Morena",
  tagline: "Perfume, first. Everything else, considered.",
  address: "Iwo, Osun State, Nigeria",
  addressLines: ["Morena Collection", "Iwo", "Osun State, Nigeria"],
  whatsapp: "2349121303157",
  whatsappDisplay: "+234 912 130 3157",
  phone: "2349162110077",
  phoneDisplay: "+234 916 211 0077",
  email: "hello@morenacollection.com",
  developer: "Damco Space Inc",
  hours: "Mon – Sat · 9:00 – 19:00 (WAT)",
  bankDetails: {
    bank: "Morena Collection",
    accountName: "Morena Collection",
    accountNumber: "0123456789",
  },
} as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function telLink() {
  return `tel:+${SITE.phone}`;
}

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/category/perfumes", label: "Perfume" },
  { href: "/shop/category/bags", label: "Bags" },
  { href: "/shop/category/shoes", label: "Shoes" },
  { href: "/shop/category/clothes", label: "Clothes" },
  { href: "/about", label: "About" },
] as const;
