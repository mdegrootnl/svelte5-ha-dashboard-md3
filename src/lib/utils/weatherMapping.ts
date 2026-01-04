export const WEATHER_VIDEO_MAP: Record<string, string> = {
    // Clear
    'clear_day': 'sunny green mountain lake nature',
    'clear_night': 'starry sky mountain silhouette night',

    // Cloudy
    'cloudy_day': 'cloudy sky beach ocean waves nature',
    'cloudy_night': 'night sky clouds over ocean',
    'partly_cloudy_day': 'blue sky white clouds green field nature',
    'partly_cloudy_night': 'night sky clouds moon forest',
    'mostly_cloudy_day': 'overcast sky mountain landscape',
    'mostly_cloudy_night': 'night sky cloudy dark nature',

    // Rain
    'rain_day': 'rain on river forest nature',
    'rain_night': 'rain pouring on lake night',
    'heavy_rain_day': 'stormy ocean waves rain',
    'heavy_rain_night': 'heavy rain night forest',
    'light_rain_day': 'gentle rain on green leaves nature',
    'light_rain_night': 'rain night window reflection nature', // aiming for abstract or nature reflection
    'scattered_showers_day': 'sun rain rainbow landscape',
    'scattered_showers_night': 'night rain nature',

    // Snow
    'snow_day': 'snow covered pine forest day',
    'snow_night': 'snowy mountain night',
    'heavy_snow_day': 'blizzard snow forest nature',
    'heavy_snow_night': 'blizzard snow night nature',
    'sleet_day': 'wet snow sleet on ground nature',
    'sleet_night': 'winter storm night nature',

    // Extreme / Other
    'thunderstorm_day': 'lightning storm ocean horizon',
    'thunderstorm_night': 'lightning storm night mountains',
    'tornado_day': 'storm dark clouds nature landscape',
    'tornado_night': 'storm night nature lightning',
    'fog_day': 'foggy calm river morning',
    'fog_night': 'foggy forest night spooky',
    'haze_day': 'heat haze desert landscape nature',
    'haze_night': 'foggy valley night',
    'windy_day': 'trees blowing in wind forest strong',
    'windy_night': 'palm trees wind night'
};

export type WeatherState = keyof typeof WEATHER_VIDEO_MAP;
