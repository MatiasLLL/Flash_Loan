import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FlashLoanModule = buildModule("FlashLoanModule", (m) => {
  const flashLoan = m.contract("FlashLoan", ["0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"]); // 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb 0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A

  return { flashLoan };
});

export default FlashLoanModule;

// Example post-deployment call (if needed)
// m.call(flashLoanArbitrage, "someInitializationFunction", [arg1, arg2]);
