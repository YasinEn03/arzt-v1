/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsOptional,
    IsPhoneNumber,
    Matches,
    ValidateNested,
} from 'class-validator';
import { PatientDTO } from './patientDTO.entity.js';
import { PraxisDTO } from './praxisDTO.entity.js';

/**
 * Entity-Klasse für Ärzte ohne TypeORM und ohne Referenzen.
 */
export class ArztDtoOhneRef {
    @ApiProperty({ example: 'Bernd Brot', type: String })
    readonly name!: string;

    @Matches(/^(C|RAD|KAR|HNO|AUG)$/u)
    @IsOptional()
    @ApiProperty({ example: 'C', type: String })
    readonly art: string | undefined;

    @Matches(/^(KARDIOLOGIE|RADIOLOGIE|CHIRURGIE)$/u)
    @ApiProperty({ example: 'KARDIOLOGE', type: String })
    readonly fachgebiet!: string;

    @IsPhoneNumber('DE')
    @ApiProperty({ example: '+49 176 89227837', type: String })
    readonly telefonnummer: string | undefined;

    @ApiProperty({ example: '27.03.2003', type: Date })
    readonly geburtsdatum: Date | undefined;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: ['JAVASCRIPT', 'TYPESCRIPT', 'JAVA', 'PYTHON'] })
    readonly schlagwoerter: string[] | undefined;
}

/**
 * Entity-Klasse für Ärzte ohne TypeORM.
 */
export class ArztDTO extends ArztDtoOhneRef {
    @ValidateNested()
    @Type(() => PraxisDTO)
    @ApiProperty({ type: PraxisDTO })
    readonly praxis!: PraxisDTO; // NOSONAR

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PatientDTO)
    @ApiProperty({ type: [PatientDTO] })
    readonly patienten: PatientDTO[] | undefined;
}
/* eslint-enable max-classes-per-file */
