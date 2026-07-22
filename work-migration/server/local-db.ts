import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'db.json');

export interface DbSchema {
  subscribers: any[];
  signups: any[];
  contact_submissions: any[];
  nda_attestations: any[];
}

function loadDb(): DbSchema {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    try {
      mkdirSync(dataDir, { recursive: true });
    } catch (err) {
      console.error('[LocalDB] Failed to create data directory:', err);
    }
  }
  if (!existsSync(DB_PATH)) {
    const initial: DbSchema = {
      subscribers: [],
      signups: [],
      contact_submissions: [],
      nda_attestations: []
    };
    try {
      writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalDB] Failed to create db.json:', err);
    }
    return initial;
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.error('[LocalDB] Failed to parse local DB, resetting to empty schema...', e);
    const initial: DbSchema = {
      subscribers: [],
      signups: [],
      contact_submissions: [],
      nda_attestations: []
    };
    try {
      writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalDB] Failed to write reset db.json:', err);
    }
    return initial;
  }
}

function saveDb(db: DbSchema) {
  try {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LocalDB] Failed to write db.json:', err);
  }
}

export class LocalSupabaseClient {
  from(table: keyof DbSchema) {
    const db = loadDb();
    if (!db[table]) {
      db[table] = [];
    }

    let chainData = [...db[table]];

    const builder = {
      insert: async (records: any | any[]) => {
        const arr = Array.isArray(records) ? records : [records];
        for (const item of arr) {
          const withId = {
            id: Math.random().toString(36).substring(2, 10),
            created_at: new Date().toISOString(),
            ...item
          };
          db[table].push(withId);
        }
        saveDb(db);
        return { data: arr, error: null };
      },

      upsert: async (records: any | any[], options?: { onConflict?: string }) => {
        const arr = Array.isArray(records) ? records : [records];
        const conflictKey = options?.onConflict;
        
        for (const item of arr) {
          let index = -1;
          if (conflictKey && item[conflictKey]) {
            index = db[table].findIndex((x: any) => x[conflictKey] === item[conflictKey]);
          }
          if (index !== -1) {
            db[table][index] = { 
              ...db[table][index], 
              ...item,
              updated_at: new Date().toISOString() 
            };
          } else {
            const withId = {
              id: Math.random().toString(36).substring(2, 10),
              created_at: new Date().toISOString(),
              ...item
            };
            db[table].push(withId);
          }
        }
        saveDb(db);
        return { data: arr, error: null };
      },

      select: (_columns: string = '*') => {
        return builder;
      },

      update: (updates: any) => {
        return {
          eq: (field: string, value: any) => {
            let updatedCount = 0;
            db[table] = db[table].map((x: any) => {
              if (x[field] === value) {
                updatedCount++;
                return { ...x, ...updates, updated_at: new Date().toISOString() };
              }
              return x;
            });
            if (updatedCount > 0) {
              saveDb(db);
            }
            return { error: null };
          }
        };
      },

      eq: (field: string, value: any) => {
        chainData = chainData.filter((x: any) => x[field] === value);
        
        const eqBuilder = {
          single: async () => {
            if (chainData.length === 0) {
              return { data: null, error: { message: 'Row not found' } };
            }
            return { data: chainData[0], error: null };
          },
          order: (orderField: string, options?: { ascending: boolean }) => {
            const asc = options?.ascending !== false;
            chainData.sort((a: any, b: any) => {
              const valA = a[orderField];
              const valB = b[orderField];
              if (valA < valB) return asc ? -1 : 1;
              if (valA > valB) return asc ? 1 : -1;
              return 0;
            });
            return eqBuilder;
          },
          then: (resolve: any) => resolve({ data: chainData, error: null })
        };
        
        return eqBuilder;
      },

      order: (orderField: string, options?: { ascending: boolean }) => {
        const asc = options?.ascending !== false;
        chainData.sort((a: any, b: any) => {
          const valA = a[orderField];
          const valB = b[orderField];
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
        
        const orderBuilder = {
          then: (resolve: any) => resolve({ data: chainData, error: null })
        };
        return orderBuilder;
      },

      then: (resolve: any) => resolve({ data: chainData, error: null })
    };

    return builder;
  }
}
