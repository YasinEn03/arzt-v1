/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';
import { dbType } from '../../config/db.js';
import { ArztFile } from './arztFile.entity.js'; // Import der ArztFile-Entität
import { Patient } from './patient.entity.js'; // Import der Patient-Entität
import { Praxis } from './praxis.entity.js'; // Import der Praxis-Entität

export type ArztArt = 'C' | 'RAD' | 'KAR' | 'HNO' | 'AUG';

/**
 * Entity-Klasse für einen Arzt.
 * BEACHTE: Jede Entity-Klasse muss in einem JSON-Array deklariert sein, das in
 * TypeOrmModule.forFeature(...) verwendet wird.
 */
@Entity()
export class Arzt {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('varchar', { unique: true })
    @ApiProperty({ example: 'Dr. Max Mustermann', type: String })
    readonly name!: string;

    @Column('varchar')
    @ApiProperty({ example: 'Allgemeinmedizin', type: String })
    readonly fachgebiet: string | undefined;

    @Column('varchar')
    @ApiProperty({ example: 'C', type: String })
    readonly art: ArztArt | undefined;

    @Column('varchar', { unique: true })
    @ApiProperty({ example: '+49 123 4567890', type: String })
    readonly telefonnummer: string | undefined;

    @Column('date')
    @ApiProperty({ example: '1980-01-01' })
    readonly geburtsdatum: Date | string | undefined;

    @Column('simple-array')
    schlagwoerter: string[] | null | undefined;

    // 1:1 Beziehung: Ein Arzt hat eine zugeordnete Praxis
    @OneToOne(() => Praxis, (praxis) => praxis.arzt, {
        cascade: ['insert', 'remove'],
    })
    readonly praxis: Praxis | undefined;

    // 1:N Beziehung: Ein Arzt kann mehrere Patienten haben
    @OneToMany(() => Patient, (patient) => patient.arzt, {
        cascade: ['insert', 'remove'],
    })
    readonly patienten: Patient[] | undefined;

    @OneToOne(() => ArztFile, (arztFile) => arztFile.arzt, {
        cascade: ['insert', 'remove'],
    })
    readonly file: ArztFile | undefined;

    @CreateDateColumn({
        type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
    })
    readonly erstellt: Date | undefined;

    @UpdateDateColumn({
        type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
    })
    readonly aktualisiert: Date | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            name: this.name,
            fachgebiet: this.fachgebiet,
            telefonnummer: this.telefonnummer,
            geburtsdatum: this.geburtsdatum,
            schlagwoerter: this.schlagwoerter,
            erstellt: this.erstellt,
            aktualisiert: this.aktualisiert,
        });
}
