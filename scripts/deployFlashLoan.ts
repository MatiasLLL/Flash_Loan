import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    const flashLoan = await ethers.deployContract("FlashLoan", ["0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"]);
    await flashLoan.waitForDeployment();
    console.log("Flash Loan address:", await flashLoan.getAddress());

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});