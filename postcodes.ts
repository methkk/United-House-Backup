// Postcodes.io API integration for UK postcode and constituency lookup
export interface PostcodeData {
  postcode: string;
  quality: number;
  eastings: number;
  northings: number;
  country: string;
  nhs_ha: string;
  longitude: number;
  latitude: number;
  european_electoral_region: string;
  primary_care_trust: string;
  region: string;
  lsoa: string;
  msoa: string;
  incode: string;
  outcode: string;
  parliamentary_constituency: string;
  parliamentary_constituency_2024: string;
  admin_district: string;
  parish: string;
  admin_county: string;
  date_of_introduction: string;
  admin_ward: string;
  ced: string;
  ccg: string;
  nuts: string;
  pfa: string;
  codes: {
    admin_district: string;
    admin_county: string;
    admin_ward: string;
    parish: string;
    parliamentary_constituency: string;
    parliamentary_constituency_2024: string;
    ccg: string;
    ccg_id: string;
    ced: string;
    nuts: string;
    lsoa: string;
    msoa: string;
    lau2: string;
    pfa: string;
  };
}

export interface PostcodeResponse {
  status: number;
  result: PostcodeData;
}

export interface ReverseGeocodeResponse {
  status: number;
  result: PostcodeData[];
}

/**
 * Look up postcode information using Postcodes.io API
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeData | null> {
  try {
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
    
    if (!response.ok) {
      console.error('Postcode lookup failed:', response.status);
      return null;
    }
    
    const data: PostcodeResponse = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error looking up postcode:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to find nearest postcode and constituency
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<PostcodeData | null> {
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}&limit=1`
    );
    
    if (!response.ok) {
      console.error('Reverse geocoding failed:', response.status);
      return null;
    }
    
    const data: ReverseGeocodeResponse = await response.json();
    return data.result?.[0] || null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Extract constituency information from postcode data
 */
export function extractConstituencyInfo(postcodeData: PostcodeData) {
  return {
    constituency: postcodeData.parliamentary_constituency_2024 || postcodeData.parliamentary_constituency,
    postcode: postcodeData.postcode,
    country: postcodeData.country,
    region: postcodeData.region,
    admin_district: postcodeData.admin_district,
    admin_county: postcodeData.admin_county,
    latitude: postcodeData.latitude,
    longitude: postcodeData.longitude
  };
}

/**
 * Validate UK postcode format
 */
export function isValidUKPostcode(postcode: string): boolean {
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  return ukPostcodeRegex.test(postcode.trim());
}