/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';
import { getLogger } from '../../logger/logger.js';
import { Arzt } from '../entity/arzt.entity.js';
import { Patient } from '../entity/patient.entity.js';
import { Praxis } from '../entity/praxis.entity.js';
import { type Suchkriterien } from './suchkriterien.js';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, Pageable } from './pageable.js';

/** Typdefinitionen für die Suche mit der Arzt-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Arzts. */
    readonly id: number;
    /** Sollen die Patienten mitgeladen werden? */
    readonly mitPatienten?: boolean;
};
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Bücher und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #arztAlias = `${Arzt.name
        .charAt(0)
        .toLowerCase()}${Arzt.name.slice(1)}`;

    readonly #praxisAlias = `${Praxis.name
        .charAt(0)
        .toLowerCase()}${Praxis.name.slice(1)}`;

    readonly #patientAlias = `${Patient.name
        .charAt(0)
        .toLowerCase()}${Patient.name.slice(1)}`;

    readonly #repo: Repository<Arzt>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Arzt) repo: Repository<Arzt>) {
        this.#repo = repo;
    }

    /**
     * Ein Arzt mit der ID suchen.
     * @param id ID des gesuchten Arztes
     * @returns QueryBuilder
     */
    buildId({ id, mitPatienten = false }: BuildIdParams) {
        // QueryBuilder "arzt" fuer Repository<Arzt>
        const queryBuilder = this.#repo.createQueryBuilder(this.#arztAlias);

        // Fetch-Join: aus QueryBuilder "arzt" die Property "praxis" ->  Tabelle "praxis"
        queryBuilder.innerJoinAndSelect(
            `${this.#arztAlias}.praxis`,
            this.#praxisAlias,
        );

        if (mitPatienten) {
            // Fetch-Join: aus QueryBuilder "arzt" die Property "patienten" -> Tabelle "patient"
            queryBuilder.leftJoinAndSelect(
                `${this.#arztAlias}.patienten`,
                this.#patientAlias,
            );
        }

        queryBuilder.where(`${this.#arztAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Bücher asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // z.B. { praxis: 'a', rating: 5, javascript: true }
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    build(
        { 
            praxis, 
            javascript, 
            typescript, 
            java, 
            python, 
            ...restProps 
        }: Suchkriterien,
        pageable: Pageable,
    ) {
        this.#logger.debug('build: praxis=%s, javascript=%s, typescript=%s, java=%s, python=%s, restProps=%o, pageable=%o', 
            praxis,
            javascript,
            typescript,
            java,
            python,
            restProps,
            pageable,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#arztAlias);
        queryBuilder.innerJoinAndSelect(`${this.#arztAlias}.praxis`, 'praxis');

        // z.B. { praxis: 'a', rating: 5, javascript: true }
        // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
        // type-coverage:ignore-next-line
        // const { praxis, javascript, typescript, ...props } = suchkriterien;

        let useWhere = true;

        // Praxis in der Query: Teilstring des Praxiss und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (praxis !== undefined && typeof praxis === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#praxisAlias}.praxis ${ilike} :praxis`,
                { praxis: `%${praxis}%` },
            );
        }

        if (javascript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#arztAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#arztAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  );
            useWhere = false;
        }

        if (typescript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#arztAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#arztAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  );
            useWhere = false;
        }

        // Bei "JAVA" sollen Ergebnisse mit "JAVASCRIPT" _nicht_ angezeigt werden
        if (java === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `REPLACE(${this.#arztAlias}.schlagwoerter, 'JAVASCRIPT', '') like '%JAVA%'`,
                  )
                : queryBuilder.andWhere(
                      `REPLACE(${this.#arztAlias}.schlagwoerter, 'JAVASCRIPT', '') like '%JAVA%'`,
                  );
            useWhere = false;
        }

        if (python === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#arztAlias}.schlagwoerter like '%PYTHON%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#arztAlias}.schlagwoerter like '%PYTHON%'`,
                  );
            useWhere = false;
        }

        Object.entries(restProps).forEach(([key, value]) => {
            const param: Record<string, any> = {};
            param[key] = value; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#arztAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#arztAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        
        if (pageable?.size === 0) {
            return queryBuilder;
        }
        const size = pageable?.size ?? DEFAULT_PAGE_SIZE;
        const number = pageable?.number ?? DEFAULT_PAGE_NUMBER;
        const skip = number * size;
        this.#logger.debug('take=%s, skip=%s', size, skip);
        return queryBuilder.take(size).skip(skip);
    }
}
