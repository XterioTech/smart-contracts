const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

const deployMajorToken = async (wallet) => {
  const Token = await hre.ethers.getContractFactory("XterToken");
  const token = await Token.deploy(wallet);
  await token.deployed();
  return token;
};

const deployPresale = async (tokenAddr, price) => {
  const Presale = await hre.ethers.getContractFactory("Presale");
  const presale = await Presale.deploy(tokenAddr, price);
  await presale.deployed();
  return presale;
};

const deployVesting = async (
  managerAddr,
  tokenAddr,
  startTime,
  stages,
  unlockProportions
) => {
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy(
    managerAddr,
    tokenAddr,
    startTime,
    stages,
    unlockProportions
  );
  await vesting.deployed();
  return vesting;
};

const deployElection = async (ticketAddress, xterAddress) => {
  const NFTElection = await hre.ethers.getContractFactory("NFTElection");
  const vote = await hre.upgrades.deployProxy(NFTElection, [
    ticketAddress,
    xterAddress,
  ]);
  await vote.deployed();

  return vote;
};

const deployGatewayAndFactories = async (gatewayAdmin) => {
  let gateway, nftfactory, erc20factory;

  let libDeployBasicERC721, libDeployBasicERC1155;

  // Deploy Gateway contract.
  const Gateway = await hre.ethers.getContractFactory("TokenGateway");
  gateway = await hre.upgrades.deployProxy(Gateway, [gatewayAdmin.address]);
  await gateway.deployed();

  // Deploy libraries for NFTFactory
  const LibDeployBasicERC721 = await hre.ethers.getContractFactory(
    "LibDeployBasicERC721"
  );
  libDeployBasicERC721 = await LibDeployBasicERC721.deploy();
  await libDeployBasicERC721.deployed();

  const LibDeployBasicERC1155 = await hre.ethers.getContractFactory(
    "LibDeployBasicERC1155"
  );
  libDeployBasicERC1155 = await LibDeployBasicERC1155.deploy();
  await libDeployBasicERC1155.deployed();

  // Deploy NFTFactory contract using gateway address.
  const NFTFactory = await hre.ethers.getContractFactory("NFTFactory", {
    libraries: {
      LibDeployBasicERC721: libDeployBasicERC721.address,
      LibDeployBasicERC1155: libDeployBasicERC1155.address,
    },
  });
  nftfactory = await NFTFactory.deploy(gateway.address);
  await nftfactory.deployed();

  // Deploy FTFactory contract using gateway address.
  const ERC20Factory = await hre.ethers.getContractFactory("ERC20Factory");
  erc20factory = await ERC20Factory.deploy(gateway.address);
  await erc20factory.deployed();

  // Register factory address in the gateway contract.
  await gateway.connect(gatewayAdmin).addManager(nftfactory.address);
  await gateway.connect(gatewayAdmin).addManager(erc20factory.address);

  const gatewayImpl = await getImplementationAddress(
    hre.ethers.provider,
    gateway.address
  );
  return {
    gateway,
    nftfactory,
    erc20factory,
    gatewayImpl,
    libDeployBasicERC721,
    libDeployBasicERC1155,
  };
};

const deployFactoriesWithOriginTokenGateway = async (gatewayAdmin) => {
  const gateway = await hre.ethers.getContractAt(
    "TokenGateway",
    hre.addrs.tokenGateway
  );

  console.log("OriginTokenGateway address =", gateway.address);

  let nftfactory, erc20factory, libDeployBasicERC721, libDeployBasicERC1155;
  // Deploy libraries for NFTFactory
  const LibDeployBasicERC721 = await hre.ethers.getContractFactory(
    "LibDeployBasicERC721"
  );
  libDeployBasicERC721 = await LibDeployBasicERC721.deploy();
  await libDeployBasicERC721.deployed();

  const LibDeployBasicERC1155 = await hre.ethers.getContractFactory(
    "LibDeployBasicERC1155"
  );
  libDeployBasicERC1155 = await LibDeployBasicERC1155.deploy();
  await libDeployBasicERC1155.deployed();

  // Deploy NFTFactory contract using gateway address.
  const NFTFactory = await hre.ethers.getContractFactory("NFTFactory", {
    libraries: {
      LibDeployBasicERC721: libDeployBasicERC721.address,
      LibDeployBasicERC1155: libDeployBasicERC1155.address,
    },
  });
  nftfactory = await NFTFactory.deploy(gateway.address);
  await nftfactory.deployed();

  // Deploy FTFactory contract using gateway address.
  const ERC20Factory = await hre.ethers.getContractFactory("ERC20Factory");
  erc20factory = await ERC20Factory.deploy(gateway.address);
  await erc20factory.deployed();

  // Register factory address in the gateway contract.
  await gateway.connect(gatewayAdmin).addManager(nftfactory.address);
  await gateway.connect(gatewayAdmin).addManager(erc20factory.address);

  return {
    nftfactory,
    erc20factory,
    libDeployBasicERC721,
    libDeployBasicERC1155,
  };
};

const deployDividend = async (xterAddress, tokenAddress, periodStartTime) => {
  const Dividend = await hre.ethers.getContractFactory("Dividend");
  const dividend = await Dividend.deploy(
    xterAddress,
    tokenAddress,
    periodStartTime
  );
  await dividend.deployed();
  return dividend;
};

const deployXterTicket = async (xterAddress) => {
  const Ticket = await hre.ethers.getContractFactory("XterTicket");
  const ticket = await hre.upgrades.deployProxy(Ticket, [xterAddress]);
  await ticket.deployed();
  return ticket;
};

const deployPPNLocker = async (
  manager,
  ppnAddress,
  periodStartTime,
  unlockQuantity
) => {
  const PPNLocker = await hre.ethers.getContractFactory("PPNLocker");
  const ppnLocker = await PPNLocker.deploy(
    manager,
    ppnAddress,
    periodStartTime,
    unlockQuantity
  );
  await ppnLocker.deployed();
  return ppnLocker;
};

const deploySimpleLootBoxRegistry = async (gatewayAddress) => {
  const LootBox = await hre.ethers.getContractFactory("SimpleLootBoxRegistry");
  const lootBox = await LootBox.deploy(gatewayAddress);
  await lootBox.deployed();
  return lootBox;
};

const deployLootboxUnwrapper = async (gatewayAddress) => {
  const Lootbox = await hre.ethers.getContractFactory("LootboxUnwrapper");
  const lootbox = await Lootbox.deploy(gatewayAddress);
  await lootbox.deployed();
  return lootbox;
};

const deployWhitelistMinter = async (gatewayAddress) => {
  const WhitelistMinter = await hre.ethers.getContractFactory(
    "WhitelistMinter"
  );
  const whitelistMinter = await WhitelistMinter.deploy(gatewayAddress);
  await whitelistMinter.deployed();
  return whitelistMinter;
};

const deploySplitter = async (xterAddress, splitAddress, splitProportion) => {
  const Splitter = await hre.ethers.getContractFactory("Splitter");
  const splitter = await Splitter.deploy(
    xterAddress,
    splitAddress,
    splitProportion
  );
  await splitter.deployed();
  return splitter;
};

const deployFilter = async (xterAddress, outputAddress, alpha) => {
  const Filter = await hre.ethers.getContractFactory("Filter");
  const filter = await Filter.deploy(xterAddress, outputAddress, alpha);
  await filter.deployed();
  return filter;
};

const deployMarketplace = async (tokenAddr, serviceFeeRecipient) => {
  // Deploy the marketplace contract.
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await hre.upgrades.deployProxy(Marketplace, []);
  await marketplace.deployed();

  // Initialize the marketplace contract.
  await marketplace.addPaymentTokens([tokenAddr]);
  await marketplace.setServiceFeeRecipient(serviceFeeRecipient);

  const marketplaceImpl = await getImplementationAddress(
    hre.ethers.provider,
    marketplace.address
  );

  return [marketplace, marketplaceImpl];
};

const deployMarketplaceV2 = async (tokenAddr, serviceFeeRecipient) => {
  // Deploy the marketplace contract.
  const Marketplace = await hre.ethers.getContractFactory("MarketplaceV2");
  const marketplace = await hre.upgrades.deployProxy(Marketplace, []);
  await marketplace.deployed();

  // Initialize the marketplace contract.
  await marketplace.addPaymentTokens([tokenAddr]);
  await marketplace.setServiceFeeRecipient(serviceFeeRecipient);

  const marketplaceImpl = await getImplementationAddress(
    hre.ethers.provider,
    marketplace.address
  );

  return [marketplace, marketplaceImpl];
};

const deployXterTicketBridge = async (
  xtertAddress,
  wormholeAddress,
  verifierAddress
) => {
  const TicketBridge = await hre.ethers.getContractFactory(
    "TicketBridgeWormhole"
  );
  const xtertBridge = await TicketBridge.deploy(
    xtertAddress,
    wormholeAddress,
    verifierAddress
  );
  await xtertBridge.deployed();
  return xtertBridge;
};

const deployFaucet = async (xterAddress) => {
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy(xterAddress);
  await faucet.deployed();
  return faucet;
};

const deployBadge = async (name, symbol, baseURI, _admin) => {
  const Badge = await hre.ethers.getContractFactory("Badge");
  const badge = await Badge.deploy(name, symbol, baseURI, _admin);
  await badge.deployed();
  return badge;
};

const deployRedeemChecker = async (badgeAddress, minbadgeAmt) => {
  const RedeemChecker = await hre.ethers.getContractFactory("RedeemChecker");
  const redeemChecker = await RedeemChecker.deploy(badgeAddress, minbadgeAmt);
  await redeemChecker.deployed();
  return redeemChecker;
};

const deployXSoul = async (
  name,
  symbol,
  baseURI,
  _redeemCheckerAddress,
  _admin
) => {
  const XSoul = await hre.ethers.getContractFactory("XSoul");
  const xsoul = await XSoul.deploy(
    name,
    symbol,
    baseURI,
    _redeemCheckerAddress,
    _admin
  );
  await xsoul.deployed();
  return xsoul;
};

module.exports = {
  deployMajorToken,
  deployPresale,
  deployVesting,
  deployGatewayAndFactories,
  deployFactoriesWithOriginTokenGateway,
  deployXterTicket,
  deployElection,
  deployDividend,
  deployPPNLocker,
  deploySimpleLootBoxRegistry,
  deployLootboxUnwrapper,
  deployWhitelistMinter,
  deploySplitter,
  deployFilter,
  deployMarketplace,
  deployMarketplaceV2,
  deployXterTicketBridge,
  deployFaucet,
  deployBadge,
  deployRedeemChecker,
  deployXSoul,
};
