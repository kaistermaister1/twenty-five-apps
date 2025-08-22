# Rise & Rest (app15)

Beautiful fullscreen PWA with two buttons: Good morning and Good night.

- Fetches today's weather (OpenWeather).
- Uses OpenAI `gpt-5-nano` to create:
  - TTS script (morning: upbeat weatherman < 20s; night: soothing praise)
  - Creative short prompt for Eleven Music based on the script.
- ElevenLabs TTS speaks the script; while speaking, Eleven Music track is generated, then played right after.

## Run locally

1. Install deps

```bash
cd apps/app15
npm i
npm run dev
```

2. Environment vars (e.g. `.env.local`)

```
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_KEY
# Either city or coordinates
WEATHER_CITY=London
# or
WEATHER_LAT=51.5074
WEATHER_LON=-0.1278

OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_MODEL=gpt-5-nano

ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
# A voice ID like "21m00Tcm4TlvDq8ikWAM" or a public voice name ("Rachel")
ELEVENLABS_VOICE_ID=YOUR_VOICE_ID
```

3. Icons

Place `public/icons/icon192.png` and `public/icons/icon512.png` (already stubbed).

## Deploy to Vercel

- Push and import the project.
- Add the same env vars in Vercel settings.
- Ensure PWA works on iOS by adding to home screen (standalone mode).

## References

- Eleven Music quickstart: `https://elevenlabs.io/docs/cookbooks/music/quickstart`
