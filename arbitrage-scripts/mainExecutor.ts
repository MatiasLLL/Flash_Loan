import { PairWBTCDAI } from './paires/WBTC_DAI';
import { PairWBTCUSDC } from './paires/WBTC_USDC';
import { PairWBTCUSDT } from './paires/WBTC_USDT';
 
async function main() {
    console.log("\x1b[35m%s\x1b[0m", '===============================================');
    await PairWBTCDAI();
    await PairWBTCUSDC();
    await PairWBTCUSDT();
}

main();
// setInterval(main, 20000); // every 20 seconds

