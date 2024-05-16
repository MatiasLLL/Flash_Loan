import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, quickSwapAddress, sushiSwapAddress, wbtcAddress, daiAddress, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut, exchangeAtIndex, tokenAtIndex, tokenToBorrow } from '../utils';

export async function Pair4() {
  const amountIn = ethers.parseUnits('1', 8);
  const amountInDAI = ethers.parseUnits('1', 18);

  try {
    // Get amount QuickSwap
    const amountsOutQuickSwap1 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [wbtcAddress, daiAddress]);
    const amountsOutQuickSwap2 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountInDAI, [daiAddress, wbtcAddress]);
    // Get amount SushiSwap
    const amountsOutSushiSwap1 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [wbtcAddress, daiAddress]);
    const amountsOutSushiSwap2 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountInDAI, [daiAddress, wbtcAddress]);
    // Get price QuickSwap
    const priceQuickSwap_wbtcTOdai = BigInt(amountsOutQuickSwap1[1]) / BigInt(1e10);
    const priceQuickSwap_daiTOwbtc = BigInt(amountsOutQuickSwap2[1]);
    // Get price SushiSwap
    const priceSushiSwap_wbtcTOdai = BigInt(amountsOutSushiSwap1[1]) / BigInt(1e10);
    const priceSushiSwap_daiTOwbtc = BigInt(amountsOutSushiSwap2[1]);

    const arrayPrice = [
      priceQuickSwap_wbtcTOdai, priceQuickSwap_daiTOwbtc,
      priceSushiSwap_wbtcTOdai, priceSushiSwap_daiTOwbtc
    ];

    console.log(`price: ${amountsOutQuickSwap1}`);
    console.log(`price: ${amountsOutQuickSwap2}`);
    console.log(`price: ${amountsOutSushiSwap1}`);
    console.log(`price: ${amountsOutSushiSwap2}`);

    console.log(`price: ${priceQuickSwap_wbtcTOdai}`);
    console.log(`price: ${priceQuickSwap_daiTOwbtc}`);
    console.log(`price: ${priceSushiSwap_wbtcTOdai}`);
    console.log(`price: ${priceSushiSwap_daiTOwbtc}`);

    const normalizedPrices = arrayPrice.map(amounts => Number(ethers.formatUnits(amounts, 6)));
    const lowestPrice = Math.min(...normalizedPrices);
    const highestPrice = Math.max(...normalizedPrices);
    const profitMargin = (highestPrice - lowestPrice) / lowestPrice * 100;
    
    // Calculate which token and which exchange to use for buy and sell
    const firstSwapIndex = normalizedPrices.indexOf(lowestPrice);
    const secondSwapIndex = normalizedPrices.indexOf(highestPrice);
    const firstSwapToken = tokenAtIndex(firstSwapIndex, "WBTC_DAI");
    const secondSwapToken = tokenAtIndex(secondSwapIndex, "WBTC_DAI");
    const firstSwapDex = await exchangeAtIndex(firstSwapIndex);
    const secondSwapDex = await exchangeAtIndex(secondSwapIndex);
    const borrowToken = tokenToBorrow(firstSwapIndex, "WBTC_DAI"); 
    
    const firstSwapPath = firstSwapToken === 'WBTC_to_DAI' ? [wbtcAddress, daiAddress] : firstSwapToken === 'DAI_to_WBTC' ?  [daiAddress, wbtcAddress] : [];
    const secondSwapPath = (borrowToken === 'WBTC') ? [daiAddress, wbtcAddress] : [wbtcAddress, daiAddress];
    const firstDexRouter = firstSwapDex === 'QuickSwap' ? quickSwapAddress : firstSwapDex === 'SushiSwap' ? sushiSwapAddress : '';
    const secondDexRouter = secondSwapDex === 'QuickSwap' ? quickSwapAddress : secondSwapDex === 'SushiSwap' ? sushiSwapAddress : '';

    const addressTokenBorrow: string = (borrowToken === 'WBTC' ? wbtcAddress : borrowToken === 'DAI' ? daiAddress : '') as string;
    const decimals = borrowToken === 'WBTC' ? 8 : borrowToken === 'DAI' ? 18 : 0;
    const amountToBorrow = BigInt(ethers.parseUnits('10', decimals)); // 10 $

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "address[]", "address", "address"],
      [firstSwapPath, secondSwapPath, firstDexRouter, secondDexRouter]
    );

    console.log(" --- WBTC - DAI --- ");
    console.log(`Profit margin: ${profitMargin}%`);

    if (profitMargin > 0.75) {
      try {
        console.log("\x1b[32m%s\x1b[0m", '===============================================');
        console.log("\x1b[32m%s\x1b[0m", 'Arbitrage opportunity found!! Attempting to initiate flash loan...');
        console.log("\x1b[32m%s\x1b[0m", '===============================================');
        console.log(`Lowest swap ${firstSwapToken} at ${firstSwapDex}`);
        console.log(`Highest swap ${secondSwapToken} at ${secondSwapDex}`);
        console.log(`Lowest price: ${lowestPrice}`);
        console.log(`Highest price: ${highestPrice}`);
        const txResponse = await arbitrageContractWithSigner.requestFlashLoan(
          addressTokenBorrow,
          amountToBorrow,
          params,
        );
        console.log('Transaction sent:', txResponse.hash);
  
        // Waiting for the transaction to be mined
        const receipt = await txResponse.wait() as ContractTransactionReceipt ;
        console.log('Transaction confirmed:', receipt);
  
        const profitMade = (profitMargin * parseFloat(ethers.formatEther(amountToBorrow))) / 100;
        console.log(`Profit made: $${profitMade}`);
  
        // Now attempting to withdraw profits
        console.log('Attempting to withdraw profits...');
        const withdrawTxResponse = await arbitrageContractWithSigner.withdraw(addressTokenBorrow);  // tokenToWithdraw should be the address of the token you expect to have profits in
        const withdrawReceipt = await withdrawTxResponse.wait() as ContractTransactionReceipt ;
        console.log('Withdrawal confirmed:', withdrawReceipt);
      } catch (error: any) {
        // Log the error message from the Ethereum Virtual Machine (EVM)
        console.error('Flash loan failed:', error.message);
      }
    } else {
      console.log('Profit not sufficient to cover transaction fees');
    }
  } catch (error) {
    console.error('An error occurred', error);
  }
}

Pair4();

// setInterval(Pair3, 20000); // every 20 seconds

