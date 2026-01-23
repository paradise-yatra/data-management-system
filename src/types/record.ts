export interface LeadRecord {
  _id?: string; // MongoDB _id
  id?: string; // For backward compatibility
  uniqueId?: string; // System-assigned unique ID (format: PYIMS-1, PYIMS-2, etc.)
  name: string;
  email: string;
  phone: string;
  interests: string[];
  source: string;
  remarks: string;
  dateAdded: string;
}

export type FilterState = {
  search: string;
  emailFilter: 'all' | 'has' | 'none';
  phoneFilter: 'all' | 'has' | 'none';
  sourceFilter: string;
  interestsFilter: string;
};

export const PACKAGES = [
  'Bali Trip',
  'Kerala Backwaters',
  'Rajasthan Heritage Tour',
  'Europe Multi-Country',
  'Maldives Honeymoon',
  'Thailand Explorer',
  'Dubai City Break',
  'Sri Lanka Discovery',
  'Andaman Beach Getaway',
  'Himachal Adventure',
] as const;

export const SOURCES = [
  'Manual',
  'Website',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Referral',
] as const;
