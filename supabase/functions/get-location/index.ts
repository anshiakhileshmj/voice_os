import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP from headers (forwarded by Supabase Edge Functions)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '8.8.8.8'
    
    console.log('Getting location for IP:', clientIP)
    
    // Use ipapi.co to get location data
    const response = await fetch(`https://ipapi.co/${clientIP}/json/`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch location data')
    }
    
    const data = await response.json()
    
    // Return relevant location data
    const locationData = {
      ip: data.ip,
      city: data.city,
      region: data.region,
      region_code: data.region_code,
      country: data.country_name,
      country_code: data.country_code,
      continent: data.continent_code,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      utc_offset: data.utc_offset,
      in_eu: data.in_eu,
      calling_code: data.calling_code,
      capital: data.capital,
      country_tld: data.country_tld,
      currency: data.currency,
      currency_name: data.currency_name,
      languages: data.languages,
      country_area: data.country_area,
      country_population: data.country_population,
      asn: data.asn,
      org: data.org,
      hostname: data.hostname
    }

    return new Response(
      JSON.stringify(locationData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Location service error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})