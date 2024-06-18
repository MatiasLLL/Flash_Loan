import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, getPrices,quickSwapContractWithGetAmountsIn, sushiSwapContractWithGetAmountsIn, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut, quickSwapAddress, sushiSwapAddress, wbtcAddress, usdtAddress } from '../utils';

// WBTC to USDT = 1st swap Highest price => 2nd swap Lowest price

export async function PairWBTCUSDT() {
  try {
    const QuickSwap_wbtcTOusdt = await quickSwapContractWithGetAmountsOut.getAmountsOut(100, [wbtcAddress, usdtAddress]);
    const QuickSwap_usdtTOwbtc = await quickSwapContractWithGetAmountsIn.getAmountsIn(100, [usdtAddress, wbtcAddress]);
    const SushiSwap_wbtcTOusdt = await sushiSwapContractWithGetAmountsOut.getAmountsOut(100, [wbtcAddress, usdtAddress]);
    const SushiSwap_usdtTOwbtc = await sushiSwapContractWithGetAmountsIn.getAmountsIn(100, [usdtAddress, wbtcAddress]);
    // Price QuickSwap & SushiSwap
    const priceQuickSwap_wbtcTOusdt = BigInt(QuickSwap_wbtcTOusdt[1]);
    const priceQuickSwap_usdtTOwbtc = BigInt(QuickSwap_usdtTOwbtc[0]);
    const priceSushiSwap_wbtcTOusdt = BigInt(SushiSwap_wbtcTOusdt[1]);
    const priceSushiSwap_usdtTOwbtc = BigInt(SushiSwap_usdtTOwbtc[0]);
    // Print prices
    console.log(`price QuickSwap WBTC to USDT: ${priceQuickSwap_wbtcTOusdt}`);
    console.log(`price QuickSwap USDT to WBTC: ${priceQuickSwap_usdtTOwbtc}`);
    console.log(`price SushiSwap WBTC to USDT: ${priceSushiSwap_wbtcTOusdt}`);
    console.log(`price SushiSwap USDT to WBTC: ${priceSushiSwap_usdtTOwbtc}`);

    const arrayPrice1: bigint[] = [ priceQuickSwap_wbtcTOusdt, priceSushiSwap_wbtcTOusdt ];
    const arrayPrice2: bigint[] = [ priceQuickSwap_usdtTOwbtc, priceSushiSwap_usdtTOwbtc ];
    
    const normalizedPricesFirstSwap = arrayPrice1.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const highestPrice = Math.max(...normalizedPricesFirstSwap);
    const normalizedPricesSecondSwap = arrayPrice2.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const lowestPrice = Math.min(...normalizedPricesSecondSwap);

    console.log(`First Swap ==> swap 1 WBTC to ${highestPrice} USDT`);
    console.log(`Second Swap ==> swap the ${highestPrice} USDT to WBTC at the price of ${lowestPrice} USDT`);

    const calculateProfitMargin = (highestPrice: number, lowestPrice: number): number => {
      // const profitMargin = (highestPrice / lowestPrice - 1) * 100;
      // const profitMargin = (highestPrice * ( 1 / lowestPrice)) * 100;
      const profitMargin = (highestPrice - lowestPrice) / lowestPrice * 100;
      return profitMargin;
    };

    const profitMargin = calculateProfitMargin(highestPrice, lowestPrice);
    console.log(`Profit Margin: ${profitMargin}%`);

    // Proceed with the arbitrage
    const firstSwapPath = [wbtcAddress, usdtAddress];
    const secondSwapPath = [usdtAddress, wbtcAddress];
    const firstDexRouter = Number(ethers.formatUnits(priceQuickSwap_wbtcTOusdt, 0)) === highestPrice ? quickSwapAddress : sushiSwapAddress;
    const secondDexRouter = Number(ethers.formatUnits(priceQuickSwap_usdtTOwbtc, 0)) === lowestPrice ? quickSwapAddress : sushiSwapAddress;

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "address[]", "address", "address"],
      [firstSwapPath, secondSwapPath, firstDexRouter, secondDexRouter]
    );

    const amountToBorrow = ethers.parseUnits('1', 8);
    console.log(`Amount to borrow: ${amountToBorrow}`);
    
    if (profitMargin > 0.75) {
      try {
        console.log("\x1b[32m%s\x1b[0m", '===============================================');
        console.log("\x1b[32m%s\x1b[0m", 'Arbitrage opportunity found!! Attempting to initiate flash loan...');
        console.log("\x1b[32m%s\x1b[0m", '===============================================');

        const txResponse = await arbitrageContractWithSigner.requestFlashLoan(
          wbtcAddress,
          amountToBorrow,
          params,
        );
        console.log('Transaction sent:', txResponse.hash);

        // Waiting for the transaction to be mined
        const receipt = await txResponse.wait() as ContractTransactionReceipt;
        console.log('Transaction confirmed:', receipt);

        const profitMade = (profitMargin * parseFloat(ethers.formatUnits(amountToBorrow, 8))) / 100;
        console.log(`Profit made: $${profitMade}`);

        // Now attempting to withdraw profits
        console.log('Attempting to withdraw profits...');
        const withdrawTxResponse = await arbitrageContractWithSigner.withdraw(wbtcAddress);
        const withdrawReceipt = await withdrawTxResponse.wait() as ContractTransactionReceipt;
        console.log('Withdrawal confirmed:', withdrawReceipt);
      } catch (error: any) {
        console.error('Flash loan failed:', error.message);
      }
    } else {
      console.log('No profitable arbitrage opportunity found');
    }
  } catch (error) {
    console.error('An error occurred', error);
  }
}

// PairWBTCUSDT();
