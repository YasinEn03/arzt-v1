/**
 * Das Modul besteht aus der Klasse {@linkcode ArztReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';
import { Arzt } from '../entity/arzt.entity.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';
import { InjectRepository } from '@nestjs/typeorm';
import { ArztFile } from '../entity/arztFile.entity.js';
import { Repository } from 'typeorm';
import { Pageable } from './pageable.js';
import { Slice } from './slice.js';

/**
 * Typdefinition für `findById`
 */
export type FindByIdParams = {
    /** ID des gesuchten Arzts */
    readonly id: number;
    /** Sollen die Patienten mitgeladen werden? */
    readonly mitPatienten?: boolean;
};

/**
 * Die Klasse `ArztReadService` implementiert das Lesen für Bücher und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class ArztReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #arztProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #fileRepo: Repository<ArztFile>;

    readonly #logger = getLogger(ArztReadService.name);

    constructor(
        queryBuilder: QueryBuilder,
        @InjectRepository(ArztFile) fileRepo: Repository<ArztFile>,
    ) {
        const arztDummy = new Arzt();
        this.#arztProps = Object.getOwnPropertyNames(arztDummy);
        this.#queryBuilder = queryBuilder;
        this.#fileRepo = fileRepo;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Arzt asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Arztes
     * @returns Das gefundene Arzt in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Arzt mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({
        id,
        mitPatienten = true,
    }: FindByIdParams): Promise<Readonly<Arzt>> {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const arzt = await this.#queryBuilder
            .buildId({ id, mitPatienten })
            .getOne();
        if (arzt === null) {
            throw new NotFoundException(`Es gibt kein Arzt mit der ID ${id}.`);
        }

        if (arzt.schlagwoerter === null) {
            arzt.schlagwoerter = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: arzt=%s, praxis=%s',
                arzt.toString(),
                arzt.praxis,
            );
            if (mitPatienten) {
                this.#logger.debug('findById: patienten=%o', arzt.patienten);
            }
        }
        return arzt;
    }

    /**
     * Ärzte asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Büchern.
     * @throws NotFoundException falls keine Bücher gefunden wurden.
     */
    async find(
        suchkriterien: Suchkriterien | undefined,
        pageable: Pageable,
    ): Promise<Slice<Arzt>> {
        this.#logger.debug(
            'find: suchkriterien=%o, pageable=%o',
            suchkriterien,
            pageable,
        );

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys) || !this.#checkEnums(suchkriterien)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const queryBuilder = this.#queryBuilder.build(suchkriterien, pageable);
        const aerzte = await queryBuilder.getMany();
        if (aerzte.length === 0) {
            this.#logger.debug('find: Keine Aerzte gefunden');
            throw new NotFoundException(
                `Keine Aerzte gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(aerzte, totalElements);
    }

    async #findAll(pageable: Pageable) {
        const queryBuilder = this.#queryBuilder.build({}, pageable);
        const aerzte = await queryBuilder.getMany();
        if (aerzte.length === 0) {
            throw new NotFoundException(
                `Ungueltige Seite "${pageable.number}"`,
            );
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(aerzte, totalElements);
    }

    #createSlice(aerzte: Arzt[], totalElements: number) {
        aerzte.forEach((arzt) => {
            if (arzt.schlagwoerter === null) {
                arzt.schlagwoerter = [];
            }
        });
        const arztSlice: Slice<Arzt> = {
            content: aerzte,
            totalElements,
        };
        this.#logger.debug('createSlice: slice=%o', arztSlice);
        return arztSlice;
    }

    async findFileByArztId(
        arztId: number,
    ): Promise<Readonly<ArztFile> | undefined> {
        this.#logger.debug('findFileByArztId: arztId=%d', arztId);
        const arztFile = await this.#fileRepo
            .createQueryBuilder('arzt_file')
            .where('arzt_id = :id', { id: arztId })
            .getOne();
        if (arztFile === null) {
            this.#logger.debug('findFileByArztId: Keine Datei gefunden');
            return;
        }

        this.#logger.debug('findFileByArztId: filename=%s', arztFile.filename);
        return arztFile;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Arzt oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#arztProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript' &&
                key !== 'java' &&
                key !== 'python'
            ) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }

    #checkEnums(suchkriterien: Suchkriterien) {
        const { art } = suchkriterien;
        this.#logger.debug('#checkEnums: Suchkriterium "art=%s"', art);

        return (
            art === 'C' ||
            art === 'RAD' ||
            art === 'KAR' ||
            art === 'HNO' ||
            art === 'AUG'
        );
    }
}
