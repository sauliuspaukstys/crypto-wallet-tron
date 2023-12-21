import { Initialize, Service } from 'crypto-wallet/injection';
import { ClientsService } from 'crypto-wallet/modules/wallet';
import { FactoryService } from 'crypto-wallet/modules/core';
import { EventEmitter } from 'crypto-wallet/components';

// <reference types="@types/tronweb" />
import * as TronWebLib from 'tronweb/dist/TronWeb.js';

const TronWeb = TronWebLib.default;



interface ProviderNetwork {

}

interface NetworkEvents {
    networkNameChanged: string,
    connectedStateChanged: boolean,
    networkChanged: ProviderNetwork,
}

@Service()
export class NetworkService extends EventEmitter<NetworkEvents> {

    private network: ProviderNetwork;
    private isConnected: boolean;
    private networkName: string;
    private providers: { [name: string]: Promise<any> } = {};

    constructor(
        private clientsService: ClientsService,
        private factoryService: FactoryService,
    ) {
        super();
    }

    getNetworkName() {
        return this.networkName;
    }

    getNetwork() {
        return this.network;
    }

    connected() {
        return this.isConnected;
    }

    getNetowkProvider(network: string) {
        if (this.providers[network]) {
            return this.providers[network];
        }
        return this.providers[network] = this.createNetowkProvider(network);
    }

    private async createNetowkProvider(network: string): Promise<any> {
        return new TronWeb({
            fullHost: 'https://nile.trongrid.io/',
        });
    }

    private async switchNetwork(networkName: string) {
        this.isConnected = true;
        this.networkName = networkName;
        await this.clientsService.emitAllClients('tronNetworkNameChanged', networkName);
        this.emit('networkNameChanged', networkName);
    }

    private async getDefaultNetworkName() {
        return 'mainnet';
    }

    private async connect() {
        const networkName = await this.getDefaultNetworkName();
        try {
            await this.switchNetwork(networkName);
        } catch (error) {
        }
    }

    @Initialize()
    private async initialize() {
        await this.connect();
    }

}