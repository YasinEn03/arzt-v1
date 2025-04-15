/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches, MaxLength } from 'class-validator';

/**
 * DTO-Klasse für Praxen ohne TypeORM.
 */
export class PraxisDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(100)
    @ApiProperty({ example: 'Allgemeinmedizin Musterpraxis', type: String })
    readonly praxis!: string; // Name der Praxis

    @IsOptional()
    @MaxLength(250)
    @ApiProperty({ example: 'Musterstraße 1, 12345 Musterstadt', type: String })
    readonly adresse: string | undefined; // Adresse der Praxis

    @IsOptional()
    @MaxLength(20)
    @ApiProperty({ example: '+49123456789', type: String })
    readonly telefonnummer: string | undefined; // Telefonnummer der Praxis

    @IsOptional()
    @MaxLength(100)
    @ApiProperty({ example: 'info@musterpraxis.de', type: String })
    readonly email: string | undefined; // E-Mail-Adresse der Praxis
}
