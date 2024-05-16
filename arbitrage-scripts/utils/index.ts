import { ethers, ContractTransactionReceipt } from 'ethers';
import { FlashLoan__factory } from "../../typechain-types";
import dotenv from 'dotenv';
dotenv.config();

export const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_INFURA_ENDPOINT);
export const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
export const signer = wallet.connect(provider);
export const flashLoanArbitrageAddress = '0x749bE2E6956f82760D21dB93a2371408Ab754229';
export const arbitrageContractWithSigner = FlashLoan__factory.connect(flashLoanArbitrageAddress, signer);

export const quickSwapAddress = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';
export const sushiSwapAddress = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';

export const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
export const daiAddress = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063';
const aa = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
export const wbtcAddress = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6';

export const getAmountsOutAbi = [{
    "constant": true,
    "inputs": [
        {
            "name": "amountIn",
            "type": "uint256"
        },
        {
            "name": "path",
            "type": "address[]"
        }
    ],
    "name": "getAmountsOut",
    "outputs": [
        {
            "name": "amounts",
            "type": "uint256[]"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}];

export const quickSwapContractWithGetAmountsOut = new ethers.Contract(quickSwapAddress, getAmountsOutAbi, provider);
export const sushiSwapContractWithGetAmountsOut = new ethers.Contract(sushiSwapAddress, getAmountsOutAbi, provider);

export async function exchangeAtIndex(index: any) {
    return index < 2 ? 'QuickSwap' : 'SushiSwap';
};

const tokenPairs = {
  "USDT_USDC": ['USDC_to_USDT', 'USDT_to_USDC'],
  "USDC_DAI": ['USDC_to_DAI', 'DAI_to_USDC'],
  "DAI_USDT": ['USDT_to_DAI', 'DAI_to_USDT'],
  "WBTC_DAI": ['WBTC_to_DAI', 'DAI_to_WBTC']
};

const borrowTokens = {
  "USDT_USDC": ['USDC', 'USDT'],
  "USDC_DAI": ['USDC', 'DAI'],
  "DAI_USDT": ['USDT', 'DAI'],
  "WBTC_DAI": ['WBTC', 'DAI']
};

export function tokenAtIndex(index: number, pairKey: keyof typeof tokenPairs): string {
  const pairs = tokenPairs[pairKey];
  if (!pairs) throw new Error('Invalid pair key');
  return pairs[index % pairs.length];
}

export function tokenToBorrow(index: number, pairKey: keyof typeof borrowTokens): string {
  const tokens = borrowTokens[pairKey];
  if (!tokens) throw new Error('Invalid pair key');
  return tokens[index % tokens.length];
}


async function setupTokenAllowances() {

  const maxAllowance = ethers.MaxUint256;

  await arbitrageContractWithSigner.approveTokenToDEX(usdcAddress, quickSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(usdcAddress, sushiSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(usdtAddress, quickSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(usdtAddress, sushiSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(daiAddress, quickSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(daiAddress, sushiSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(aa, quickSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(aa, sushiSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(wbtcAddress, quickSwapAddress, maxAllowance);
  await arbitrageContractWithSigner.approveTokenToDEX(wbtcAddress, sushiSwapAddress, maxAllowance);
}

async function checkTokenAllowance(tokenAddress: any, dexRouterAddress: any, decimals: any) {
  const allowance = await arbitrageContractWithSigner.tokenAllowanceOnDEX(tokenAddress, dexRouterAddress);
  return ethers.formatUnits(allowance, decimals);
}

async function displayTokenAllowances() {
  console.log(`USDC Allowance on QuickSwap: ${await checkTokenAllowance(usdcAddress, quickSwapAddress, 6)}`);
  console.log(`USDC Allowance on SushiSwap: ${await checkTokenAllowance(usdcAddress, sushiSwapAddress, 6)}`);
  console.log(`USDT Allowance on QuickSwap: ${await checkTokenAllowance(usdtAddress, quickSwapAddress, 6)}`);
  console.log(`USDT Allowance on SushiSwap: ${await checkTokenAllowance(usdtAddress, sushiSwapAddress, 6)}`);
  console.log(`DAI Allowance on QuickSwap: ${await checkTokenAllowance(daiAddress, quickSwapAddress, 18)}`);
  console.log(`DAI Allowance on SushiSwap: ${await checkTokenAllowance(daiAddress, sushiSwapAddress, 18)}`);
  console.log(`USDC Allowance on QuickSwap: ${await checkTokenAllowance(aa, quickSwapAddress, 6)}`);
  console.log(`USDC Allowance on SushiSwap: ${await checkTokenAllowance(aa, sushiSwapAddress, 6)}`);
  console.log(`WBTC Allowance on QuickSwap: ${await checkTokenAllowance(wbtcAddress, quickSwapAddress, 8)}`);
  console.log(`WBTC Allowance on SushiSwap: ${await checkTokenAllowance(wbtcAddress, sushiSwapAddress, 8)}`);
}

// setupTokenAllowances();
// displayTokenAllowances();






// async function setupTokenAllowances() {
//   // const requiredAllowance18 = ethers.parseUnits('10000000', 18); // Assuming you want to approve 1000 tokens
//   // const requiredAllowance6 = ethers.parseUnits('10000000', 6); // Assuming you want to approve 1000 tokens

//   const maxAllowance = ethers.MaxUint256;

//   try {
//     await arbitrageContractWithSigner.approveTokenToDEX(usdcAddress, quickSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(usdcAddress, sushiSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(usdtAddress, quickSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(usdtAddress, sushiSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(daiAddress, quickSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(daiAddress, sushiSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(aa, quickSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(aa, sushiSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(wbtcAddress, quickSwapAddress, maxAllowance);
//     await arbitrageContractWithSigner.approveTokenToDEX(wbtcAddress, sushiSwapAddress, maxAllowance);
//   } catch (error) {
//     console.error("Failed to set allowance:", error);
//   }
// }