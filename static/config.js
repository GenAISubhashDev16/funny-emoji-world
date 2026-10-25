/* ===== YOUR SETTINGS: edit this file to customise the site (no other file needed) ===== */
window.SITE_CONFIG = {
  userName: "",            // e.g. "Subhash" -> "Good Morning, Subhash"
  locale: "en-IN",         // date language: "en-IN", "en-US", "hi-IN" (Hindi day/month names)
  hour12: true,            // true = 10:30 PM, false = 22:30
  weekStart: 0,            // calendar week starts on: 0 = Sunday, 1 = Monday
  showCalendar: true,      // mini month calendar

  weather: {
    unit: "C",                  // "C" or "F"
    refreshMinutes: 30,         // auto refresh time
    askPreciseLocation: true,   // ask browser for exact GPS location (falls back to network location)
    showForecast: true,         // next 3 days
    fallback: { city: "New Delhi", country: "India", lat: 28.61, lon: 77.21 } // used if everything else fails
  },

  /* ----- add your own content below. Sound names you can use:
     laugh giggle belly evil birds chime morning sparkle pop boing tada horn trombone snore
     applause heart coin whistle cheer sparrow dove parrot owl rooster duck chick eagle dawn ----- */

  extraWishes: [
    // "🌞 Good morning! Make today count!"
  ],
  extraJokes: [
    // "Why did the phone wear glasses? It lost its contacts! 📱"
  ],
  extraSurprises: [
    // ["🍰 Today is a good day for cake!", "tada"]
  ],
  extraMoods: [
    // [emoji, label, sound, animation, [line1, line2]]
    // animation: shake grow flip bounce wiggle spin jelly sway
    // ["😋", "Yummy", "coin", "bounce", ["So tasty! 😋", "Food time!"]]
  ],

  /* ----- your own songs: put mp3 files in static/music/ then list them here ----- */
  songs: [
    // { name: "❤️ My Love Song", src: "static/music/my-song.mp3" }
  ]
};
