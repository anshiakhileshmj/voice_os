import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_code: string;
  continent: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  in_eu: boolean;
  calling_code: string;
  capital: string;
  country_tld: string;
  currency: string;
  currency_name: string;
  languages: string;
  country_area: number;
  country_population: number;
  asn: string;
  org: string;
  hostname: string;
}

export class LocationService {
  async getUserLocation(): Promise<LocationData> {
    try {
      // Use ipapi.co directly for location data
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('Failed to get location data');
      }

      const data = await response.json();
      
      // Map ipapi.co response to our LocationData interface
      const locationData: LocationData = {
        ip: data.ip || '',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        region_code: data.region_code || '',
        country: data.country_name || 'Unknown',
        country_code: data.country_code || '',
        continent: data.continent_code || '',
        postal: data.postal || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || 'UTC',
        utc_offset: data.utc_offset || '+0000',
        in_eu: data.in_eu || false,
        calling_code: data.country_calling_code || '',
        capital: data.country_capital || '',
        country_tld: data.country_tld || '',
        currency: data.currency || '',
        currency_name: data.currency_name || '',
        languages: data.languages || '',
        country_area: data.country_area || 0,
        country_population: data.country_population || 0,
        asn: data.asn || '',
        org: data.org || '',
        hostname: data.hostname || ''
      };

      return locationData;
    } catch (error) {
      console.error('Location service error:', error);
      // Return fallback data instead of throwing
      return {
        ip: '',
        city: 'Unknown',
        region: 'Unknown',
        region_code: '',
        country: 'Unknown',
        country_code: '',
        continent: '',
        postal: '',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        utc_offset: '+0000',
        in_eu: false,
        calling_code: '',
        capital: '',
        country_tld: '',
        currency: '',
        currency_name: '',
        languages: '',
        country_area: 0,
        country_population: 0,
        asn: '',
        org: '',
        hostname: ''
      };
    }
  }

  getGreeting(timezone: string, userName: string): string {
    try {
      const now = new Date().toLocaleString("en-US", { timeZone: timezone });
      const hour = new Date(now).getHours();
      
      if (hour >= 5 && hour < 12) return `Good morning, ${userName}`;
      if (hour >= 12 && hour < 17) return `Good afternoon, ${userName}`;
      if (hour >= 17 && hour < 21) return `Good evening, ${userName}`;
      return `Hello, ${userName}`;
    } catch (error) {
      return `Hello, ${userName}`;
    }
  }

  async shouldGreetUser(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_greeted_at')
        .eq('id', userId)
        .single();

      if (!profile) return true;

      const today = new Date().toISOString().split('T')[0];
      const lastGreet = profile.last_greeted_at ? 
        new Date(profile.last_greeted_at).toISOString().split('T')[0] : null;
      
      return today !== lastGreet;
    } catch (error) {
      return true; // Greet on error to be safe
    }
  }

  async updateLastGreeted(userId: string): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({ last_greeted_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update last greeted:', error);
    }
  }
}

export const locationService = new LocationService();