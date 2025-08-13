
export async function fetchWeather(): Promise<string | null> {
  try {
    // Simple weather implementation - you can enhance this later with real weather API
    const weatherConditions = ['sunny', 'cloudy', 'partly cloudy', 'clear'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    return `The weather is ${randomWeather} today.`;
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}
