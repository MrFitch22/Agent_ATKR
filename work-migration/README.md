# Work Migration — Agent Exploit Lab

Copy each file from this folder into your `agent-exploit-lab` directory on your work machine.

```
work-migration/
│
├── .env.example          →  agent-exploit-lab/.env.example
│                              (copy to .env.local and fill in any keys you have)
│
├── server/
│   ├── local-db.ts       →  agent-exploit-lab/server/local-db.ts     [NEW FILE]
│   └── index.ts          →  agent-exploit-lab/server/index.ts        [REPLACE]
│
└── pipeline/
    └── index.ts          →  agent-exploit-lab/pipeline/index.ts      [REPLACE]
```

## Quick Setup After Copying

1. Copy `.env.example` → `.env.local`, leave all keys blank for offline mode
2. Open two terminals:
   - Terminal 1: `npm run dev`   → frontend at http://localhost:5173
   - Terminal 2: `npm run server` → backend at http://localhost:3001
3. The server console will confirm:
   ```
   [Database] Supabase credentials missing. Falling back to local JSON database (data/db.json).
   ```

That's it — the app runs fully offline with simulated AI responses.
