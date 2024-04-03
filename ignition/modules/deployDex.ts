import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DexModule = buildModule("DexModule", (m) => {
  const dex = m.contract("Dex", []);

  return { dex };
});

export default DexModule;

// Example post-deployment call (if needed)
// m.call(dex, "someFunction", [arg1, arg2]);
