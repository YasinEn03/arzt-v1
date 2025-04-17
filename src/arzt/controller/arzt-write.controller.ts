/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiParam,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard, Public, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Arzt } from '../entity/arzt.entity.js';
import { type Patient } from '../entity/patient.entity.js';
import { type Praxis } from '../entity/praxis.entity.js';
import { ArztWriteService } from '../service/arzt-write.service.js';
import { ArztDTO, ArztDtoOhneRef } from './arztDTO.entity.js';
import { createBaseUri } from './createBaseUri.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von 'rzte.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Arzt REST-API')
@ApiBearerAuth()
export class ArztWriteController {
    readonly #service: ArztWriteService;

    readonly #logger = getLogger(ArztWriteController.name);

    constructor(service: ArztWriteService) {
        this.#service = service;
    }

    /**
     * Ein neues Arzt wird asynchron angelegt. Das neu anzulegende Arzt ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Arzt abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Praxis oder die ISBN-Nummer bereits
     * existieren.
     *
     * @param arztDTO JSON-Daten für ein Arzt im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @Roles('admin', 'user')
    @ApiOperation({ summary: 'Ein neues Arzt anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Arztdaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() arztDTO: ArztDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: arztDTO=%o', arztDTO);

        const arzt = this.#arztDtoToArzt(arztDTO);
        const id = await this.#service.create(arzt);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Zu einem gegebenen Arzt wird eine Binärdatei, z.B. ein Bild, hochgeladen.
     * Nest realisiert File-Upload mit POST.
     * https://docs.nestjs.com/techniques/file-upload.
     * Postman: Body mit "form-data", key: "file" und "File" im Dropdown-Menü
     * @param id ID des vorhandenen Arztes
     * @param file Binärdatei als `File`-Objekt von _Multer_.
     * @param req: Request-Objekt von Express für den Location-Header.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Post(':id')
    @Public()
    // @Roles({ roles: ['admin']})
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Binärdatei mit einem Bild hochladen' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiCreatedResponse({ description: 'Erfolgreich hinzugefügt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Datei' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    @UseInterceptors(FileInterceptor('file'))
    async addFile(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'addFile: id: %d, originalname=%s, mimetype=%s',
            id,
            file.originalname,
            file.mimetype,
        );

        // TODO Dateigroesse pruefen

        await this.#service.addFile(
            id,
            file.buffer,
            file.originalname,
            file.mimetype,
        );

        const location = `${createBaseUri(req)}/file/${id}`;
        this.#logger.debug('addFile: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandener Arzt wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Arztes
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierende Arzt als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Praxis oder die neue ISBN-Nummer bereits existieren.
     *
     * @param arztDTO Arztdaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles('admin', 'user')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Ein vorhandenes Arzt aktualisieren' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Arztdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() arztDTO: ArztDtoOhneRef,
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, arztDTO=%o, version=%s',
            id,
            arztDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const arzt = this.#arztDtoOhneRefToArzt(arztDTO);
        const neueVersion = await this.#service.update({ id, arzt, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Arzt wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Arzt mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Das Arzt wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
    }

    #arztDtoToArzt(arztDTO: ArztDTO): Arzt {
        const praxisDTO = arztDTO.praxis;
        const praxis: Praxis = {
            id: undefined,
            praxis: praxisDTO.praxis,
            adresse: praxisDTO.adresse,
            telefonnummer: praxisDTO.telefonnummer,
            arzt: undefined,
        };
        const patienten = arztDTO.patienten?.map((patientDTO) => {
            const patient: Patient = {
                id: undefined,
                name: patientDTO.name,
                geburtsdatum: patientDTO.geburtsdatum,
                telefonnummer: patientDTO.telefonnummer,
                adresse: patientDTO.adresse,
                arzt: undefined,
            };
            return patient;
        });
        const arzt = {
            id: undefined,
            version: undefined,
            name: arztDTO.name,
            art: arztDTO.art,
            fachgebiet: arztDTO.fachgebiet,
            telefonnummer: arztDTO.telefonnummer,
            geburtsdatum: arztDTO.geburtsdatum,
            schlagwoerter: arztDTO.schlagwoerter,
            praxis,
            patienten,
            file: undefined,
            erstellt: new Date(),
            aktualisiert: new Date(),
        };

        // Rueckwaertsverweise
        arzt.praxis.arzt = arzt;
        arzt.patienten?.forEach((patient) => {
            patient.arzt = arzt;
        });
        return arzt;
    }

    #arztDtoOhneRefToArzt(arztDTO: ArztDtoOhneRef): Arzt {
        return {
            id: undefined,
            version: undefined,
            name: arztDTO.name,
            art: arztDTO.art,
            fachgebiet: arztDTO.fachgebiet,
            telefonnummer: arztDTO.telefonnummer,
            geburtsdatum: arztDTO.geburtsdatum,
            schlagwoerter: arztDTO.schlagwoerter,
            praxis: undefined,
            patienten: undefined,
            file: undefined,
            erstellt: undefined,
            aktualisiert: new Date(),
        };
    }
}
