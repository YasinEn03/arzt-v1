import { Arzt } from './arzt.entity.js';
import { Patient } from './patient.entity.js';
import { Praxis } from './praxis.entity.js';

// erforderlich in src/config/db.ts und src/arzt/arzt.module.ts
export const entities = [Arzt, Patient, Praxis];
