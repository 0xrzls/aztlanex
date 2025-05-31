// AzGuard wallet client implementation
import { AzguardClient } from '@azguardwallet/client';

let azguardInstance: any = null;

export interface AzGuardConnectionResult {
  success: boolean;
  account?: any;
  address?: string;
  provider?: string;
  error?: string;
}

function createAccountWrapper(address: string, fullAccount: string, client: any) {
  return {
    address,
    fullAccount,
    getAddress: () => ({ toString: () => address }),
    signMessage: async (msg: string) => {
      // Hash-based signature for Azguard
      const encoder = new TextEncoder();
      const data = encoder.encode(msg);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return '0x' + hashHex;
    },
    _azguardClient: client
  };
}

export const connectAzGuard = async (): Promise<AzGuardConnectionResult> => {
  try {
    console.log('Checking if AzGuard is installed...');
    const isInstalled = await AzguardClient.isAzguardInstalled();
    
    if (!isInstalled) {
      window.open(
        'https://chrome.google.com/webstore/detail/azguard-wallet/pliilpflcmabdiapdeihifihkbdfnbmn',
        '_blank'
      );
      return { 
        success: false, 
        error: 'AzGuard wallet not installed' 
      };
    }

    console.log('Creating AzGuard client...');
    const azguard = await AzguardClient.create();
    if (!azguard) throw new Error('Failed to initialize AzGuard client');

    console.log('AzGuard connected status:', azguard.connected);
    
    if (!azguard.connected) {
      console.log('Connecting to AzGuard...');
      await azguard.connect(
        { 
          name: 'Aztlan Quest', 
          iconUrl: window.location.origin + '/logo.svg' 
        },
        [
          {
            chains: ['aztec:11155111'],
            methods: ['send_transaction', 'call'],
          },
        ]
      );
    }

    const accounts = azguard.accounts;
    console.log('AzGuard accounts:', accounts);
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No account returned from AzGuard');
    }

    // Get the first account - format: "aztec:chainId:address"
    const fullAccount = accounts[0];
    let address: string;
    
    // Parse the address from the full account string
    if (typeof fullAccount === 'string' && fullAccount.includes(':')) {
      const parts = fullAccount.split(':');
      address = parts[parts.length - 1]; // Get the last part (the actual address)
      console.log('Parsed address:', address);
    } else {
      // If it's already just an address
      address = fullAccount;
    }

    const accountWrapper = createAccountWrapper(address, fullAccount, azguard);
    azguardInstance = azguard;

    return { 
      success: true, 
      account: accountWrapper, 
      address, 
      provider: 'azguard' 
    };
  } catch (err) {
    console.error('AzGuard connection error:', err);
    azguardInstance = null;
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to connect to AzGuard' 
    };
  }
};

// Check if AzGuard is available
export const isAzGuardAvailable = async (): Promise<boolean> => {
  try {
    return await AzguardClient.isAzguardInstalled();
  } catch (error) {
    console.error('Error checking AzGuard availability:', error);
    return false;
  }
};

// Export for debugging
export const getAzGuardInstance = () => azguardInstance;