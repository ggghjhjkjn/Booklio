# Booklio

Booklio is a premium-style mobile app (Expo + React Native) that turns source text into structured AI-style explanations, then reads them aloud with synchronized progressive highlighting.

## Features

- Text input with premium card-based UI
- Language options: English, Hindi, Hinglish
- Duration options: 10/20/25/30 minutes + custom (up to 60)
- Strict word targeting at 140 words per minute
- Generate flow with smooth transition
- Audio playback via `expo-speech` with soft male/female voice preference
- Progressive word highlighting that never moves backwards
- Auto-scroll as playback advances
- Playback controls (Play/Pause) and progress bar
- Dark/Light mode toggle with persisted preference

## Run

```bash
npm install
npm run start
```

> If TTS voices are unavailable on the device, highlighting simulation still advances at 140 WPM.
