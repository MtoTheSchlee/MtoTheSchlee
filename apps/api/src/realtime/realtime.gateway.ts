import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { KKEvent } from '@kk/shared';

/**
 * One Socket.IO namespace for board/inbox/agent fan-out.
 * Rooms are `tenant:<id>` so broadcasts stay scoped.
 */
@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger('RealtimeGateway');

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const tenantId =
      (client.handshake.headers['x-tenant-id'] as string) ||
      (client.handshake.query.tenantId as string) ||
      process.env.TENANT_DEFAULT_ID ||
      '00000000-0000-0000-0000-000000000001';
    client.join(`tenant:${tenantId}`);
    this.log.log(`ws connect ${client.id} tenant=${tenantId}`);
  }

  handleDisconnect(client: Socket) {
    this.log.log(`ws disconnect ${client.id}`);
  }

  publish(ev: KKEvent) {
    this.server.to(`tenant:${ev.tenantId}`).emit(ev.type, ev);
  }
}
