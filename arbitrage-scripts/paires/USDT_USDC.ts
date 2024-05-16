import { ethers, ContractTransactionReceipt } from 'ethers';
import { arbitrageContractWithSigner, provider, quickSwapAddress, sushiSwapAddress, usdcAddress, usdtAddress, quickSwapContractWithGetAmountsOut, sushiSwapContractWithGetAmountsOut, exchangeAtIndex, tokenAtIndex, tokenToBorrow } from '../utils';

export async function Pair2() {
  const amountIn = ethers.parseUnits('1', 6);
  try {
    // Get amount QuickSwap
    const amountsOutQuickSwap1 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdcAddress, usdtAddress]);
    const amountsOutQuickSwap2 = await quickSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdtAddress, usdcAddress]);
    // Get amount SushiSwap
    const amountsOutSushiSwap1 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdcAddress, usdtAddress]);
    const amountsOutSushiSwap2 = await sushiSwapContractWithGetAmountsOut.getAmountsOut(amountIn, [usdtAddress, usdcAddress]);
    // Get price QuickSwap
    const priceQuickSwap_usdcTOusdt = BigInt(amountsOutQuickSwap1[1]);
    const priceQuickSwap_usdtTOusdc = BigInt(amountsOutQuickSwap2[1]);
    // Get price SushiSwap
    const priceSushiSwap_usdcTOusdt = BigInt(amountsOutSushiSwap1[1]);
    const priceSushiSwap_usdtTOusdc = BigInt(amountsOutSushiSwap2[1]);

    const arrayPrice = [
        priceQuickSwap_usdcTOusdt, priceQuickSwap_usdtTOusdc,
        priceSushiSwap_usdcTOusdt, priceSushiSwap_usdtTOusdc
    ];

    const normalizedPrices = arrayPrice.map(amounts => Number(ethers.formatUnits(amounts, 6)));
    const lowestPrice = Math.min(...normalizedPrices);
    const highestPrice = Math.max(...normalizedPrices);
    const profitMargin = (highestPrice - lowestPrice) / lowestPrice * 100;
    
    // Calculate which token and which exchange to use for buy and sell
    const firstSwapIndex = normalizedPrices.indexOf(lowestPrice);
    const secondSwapIndex = normalizedPrices.indexOf(highestPrice);
    const firstSwapToken = tokenAtIndex(firstSwapIndex, "USDT_USDC");
    const secondSwapToken = tokenAtIndex(secondSwapIndex, "USDT_USDC");
    const firstSwapDex = await exchangeAtIndex(firstSwapIndex);
    const secondSwapDex = await exchangeAtIndex(secondSwapIndex);
    const borrowToken = tokenToBorrow(firstSwapIndex, "USDT_USDC"); 
    
    const firstSwapPath = firstSwapToken === 'USDC_to_USDT' ? [usdcAddress, usdtAddress] : firstSwapToken === 'USDT_to_USDC' ?  [usdtAddress, usdcAddress] : [];
    const secondSwapPath = (borrowToken === 'USDC') ? [usdtAddress, usdcAddress] : [usdcAddress, usdtAddress];
    const firstDexRouter = firstSwapDex === 'QuickSwap' ? quickSwapAddress : firstSwapDex === 'SushiSwap' ? sushiSwapAddress : '';
    const secondDexRouter = secondSwapDex === 'QuickSwap' ? quickSwapAddress : secondSwapDex === 'SushiSwap' ? sushiSwapAddress : '';

    const addressTokenBorrow: string = (borrowToken === 'USDC' ? usdcAddress : borrowToken === 'USDT' ? usdtAddress : '') as string; // Cast as string to ensure type correctness.
    const amountToBorrow = BigInt(ethers.parseUnits('10', 6)); // 10 $

    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "address[]", "address", "address"],
      [firstSwapPath, secondSwapPath, firstDexRouter, secondDexRouter]
    );
    
    console.log(" --- USDT - USDC --- ");
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

// Pair2();

// setInterval(Pair2, 20000); // every 20 seconds


// // const secondSwapPath = secondSwapToken === 'USDC_to_USDT' ? [usdcAddress, usdtAddress] : secondSwapToken === 'USDT_to_USDC' ?  [usdtAddress, usdcAddress] : [];
// // const firstSwapPath = (firstSwapToken === 'USDC_to_USDT') ? [usdcAddress, usdtAddress] : [usdtAddress, usdcAddress];


// // console.log(arrayPrice);
// // console.log(`Lowest swap ${firstSwapToken} at ${firstSwapDex}`);
// // console.log(`Highest swap ${secondSwapToken} at ${secondSwapDex}`);
// // console.log(`Lowest price: ${lowestPrice}`);
// // console.log(`Highest price: ${highestPrice}`);
// console.log(" --- USDT - USDC --- ");
// console.log(`Profit margin: ${profitMargin}%`);
// // console.log(addressTokenBorrow);
// // console.log(borrowToken);
// // console.log(amountToBorrow);

