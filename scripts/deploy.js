const hre = require("hardhat");

async function main() {
  console.log("Deploying RoscaCredit to Arc Mainnet...");

  const RoscaCredit = await hre.ethers.getContractFactory("RoscaCredit");
  const rosca = await RoscaCredit.deploy();
  await rosca.waitForDeployment();

  const address = await rosca.getAddress();
  console.log("RoscaCredit deployed to:", address);
  console.log("Explorer:", `https://explorer.arc.io/address/${address}`);
  console.log("\nSave this address into frontend/.env.local as NEXT_PUBLIC_ROSCA_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
