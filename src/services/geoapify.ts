/**
 * Geoapify Address Autocomplete API service
 * Free tier: 3000 requests/day
 * Documentation: https://www.geoapify.com/address-autocomplete
 */

export interface GeoapifySuggestion {
  formatted: string;
  properties: {
    name: string;
    country: string;
    country_code: string;
    state?: string;
    city?: string;
    postcode?: string;
  };
}

export interface GeoapifyResponse {
  results: Array<{
    formatted: string;
    city?: string;
    state?: string;
    country: string;
    country_code?: string;
    postcode?: string;
  }>;
}

/**
 * Fetch address autocomplete suggestions from Geoapify
 * @param query - Search query
 * @param apiKey - Geoapify API key (from environment variable)
 * @returns Promise with array of suggestions
 */
export async function fetchRegionSuggestions(
  query: string,
  apiKey: string
): Promise<GeoapifySuggestion[]> {
  if (!query.trim() || !apiKey || apiKey === "your_api_key_here") {
    console.log("Geoapify: Skipping API call - missing or placeholder API key");
    return [];
  }

  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("limit", "20"); // Get more results since we filter aggressively for countries/states/cities only
    // Don't set type parameter - get all types, then filter client-side for countries, states, cities

    console.log("Geoapify: Fetching suggestions for:", query);
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Geoapify API error:", response.status, errorText);
      throw new Error(`Geoapify API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Geoapify: Raw API response:", data);
    
    // Handle different possible response formats
    let results: any[] = [];
    
    if (data.results && Array.isArray(data.results)) {
      results = data.results;
    } else if (data.features && Array.isArray(data.features)) {
      // Alternative format with features
      results = data.features.map((f: any) => ({
        formatted: f.properties?.formatted || f.formatted,
        city: f.properties?.city,
        state: f.properties?.state,
        country: f.properties?.country || f.properties?.country_name,
        country_code: f.properties?.country_code,
        postcode: f.properties?.postcode,
      }));
    } else if (Array.isArray(data)) {
      results = data;
    } else {
      console.warn("Geoapify: Unexpected response structure", data);
      return [];
    }
    
    // Process and filter results to ONLY include countries, states, and cities
    // Exclude: addresses, streets, postcodes, landmarks, amenities, buildings, etc.
    const allSuggestions = results
      .map((result) => {
        // Extract fields from result (handle both direct properties and nested properties)
        const city = result.city || result.properties?.city || "";
        const state = result.state || result.properties?.state || "";
        const country = result.country || result.properties?.country || result.properties?.country_name || "";
        const name = result.name || result.properties?.name || "";
        const street = result.street || result.properties?.street || "";
        const housenumber = result.housenumber || result.properties?.housenumber || "";
        
        // Get explicit result_type from API (most reliable)
        const explicitType = result.result_type || result.type || result.properties?.result_type || "";
        
        // Determine the type of location
        let resultType = "other";
        
        // If API provides explicit type, use it (most reliable)
        if (explicitType && ["country", "state", "city"].includes(explicitType)) {
          resultType = explicitType;
        } else {
          // Infer from data structure (fallback)
          // Country: has country name but no state, no city, no street, no housenumber
          if (country && !state && !city && !street && !housenumber) {
            resultType = "country";
          }
          // State: has state but no city, no street, no housenumber
          else if (state && !city && !street && !housenumber) {
            resultType = "state";
          }
          // City: has city but no street, no housenumber
          else if (city && !street && !housenumber) {
            resultType = "city";
          }
        }
        
        // EXCLUDE if it has address components (street, housenumber) - these are addresses, not regions
        if (street || housenumber) {
          return null; // Filter out addresses
        }
        
        // EXCLUDE if explicit type is address-related
        const excludedTypes = ["street", "postcode", "amenity", "building", "locality", "address"];
        if (explicitType && excludedTypes.includes(explicitType)) {
          return null; // Filter out excluded types
        }
        
        // Only proceed if it's a country, state, or city
        if (resultType !== "country" && resultType !== "state" && resultType !== "city") {
          return null;
        }
        
        // Build formatted string (only city, state, country - no addresses)
        const formatted = result.formatted 
          ? result.formatted.split(",").slice(0, 3).join(", ").trim() // Limit to city, state, country parts
          : [city, state, country]
              .filter(Boolean)
              .join(", ") || 
            name || 
            "";
        
        return {
          formatted: formatted.trim() || country || state || city || name,
          type: resultType,
          properties: {
            name: city || state || country || name || "",
            country: country || "",
            country_code: result.country_code || result.properties?.country_code || "",
            state: state || undefined,
            city: city || undefined,
            postcode: undefined, // Don't include postcode in properties
          },
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null); // Remove nulls

    // Prioritize: countries first, then states, then cities
    const typePriority: Record<string, number> = {
      country: 1,
      state: 2,
      city: 3,
    };

    const filteredSuggestions = allSuggestions
      .filter((s) => s.type === "country" || s.type === "state" || s.type === "city")
      .sort((a, b) => {
        const priorityA = typePriority[a.type] || 999;
        const priorityB = typePriority[b.type] || 999;
        return priorityA - priorityB;
      })
      .slice(0, 8); // Limit to 8 results

    console.log("Geoapify: Processed suggestions:", filteredSuggestions);
    return filteredSuggestions.map(({ type, ...rest }) => rest); // Remove type from final output
  } catch (error) {
    console.error("Error fetching region suggestions:", error);
    return [];
  }
}
