import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Arzt } from './arzt.entity.js'; // Import der Arzt-Entität

@Entity()
export class Patienten {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column('varchar')
    readonly name!: string; // Name des Patienten

    @Column('date')
    readonly geburtsdatum!: Date | string; // Geburtsdatum des Patienten

    @Column('varchar')
    readonly telefonnummer: string | undefined; // Telefonnummer des Patienten

    @Column('varchar')
    readonly adresse: string | undefined; // Adresse des Patienten

    @ManyToOne(() => Arzt, (arzt) => arzt.patienten)
    @JoinColumn({ name: 'arzt_id' })
    arzt: Arzt | undefined; // Beziehung zu Arzt

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            name: this.name,
            geburtsdatum: this.geburtsdatum,
            telefonnummer: this.telefonnummer,
            adresse: this.adresse,
        });
}
