const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core")

const deployMajorToken = async (wallet) => {
  const Token = await hre.ethers.getContractFactory("PlayverseToken");
  const token = await Token.deploy(wallet);
  await token.deployed();
  return token;
}

const deployPresale = async (tokenAddr, price) => {
  const Presale = await hre.ethers.getContractFactory("PresaleContract");
  const presale = await Presale.deploy(tokenAddr, price);
  await presale.deployed();
  return presale;
}

const deployVesting = async (
  managerAddr,
  tokenAddr,
  startTime,
  stages,
  unlockProportions
) => {
  const VestingContract = await hre.ethers.getContractFactory(
    "VestingContract"
  );
  vesting = await VestingContract.deploy(
    managerAddr,
    tokenAddr,
    startTime,
    stages,
    unlockProportions
  );
  await vesting.deployed();
  return vesting;
};

module.exports = {
  deployMajorToken,
  deployPresale,
  deployVesting
};