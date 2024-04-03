import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FlashLoanArbitrageModule = buildModule("FlashLoanArbitrageModule", (m) => {
  const flashLoanArbitrage = m.contract("FlashLoanArbitrage", ["0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"]);

  return { flashLoanArbitrage };
});

export default FlashLoanArbitrageModule;

// Example post-deployment call (if needed)
// m.call(flashLoanArbitrage, "someInitializationFunction", [arg1, arg2]);
