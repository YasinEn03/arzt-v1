import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { binaryType } from '../../config/db.js';
import { Arzt } from './arzt.entity.js';

@Entity()
export class ArztFile {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column('varchar')
    filename: string | undefined;

    @Column('varchar')
    mimetype: string | undefined;

    @OneToOne(() => Arzt, (arzt) => arzt.file)
    @JoinColumn({ name: 'arzt_id' })
    arzt: Arzt | undefined;

    @Column({ type: binaryType })
    data: Uint8Array | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            filename: this.filename,
            mimetype: this.mimetype,
        });
}
