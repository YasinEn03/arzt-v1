/**
 * Das Modul besteht aus der Klasse {@linkcode Suchkriterien}.
 * @packageDocumentation
 */

/**
 * Typdefinition für `find` in `arzt-read.service` und `QueryBuilder.build()`.
 */

import { type ArztArt } from '../entity/arzt.entity.js';

/**
 * Typdefinition für 'find' in 'arzt-read.service' und 'QueryBuilder.build()'.
 */
export interface Suchkriterien {
    readonly name?: string;
    readonly geburtsdatum?: Date;
    readonly art?: ArztArt;
    readonly telefonnummer?: string;
    readonly fachgebiet?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly java?: string;
    readonly python?: string;
    readonly praxis?: string;
}
