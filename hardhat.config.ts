import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";
// import "@nomicfoundation/hardhat-ignition/modules";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import '@typechain/hardhat';
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24", // any version you want
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      },
    },
  },
  networks: {
    test: {
      url: process.env.POLYGON_AMOY_INFURA_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY || ""]
    },
    mainnet: {
      url: process.env.POLYGON_MAINNET_INFURA_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY || ""],
      gas: "auto", // Hardhat tries to automatically estimate gas required
      gasPrice: "auto", // Automatically set gas price
      // gasPrice: 50000000000,
      gasMultiplier: 2 // Increase gas estimate to ensure transactions are not dropped
    },
  },
};

export default config;



// etherscan: {
//   // Your API key for Etherscan
//   // Obtain one at https://etherscan.io/
//   apiKey: process.env. // API_KEY_...

// },
// sourcify: {
//   // Disabled by default
//   // Doesn't need an API key
//   enabled: true
// }

