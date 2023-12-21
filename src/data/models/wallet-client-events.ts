import { EventEmitter } from 'events';

declare global {

  export interface WalletClientEvents {
    tronAccountSentDataChanged: string,
  }
}
