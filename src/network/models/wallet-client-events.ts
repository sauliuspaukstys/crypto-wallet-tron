import { Network } from '../../network/models';

declare global {

  export interface WalletClientEvents {
    tronNetworkChanged: Network,
    tronNetworkNameChanged: string,
    tronConnectedStateChanged: boolean,
  }
}
