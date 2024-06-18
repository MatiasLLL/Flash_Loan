import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, getPrices,quickSwapContractWithGetAmountsIn, sushiSwapContractWithGetAmountsIn, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut, quickSwapAddress, sushiSwapAddress, wbtcAddress, usdcAddress } from '../utils';

export async function PairWBTCUSDC() {
  try {
    const QuickSwap_wbtcTOusdc = await quickSwapContractWithGetAmountsOut.getAmountsOut(100, [wbtcAddress, usdcAddress]);
    const QuickSwap_usdcTOwbtc = await quickSwapContractWithGetAmountsIn.getAmountsIn(100, [usdcAddress, wbtcAddress]);
    const SushiSwap_wbtcTOusdc = await sushiSwapContractWithGetAmountsOut.getAmountsOut(100, [wbtcAddress, usdcAddress]);
    const SushiSwap_usdcTOwbtc = await sushiSwapContractWithGetAmountsIn.getAmountsIn(100, [usdcAddress, wbtcAddress]);
    // Price QuickSwap & SushiSwap
    const priceQuickSwap_wbtcTOusdc = BigInt(QuickSwap_wbtcTOusdc[1]);
    const priceQuickSwap_usdcTOwbtc = BigInt(QuickSwap_usdcTOwbtc[0]);
    const priceSushiSwap_wbtcTOusdc = BigInt(SushiSwap_wbtcTOusdc[1]);
    const priceSushiSwap_usdcTOwbtc = BigInt(SushiSwap_usdcTOwbtc[0]);
    // Print prices
    console.log(`price QuickSwap WBTC to USDC: ${priceQuickSwap_wbtcTOusdc}`);
    console.log(`price QuickSwap USDC to WBTC: ${priceQuickSwap_usdcTOwbtc}`);
    console.log(`price SushiSwap WBTC to USDC: ${priceSushiSwap_wbtcTOusdc}`);
    console.log(`price SushiSwap USDC to WBTC: ${priceSushiSwap_usdcTOwbtc}`);

    const arrayPrice1: bigint[] = [ priceQuickSwap_wbtcTOusdc, priceSushiSwap_wbtcTOusdc ];
    const arrayPrice2: bigint[] = [ priceQuickSwap_usdcTOwbtc, priceSushiSwap_usdcTOwbtc ];
    
    const normalizedPricesFirstSwap = arrayPrice1.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const highestPrice = Math.max(...normalizedPricesFirstSwap);
    const normalizedPricesSecondSwap = arrayPrice2.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const lowestPrice = Math.min(...normalizedPricesSecondSwap);

    console.log(`First Swap ==> swap 1 WBTC to ${highestPrice} USDC`);
    console.log(`Second Swap ==> swap the ${highestPrice} USDC to WBTC at the price of ${lowestPrice} USDC`);

    const calculateProfitMargin = (highestPrice: number, lowestPrice: number): number => {
      const profitMargin = (highestPrice / lowestPrice - 1) * 100;
      return profitMargin;
    };

    const profitMargin = calculateProfitMargin(highestPrice, lowestPrice);
    console.log(`Profit Margin: ${profitMargin}%`);

    // Proceed with the arbitrage
    const firstSwapPath = [wbtcAddress, usdcAddress];
    const secondSwapPath = [usdcAddress, wbtcAddress];
    const firstDexRouter = Number(ethers.formatUnits(priceQuickSwap_wbtcTOusdc, 0)) === highestPrice ? quickSwapAddress : sushiSwapAddress;
    const secondDexRouter = Number(ethers.formatUnits(priceQuickSwap_usdcTOwbtc, 0)) === lowestPrice ? quickSwapAddress : sushiSwapAddress;

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

// PairWBTCUSDC();
