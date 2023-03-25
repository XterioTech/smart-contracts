const hre = require("hardhat");
const {
  hexZeroPad,
  keccak256,
  getCreate2Address,
  AbiCoder,
  hexlify,
  hexConcat,
} = require("ethers/lib/utils");

const calculateCreate2AddressBasicERC721 = async (
  from,
  deployeeName,
  owner,
  tokenName,
  tokenSymbol,
  baseURI,
  subscriptionOrRegistrantToCopy,
  subscribe,
  gatewayAddress,
  salt
) => {
  const deployee = await hre.ethers.getContractFactory(deployeeName);
  const saltHexPadded = hexZeroPad(salt, 32);
  const initCode = hexConcat([
    hexlify(deployee.bytecode),
    hexlify(
      new AbiCoder().encode(
        ["address", "string", "string", "string", "address", "bool", "address"],
        [owner, tokenName, tokenSymbol, baseURI, subscriptionOrRegistrantToCopy, subscribe, gatewayAddress]
      )
    ),
  ]);
  const initCodeHash = keccak256(initCode);
  const calculatedAddress = getCreate2Address(
    from,
    saltHexPadded,
    initCodeHash
  );
  return calculatedAddress;
};

const calculateCreate2AddressBasicERC1155 = async (
  from,
  deployeeName,
  owner,
  uri,
  subscriptionOrRegistrantToCopy,
  subscribe,
  gatewayAddress,
  salt
) => {
  const deployee = await hre.ethers.getContractFactory(deployeeName);
  const saltHexPadded = hexZeroPad(salt, 32);
  const initCode = hexConcat([
    hexlify(deployee.bytecode),
    hexlify(
      new AbiCoder().encode(
        ["address", "string", "address", "bool", "address"],
        [owner, uri, subscriptionOrRegistrantToCopy, subscribe, gatewayAddress]
      )
    ),
  ]);
  const initCodeHash = keccak256(initCode);
  const calculatedAddress = getCreate2Address(
    from,
    saltHexPadded,
    initCodeHash
  );
  return calculatedAddress;
};

const calculateCreate2AddressBasicERC20 = async (
  from,
  deployeeName,
  tokenName,
  tokenSymbol,
  decimals,
  gatewayAddress,
  salt
) => {
  const deployee = await hre.ethers.getContractFactory(deployeeName);
  const saltHexPadded = hexZeroPad(salt, 32);
  let initCode;

  initCode = hexConcat([
    hexlify(deployee.bytecode),
    hexlify(
      new AbiCoder().encode(
        ["string", "string", "uint8", "address"],
        [tokenName, tokenSymbol, decimals, gatewayAddress]
      )
    ),
  ]);

  const initCodeHash = keccak256(initCode);
  const calculatedAddress = getCreate2Address(
    from,
    saltHexPadded,
    initCodeHash
  );
  return calculatedAddress;
};

const calculateCreate2AddressBasicERC20Capped = async (
  from,
  deployeeName,
  tokenName,
  tokenSymbol,
  decimals,
  cap,
  gatewayAddress,
  salt
) => {
  const deployee = await hre.ethers.getContractFactory(deployeeName);
  const saltHexPadded = hexZeroPad(salt, 32);
  let initCode;
  initCode = hexConcat([
    hexlify(deployee.bytecode),
    hexlify(
      new AbiCoder().encode(
        ["string", "string", "uint8", "uint256", "address"],
        [tokenName, tokenSymbol, decimals, cap, gatewayAddress]
      )
    ),
  ]);
  const initCodeHash = keccak256(initCode);
  const calculatedAddress = getCreate2Address(
    from,
    saltHexPadded,
    initCodeHash
  );
  return calculatedAddress;
};

module.exports = {
  calculateCreate2AddressBasicERC721,
  calculateCreate2AddressBasicERC1155,
  calculateCreate2AddressBasicERC20,
  calculateCreate2AddressBasicERC20Capped,
};
