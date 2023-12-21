import { Service } from 'crypto-wallet/injection';
import { ArrayHelper } from 'crypto-wallet/utils';
import { DataService } from '../data';
import { SentRecipientRecord } from './models';

@Service()
export class AddressService {
  constructor(
    private dataService: DataService,
  ) {
  }

  async getLastRecipients(tokenAddress: string, network: string): Promise<SentRecipientRecord[]> {
    const tokenRecipients = await this.dataService.getLastNetworkRecipients(tokenAddress, network);
    if (!tokenRecipients) {
      return [];
    }
    return Object.keys(tokenRecipients).map<SentRecipientRecord>(recipientAddress => ({ recipientAddress, ...tokenRecipients[recipientAddress] }))
      .sort(ArrayHelper.desc((recipient) => recipient.timestamp));
  }

  async addLastRecipients(tokenAddress: string, recipient: string, amount: string, network: string): Promise<void> {
    let tokenRecipients = await this.dataService.getLastNetworkRecipients(tokenAddress, network);
    if (!tokenRecipients) {
      tokenRecipients = {};
    }
    const now = Date.now();
    const totalRecipients = Object.keys(tokenRecipients).length;
    if (totalRecipients > 9) {
      const recipients = Object.keys(tokenRecipients)
        .map(recipientAddress => ({ recipientAddress, timestamp: tokenRecipients[recipientAddress].timestamp }))
        .sort(ArrayHelper.asc((recipient) => recipient.timestamp));
      recipients.slice(0, totalRecipients - 9).forEach(item => {
        delete tokenRecipients[item.recipientAddress];
      })
    }
    tokenRecipients[recipient] = {
      timestamp: now,
      amount: amount,
    }

    await this.dataService.setLastNetworkRecipients(tokenAddress, tokenRecipients, network);

  }

}
