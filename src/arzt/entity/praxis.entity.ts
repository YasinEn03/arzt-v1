import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Arzt } from './arzt.entity.js'; // Import der Arzt-Entität

@Entity()
export class Praxis {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column('varchar')
    readonly praxis!: string; // Name der Praxis

    @Column('varchar')
    readonly adresse: string | undefined; // Adresse der Praxis

    @Column('varchar')
    readonly telefonnummer: string | undefined; // Telefonnummer der Praxis

    @OneToOne(() => Arzt, (arzt) => arzt.praxis)
    @JoinColumn({ name: 'arzt_id' })
    arzt: Arzt | undefined; // Beziehung zu Arzt

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            praxis: this.praxis,
            adresse: this.adresse,
            telefonnummer: this.telefonnummer,
        });
}
