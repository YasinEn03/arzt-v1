/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO-Klasse für Patienten.
 */
export class PatientDTO {
    @ApiProperty({ example: 'Max Mustermann', type: String })
    readonly name!: string; // Name des Patienten

    @IsDate()
    @ApiProperty({ example: '1990-01-01', type: String })
    readonly geburtsdatum!: Date; // Geburtsdatum des Patienten

    @MaxLength(15)
    @IsOptional() // Optional, falls nicht angegeben
    @ApiProperty({ example: '+49123456789', type: String })
    readonly telefonnummer?: string; // Telefonnummer des Patienten

    @MaxLength(100)
    @IsOptional() // Optional, falls nicht angegeben
    @ApiProperty({ example: 'Musterstraße 1, 12345 Musterstadt', type: String })
    readonly adresse?: string; // Adresse des Patienten

    @ApiProperty({ example: 1, type: Number })
    readonly arztId!: number; // ID des zugeordneten Arztes
}
