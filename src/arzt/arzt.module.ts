import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';
import { ArztGetController } from './controller/arzt-get.controller.js';
import { ArztWriteController } from './controller/arzt-write.controller.js';
import { entities } from './entity/entities.js';
import { ArztMutationResolver } from './resolver/arzt-mutation.resolver.js';
import { ArztQueryResolver } from './resolver/arzt-query.resolver.js';
import { ArztReadService } from './service/arzt-read.service.js';
import { ArztWriteService } from './service/arzt-write.service.js';
import { QueryBuilder } from './service/query-builder.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Bücher.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für TypeORM.
 */
@Module({
    imports: [KeycloakModule, MailModule, TypeOrmModule.forFeature(entities)],
    controllers: [ArztGetController, ArztWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        ArztReadService,
        ArztWriteService,
        ArztQueryResolver,
        ArztMutationResolver,
        QueryBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [ArztReadService, ArztWriteService],
})
export class ArztModule {}
