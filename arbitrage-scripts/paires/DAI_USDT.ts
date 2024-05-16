import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, provider, quickSwapAddress, sushiSwapAddress, usdtAddress, daiAddress, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut, exchangeAtIndex, tokenAtIndex, tokenToBorrow } from '../utils';
// import { TransactionReceipt } from '@ethersproject/providers';

export async function Pair3() {
  const amountIn = ethers.parseUnits('1', 6);
  const amountInDAI = ethers.parseUnits('1', 18);

  try {
    // Get amount QuickSwap
    const amountsOutQuickSwap1 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdtAddress, daiAddress]);
    const amountsOutQuickSwap2 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountInDAI, [daiAddress, usdtAddress]);
    // Get amount SushiSwap
    const amountsOutSushiSwap1 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdtAddress, daiAddress]);
    const amountsOutSushiSwap2 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountInDAI, [daiAddress, usdtAddress]);
    // Get price QuickSwap
    const priceQuickSwap_usdtTOdai = BigInt(amountsOutQuickSwap1[1]) / BigInt(1e12);
    const priceQuickSwap_daiTOusdt = BigInt(amountsOutQuickSwap2[1]);
    // Get price SushiSwap
    const priceSushiSwap_usdtTOdai = BigInt(amountsOutSushiSwap1[1]) / BigInt(1e12);
    const priceSushiSwap_daiTOusdt = BigInt(amountsOutSushiSwap2[1]);

    const arrayPrice = [
      priceQuickSwap_usdtTOdai, priceQuickSwap_daiTOusdt,
      priceSushiSwap_usdtTOdai, priceSushiSwap_daiTOusdt
    ];

    const normalizedPrices = arrayPrice.map(amounts => Number(ethers.formatUnits(amounts, 6)));
    const lowestPrice = Math.min(...normalizedPrices);
    const highestPrice = Math.max(...normalizedPrices);
    const profitMargin = (highestPrice - lowestPrice) / lowestPrice * 100;
    
    // Calculate which token and which exchange to use for buy and sell
    const firstSwapIndex = normalizedPrices.indexOf(lowestPrice);
    const secondSwapIndex = normalizedPrices.indexOf(highestPrice);
    const firstSwapToken = tokenAtIndex(firstSwapIndex, "DAI_USDT");
    const secondSwapToken = tokenAtIndex(secondSwapIndex, "DAI_USDT");
    const firstSwapDex = await exchangeAtIndex(firstSwapIndex);
    const secondSwapDex = await exchangeAtIndex(secondSwapIndex);
    const borrowToken = tokenToBorrow(firstSwapIndex, "DAI_USDT"); 
    
    const firstSwapPath = firstSwapToken === 'USDT_to_DAI' ? [usdtAddress, daiAddress] : firstSwapToken === 'DAI_to_USDT' ?  [daiAddress, usdtAddress] : [];
    const secondSwapPath = (borrowToken === 'USDT') ? [daiAddress, usdtAddress] : [usdtAddress, daiAddress];
    const firstDexRouter = firstSwapDex === 'QuickSwap' ? quickSwapAddress : firstSwapDex === 'SushiSwap' ? sushiSwapAddress : '';
    const secondDexRouter = secondSwapDex === 'QuickSwap' ? quickSwapAddress : secondSwapDex === 'SushiSwap' ? sushiSwapAddress : '';

    const addressTokenBorrow: string = (borrowToken === 'USDT' ? usdtAddress : borrowToken === 'DAI' ? daiAddress : '') as string;
    const decimals = borrowToken === 'USDT' ? 6 : borrowToken === 'DAI' ? 18 : 0;
    const amountToBorrow = BigInt(ethers.parseUnits('10', decimals)); // 10 $

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "address[]", "address", "address"],
      [firstSwapPath, secondSwapPath, firstDexRouter, secondDexRouter]
    );

    console.log(" --- DAI - USDT --- ");
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

        // const txValue = await arbitrageContractWithSigner.DebugInfo()
        // const receiptValue = await txValue.wait() as ContractTransactionReceipt ;
        // console.log('Transaction confirmed:', receiptValue);

        const txResponse = await arbitrageContractWithSigner.requestFlashLoan(
          addressTokenBorrow,
          amountToBorrow,
          params,
        );
        console.log('Transaction sent:', txResponse.hash);

  
        // Waiting for the transaction to be mined
        const receipt = await txResponse.wait() as ContractTransactionReceipt ;
        console.log('Transaction confirmed:', receipt);

        // Listening for the DebugInfo event after transaction confirmation
        // receipt.events?.filter((x) => x.event === 'DebugInfo').forEach((event) => {
        //   console.log('Debug Info:', event.args);
        // });
  
        const profitMade = (profitMargin * parseFloat(ethers.formatEther(amountToBorrow))) / 100;
        console.log(`Profit made: $${profitMade}`);
  
        // Now attempting to withdraw profits
        console.log('Attempting to withdraw profits...');
        const withdrawTxResponse = await arbitrageContractWithSigner.withdraw(addressTokenBorrow);  // tokenToWithdraw should be the address of the token you expect to have profits in
        const withdrawReceipt = await withdrawTxResponse.wait() as ContractTransactionReceipt ;
        console.log('Withdrawal confirmed:', withdrawReceipt);
      } catch (error: any) {
        console.error('Flash loan failed:', error.message);
        if (error.transactionHash) {
          console.log('Fetching transaction receipt for more details...');
          try {
            const txReceipt = await provider.getTransactionReceipt(error.transactionHash);
            // Check if the transaction receipt is not null before proceeding
            if (txReceipt) {
              const debugInfoEvents = txReceipt.logs
                .map(log => {
                  try {
                    return arbitrageContractWithSigner.interface.parseLog(log);
                  } catch (e) {
                    return null; // Ignore logs that cannot be parsed
                  }
                })
                .filter((parsedLog): parsedLog is ethers.LogDescription => parsedLog !== null && parsedLog.name === 'DebugInfo');
      
              debugInfoEvents.forEach(parsedLog => {
                console.log(`Debug Info from failed transaction: Asset: ${parsedLog.args.asset}, Total Repayment: ${parsedLog.args.totalRepayment}, Second Received: ${parsedLog.args.secondReceived}`);
              });
            } else {
              console.error('Transaction receipt not found');
            }
          } catch (e) {
            console.error('Error fetching transaction receipt:', e);
          }
        }
      }
    } else {
      // console.log('Profit not sufficient to cover transaction fees');
    }
  } catch (error) {
    console.error('An error occurred', error);
  }
}

// Pair3();

// setInterval(Pair3, 20000); // every 20 seconds



// const secondSwapPath  = firstSwapPath === [usdtAddress, daiAddress] ? [daiAddress, usdtAddress] : secondSwapToken === [daiAddress, usdtAddress] ?  [usdtAddress, daiAddress] : [];
// const firstSwapPath = (firstSwapToken === 'USDT_to_DAI') ? [usdtAddress, daiAddress] : [daiAddress, usdtAddress];
    

// // console.log(arrayPrice);
// // console.log(`Lowest swap ${firstSwapToken} at ${firstSwapDex}`);
// // console.log(`Highest swap ${secondSwapToken} at ${secondSwapDex}`);
// // console.log(`Lowest price: ${lowestPrice}`);
// // console.log(`Highest price: ${highestPrice}`);
// console.log(" --- DAI - USDT --- ");
// console.log(`Profit margin: ${profitMargin}%`);
// // console.log(addressTokenBorrow);
// // console.log(borrowToken);
// // console.log(amountToBorrow);

