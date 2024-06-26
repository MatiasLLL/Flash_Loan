import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, getPrices,quickSwapContractWithGetAmountsIn, sushiSwapContractWithGetAmountsIn, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut,  quickSwapAddress, sushiSwapAddress, wbtcAddress, daiAddress } from '../utils';

export async function PairWBTCDAI() {
  try {
    const QuickSwap_wbtcTOdai = await quickSwapContractWithGetAmountsOut.getAmountsOut(1, [wbtcAddress, daiAddress]);
    const QuickSwap_daiTOwbtc = await quickSwapContractWithGetAmountsIn.getAmountsIn(1, [daiAddress, wbtcAddress]);
    const SushiSwap_wbtcTOdai = await sushiSwapContractWithGetAmountsOut.getAmountsOut(1, [wbtcAddress, daiAddress]);
    const SushiSwap_daiTOwbtc = await sushiSwapContractWithGetAmountsIn.getAmountsIn(1, [daiAddress, wbtcAddress]);
    // Price QuickSwap & SushiSwap
    const priceQuickSwap_wbtcTOdai = BigInt(QuickSwap_wbtcTOdai[1]) / BigInt(1e10);
    const priceQuickSwap_daiTOwbtc = BigInt(QuickSwap_daiTOwbtc[0]) / BigInt(1e10);
    const priceSushiSwap_wbtcTOdai = BigInt(SushiSwap_wbtcTOdai[1]) / BigInt(1e10);
    const priceSushiSwap_daiTOwbtc = BigInt(SushiSwap_daiTOwbtc[0]) / BigInt(1e10);
    // Print prices
    console.log(`price QuickSwap_wbtcTOdai: ${priceQuickSwap_wbtcTOdai}`);
    console.log(`price QuickSwap_daiTOwbtc: ${priceQuickSwap_daiTOwbtc}`);
    console.log(`price SushiSwap_wbtcTOdai: ${priceSushiSwap_wbtcTOdai}`);
    console.log(`price SushiSwap_daiTOwbtc: ${priceSushiSwap_daiTOwbtc}`);

    const arrayPrice1: bigint[] = [ priceQuickSwap_wbtcTOdai, priceSushiSwap_wbtcTOdai ];
    const arrayPrice2: bigint[] = [ priceQuickSwap_daiTOwbtc, priceSushiSwap_daiTOwbtc ];
    
    const normalizedPricesFirstSwap = arrayPrice1.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const highestPrice = Math.max(...normalizedPricesFirstSwap);
    const normalizedPricesSecondSwap = arrayPrice2.map(amounts => parseFloat(ethers.formatUnits(amounts, 0)));
    const lowestPrice = Math.min(...normalizedPricesSecondSwap);

    console.log(`First Swap ==> swap 1 WBTC to ${highestPrice} DAI`);
    console.log(`Second Swap ==> swap the ${highestPrice} DAI to BTC at the price of ${lowestPrice} DAI`);

    const calculateProfitMargin = (highestPrice: number, lowestPrice: number): number => {
      const profitMargin = (highestPrice / lowestPrice - 1) * 100;
      return profitMargin;
    };

    const profitMargin = calculateProfitMargin(highestPrice, lowestPrice);
    console.log(`Profit Margin: ${profitMargin}%`);

    // Proceed with the arbitrage
    const firstSwapPath = [wbtcAddress, daiAddress];
    const secondSwapPath = [daiAddress, wbtcAddress];
    const firstDexRouter = Number(ethers.formatUnits(priceQuickSwap_wbtcTOdai, 0)) === highestPrice ? quickSwapAddress : sushiSwapAddress;
    const secondDexRouter = Number(ethers.formatUnits(priceQuickSwap_daiTOwbtc, 0)) === lowestPrice ? quickSwapAddress : sushiSwapAddress;

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "address[]", "address", "address"],
      [firstSwapPath, secondSwapPath, firstDexRouter, secondDexRouter]
    );

    const amountToBorrow = ethers.parseUnits('1', 8); // Adjust this amount based on your strategy
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

// PairWBTCDAI();
