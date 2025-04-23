import { Arzt } from './arzt.entity.js';
import { ArztFile } from './arztFile.entity.js';
import { Patienten } from './patienten.entity.js';
import { Praxis } from './praxis.entity.js';

// erforderlich in src/config/db.ts und src/arzt/arzt.module.ts
export const entities = [Arzt, ArztFile, Patienten, Praxis];
