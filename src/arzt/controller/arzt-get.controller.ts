/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { Arzt } from '../entity/arzt.entity.js';
import { Praxis } from '../entity/praxis.entity.js';
import { ArztReadService } from '../service/arzt-read.service.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { getBaseUri } from './getBaseUri.js';

/** href-Link für HATEOAS */
export type Link = {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
};

/** Links für HATEOAS */
export type Links = {
    /** self-Link */
    readonly self: Link;
    /** Optionaler Linke für list */
    readonly list?: Link;
    /** Optionaler Linke für add */
    readonly add?: Link;
    /** Optionaler Linke für update */
    readonly update?: Link;
    /** Optionaler Linke für remove */
    readonly remove?: Link;
};

/** Typedefinition für ein Praxis-Objekt ohne Rückwärtsverweis zum Arzt */
export type PraxisModel = Omit<Praxis, 'arzt' | 'id'>;

/** Arzt-Objekt mit HATEOAS-Links */
export type ArztModel = Omit<
    Arzt,
    'patienten' | 'aktualisiert' | 'erstellt' | 'id' | 'praxis' | 'version'
> & {
    praxis: PraxisModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Arzt-Objekte mit HATEOAS-Links in einem JSON-Array. */
export type AerzteModel = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        aerzte: ArztModel[];
    };
};

/**
 * Klasse für `ArztGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `ArztController` hat dieselben Properties wie die Basisklasse
 * `Arzt` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class ArztQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly name: string;

    @ApiProperty({ required: false })
    declare readonly fachgebiet: string;

    @ApiProperty({ required: false })
    declare readonly telefonnummer: string;

    @ApiProperty({ required: false })
    declare readonly geburtsdatum: Date;

    @ApiProperty({ required: false })
    declare readonly praxis: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Arzt REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class ArztGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: ArztReadService;

    readonly #logger = getLogger(ArztGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: ArztReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: ArztReadService) {
        this.#service = service;
    }

    /**
     * Ein Arzt wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Arzt gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Arztes gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Arzt im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Arzt zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param idStr Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Arzt-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Arzt wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Arzt zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Der Arzt wurde bereits heruntergeladen',
    })
    async getById(
        @Param('id') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<ArztModel | undefined>> {
        this.#logger.debug('getById: idStr=%s, version=%s', idStr, version);
        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            this.#logger.debug('getById: not isInteger()');
            throw new NotFoundException(`Die Arzt-ID ${idStr} ist ungueltig.`);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const arzt = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): arzt=%s', arzt.toString());
            this.#logger.debug('getById(): praxis=%s', arzt.praxis);
        }

        // ETags
        const versionDb = arzt.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const arztModel = this.#toModel(arzt, req);
        this.#logger.debug('getById: arztModel=%o', arztModel);
        return res.contentType(APPLICATION_HAL_JSON).json(arztModel);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Arzt gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Arzt zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Ärzten' })
    async get(
        @Query() query: ArztQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<AerzteModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const aerzte = await this.#service.find(query);
        this.#logger.debug('get: %o', aerzte);

        // HATEOAS: Atom Links je Arzt
        const aerzteModel = aerzte.map((arzt) =>
            this.#toModel(arzt, req, false),
        );
        this.#logger.debug('get: aerzteModel=%o', aerzteModel);

        const result: AerzteModel = { _embedded: { aerzte: aerzteModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send();
    }

    #toModel(arzt: Arzt, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { id } = arzt;
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toModel: arzt=%o, links=%o', arzt, links);
        const praxisModel: PraxisModel = {
            praxis: arzt.praxis?.praxis ?? 'N/A',
            adresse: arzt.praxis?.adresse ?? 'N/A',
            telefonnummer: arzt.praxis?.telefonnummer ?? 'N/A',
        };
        const arztModel: ArztModel = {
            name: arzt.name,
            fachgebiet: arzt.fachgebiet,
            telefonnummer: arzt.telefonnummer,
            geburtsdatum: arzt.geburtsdatum,
            praxis: praxisModel,
            _links: links,
        };

        return arztModel;
    }
}
