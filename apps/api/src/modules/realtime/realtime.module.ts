import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module.js';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { RealtimeGateway } from './gateway.js';
import { EventPublisher } from './publisher.js';

/** Kanał realtime Socket.IO i publikator outboxu zdarzeń (EP-04, IMP-154…156). */
@Module({
  imports: [OrganizerModule, DevicesModule],
  providers: [RealtimeGateway, EventPublisher],
  exports: [EventPublisher],
})
export class RealtimeModule {}
