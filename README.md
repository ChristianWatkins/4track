# 4-Spors Kassettoptaker

En autentisk 4-spors kassettoptaker simulator bygget med Next.js 15 og Web Audio API.

## Funksjoner

- **4 uavhengige sporer** - Ta opp på hvilket som helst spor mens du hører på andre
- **Volumfadere** - Juster volumet på hvert spor individuelt
- **Transportkontroller** - Play, Stop, Record, Rewind, Fast Forward
- **Counter** - Viser posisjon og støtter reset/jump funksjonalitet
- **Kassettvisualisering** - Visuell representasjon av kassett som spilles av
- **Eksport** - Eksporter den ferdige miksen til WAV-fil
- **Lokal lagring** - Alle opptak lagres lokalt i nettleseren

## Installasjon

```bash
npm install
```

## Utvikling

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Bruk

1. **Velg spor**: Klikk på spor-nummeret (1-4) for å velge hvilket spor du vil ta opp på
2. **Ta opp**: Klikk på Record-knappen (rød knapp) for å starte opptak
3. **Spill av**: Bruk Play-knappen for å høre på opptakene
4. **Juster volum**: Dra på volumfaderen for hvert spor
5. **Counter**: Bruk Reset for å sette counter til nåværende posisjon, og Jump for å hoppe til counter-posisjon
6. **Eksporter**: Klikk på "Eksporter til WAV" for å laste ned den ferdige miksen

## Teknologi

- Next.js 15
- React 19
- TypeScript
- Web Audio API
- IndexedDB (via idb)
- Tailwind CSS
- Framer Motion

## Nettleserstøtte

Krever nettlesere som støtter:
- Web Audio API
- MediaRecorder API
- IndexedDB

Testet i moderne versjoner av Chrome, Firefox, Safari og Edge.
