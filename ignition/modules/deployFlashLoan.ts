import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FlashLoanModule = buildModule("FlashLoanModule", (m) => {
  const flashLoan = m.contract("FlashLoan", ["0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"]);

  return { flashLoan };
});

export default FlashLoanModule;

// m.call(flashLoan, "balanceOf", ['0x']);   flashLoan.address
