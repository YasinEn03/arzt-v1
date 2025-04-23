/**
 * Das Modul besteht aus der Klasse {@linkcode ArztWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeleteResult, Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail.service.js';
import { Arzt } from '../entity/arzt.entity.js';
import { ArztFile } from '../entity/arztFile.entity.js';
import { Patienten } from '../entity/patienten.entity.js';
import { Praxis } from '../entity/praxis.entity.js';
import { ArztReadService } from './arzt-read.service.js';
import {
    NameExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';

/** Typdefinitionen zum Aktualisieren eines Arztes mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Arztes. */
    readonly id: number | undefined;
    /** Arzt-Objekt mit den aktualisierten Werten. */
    readonly arzt: Arzt;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
};

/**
 * Die Klasse `ArztWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class ArztWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Arzt>;

    readonly #fileRepo: Repository<ArztFile>;

    readonly #readService: ArztReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(ArztWriteService.name);

    constructor(
        @InjectRepository(Arzt) repo: Repository<Arzt>,
        @InjectRepository(ArztFile) fileRepo: Repository<ArztFile>,
        readService: ArztReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#fileRepo = fileRepo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Arzt soll angelegt werden.
     * @param arzt Das neu abzulegende Arzt
     * @returns Die ID des neu angelegten Arztes
     * @throws IsbnExists falls die ISBN-Nummer bereits existiert
     */
    async create(arzt: Arzt): Promise<number> {
        this.#logger.debug('create: arzt=%o', arzt);
        await this.#validateCreate(arzt);

        const arztDb = await this.#repo.save(arzt); // implizite Transaktion
        this.#logger.debug('create: arztDb=%o', arztDb);

        await this.#sendmail(arztDb);

        return arztDb.id!;
    }

    /**
     * Zu einem vorhandenen Arzt eine Binärdatei mit z.B. einem Bild abspeichern.
     * @param arztId ID des vorhandenen Arztes
     * @param data Bytes der Datei
     * @param filename Dateiname
     * @param mimetype MIME-Type
     * @returns Entity-Objekt für `ArztFile`
     */
    // eslint-disable-next-line max-params
    async addFile(
        arztId: number,
        data: Buffer,
        filename: string,
        mimetype: string,
    ): Promise<Readonly<ArztFile>> {
        this.#logger.debug(
            'addFile: arztId: %d, filename:%s, mimetype: %s',
            arztId,
            filename,
            mimetype,
        );

        // Arzt ermitteln, falls vorhanden
        const arzt = await this.#readService.findById({ id: arztId });

        // evtl. vorhandene Datei loeschen
        await this.#fileRepo
            .createQueryBuilder('arzt_file')
            .delete()
            .where('arzt_id = :id', { id: arztId })
            .execute();

        // Entity-Objekt aufbauen, um es spaeter in der DB zu speichern (s.u.)
        const arztFile = this.#fileRepo.create({
            filename,
            data,
            mimetype,
            arzt,
        });

        // Den Datensatz fuer Arzt mit der neuen Binaerdatei aktualisieren
        await this.#repo.save({
            id: arzt.id,
            file: arztFile,
        });

        return arztFile;
    }

    /**
     * Ein vorhandenes Arzt soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Arzts), arzt (zu aktualisierendes Arzt)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Arzt zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, arzt, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, arzt=%o, version=%s',
            id,
            arzt,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Arzt mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(arzt, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Arzt)) {
            return validateResult;
        }

        const arztNeu = validateResult;
        const merged = this.#repo.merge(arztNeu, arzt);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Arzt wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Arztes
     * @returns true, falls das Arzt vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const arzt = await this.#readService.findById({
            id,
            mitPatienten: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            // Das Arzt zur gegebenen ID mit Praxis und Abb. asynchron loeschen

            // TODO "cascade" funktioniert nicht beim Loeschen
            const praxisId = arzt.praxis?.id;
            if (praxisId !== undefined) {
                await transactionalMgr.delete(Praxis, praxisId);
            }
            // "Nullish Coalescing" ab ES2020
            const patienten = arzt.patienten ?? [];
            for (const patient of patienten) {
                await transactionalMgr.delete(Patienten, patient.id);
            }

            deleteResult = await transactionalMgr.delete(Arzt, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate({ name }: Arzt): Promise<undefined> {
        this.#logger.debug('#validateCreate: id=%s', name);
        if (await this.#repo.existsBy({ name })) {
            throw new NameExistsException(`${name} is already in use`);
        }
    }

    async #sendmail(arzt: Arzt) {
        const subject = `Neuer Arzt ${arzt.id}`;
        const praxis = arzt.praxis?.praxis ?? 'N/A';
        const body = `Das Arzt mit dem Praxis <strong>${praxis}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        arzt: Arzt,
        id: number,
        versionStr: string,
    ): Promise<Arzt> {
        this.#logger.debug(
            '#validateUpdate: arzt=%o, id=%s, versionStr=%s',
            arzt,
            id,
            versionStr,
        );
        if (!ArztWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: arzt=%o, version=%d',
            arzt,
            version,
        );

        const arztDb = await this.#readService.findById({ id });

        // nullish coalescing
        const versionDb = arztDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: arztDb=%o', arztDb);
        return arztDb;
    }
}
