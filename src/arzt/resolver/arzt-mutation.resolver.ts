// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { ArztDTO } from '../controller/arztDTO.entity.js';
import { Arzt } from '../entity/arzt.entity.js';
import { Patient } from '../entity/patient.entity.js';
import { Praxis } from '../entity/praxis.entity.js';
import { ArztWriteService } from '../service/arzt-write.service.js';
import { type IdInput } from './arzt-query.resolver.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export class ArztUpdateDTO extends ArztDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver('Arzt')
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class ArztMutationResolver {
    readonly #service: ArztWriteService;

    readonly #logger = getLogger(ArztMutationResolver.name);

    constructor(service: ArztWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') arztDTO: ArztDTO) {
        this.#logger.debug('create: arztDTO=%o', arztDTO);

        const arzt = this.#arztDtoToArzt(arztDTO);
        const id = await this.#service.create(arzt);
        this.#logger.debug('createArzt: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') arztDTO: ArztUpdateDTO) {
        this.#logger.debug('update: arzt=%o', arztDTO);

        const arzt = this.#arztUpdateDtoToArzt(arztDTO);
        const versionStr = `"${arztDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(arztDTO.id, 10),
            arzt,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateArzt: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idStr = id.id;
        this.#logger.debug('delete: id=%s', idStr);
        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug('deleteArzt: deletePerformed=%s', deletePerformed);
        return deletePerformed;
    }

    #arztDtoToArzt(arztDTO: ArztDTO): Arzt {
        const praxisDTO = arztDTO.praxis;
        const praxis: Praxis = {
            id: undefined,
            adresse: praxisDTO.adresse,
            praxis: praxisDTO.praxis,
            telefonnummer: praxisDTO.telefonnummer,
            arzt: undefined,
        };
        // "Optional Chaining" ab ES2020
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
        const arzt: Arzt = {
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

        // Rueckwaertsverweis
        arzt.praxis!.arzt = arzt;
        return arzt;
    }

    #arztUpdateDtoToArzt(arztDTO: ArztUpdateDTO): Arzt {
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

    // #errorMsgCreateArzt(err: CreateError) {
    //     switch (err.type) {
    //         case 'IsbnExists': {
    //             return `Die ISBN ${err.isbn} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateArzt(err: UpdateError) {
    //     switch (err.type) {
    //         case 'ArztNotExists': {
    //             return `Es gibt kein Arzt mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
