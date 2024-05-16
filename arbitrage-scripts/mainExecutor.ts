import { Pair1 } from './paires/USDC_DAI';
import { Pair2 } from './paires/USDT_USDC';
import { Pair3 } from './paires/DAI_USDT';
 
async function main() {
    // console.log("\x1b[35m%s\x1b[0m", '===============================================');
    await Pair1();
    await Pair2();
    await Pair3();
}

// setInterval(main, 20000); // every 20 seconds
main();

