const hre = require("hardhat");
const { multisigWalletAddr } = require('./params');

const main = async () => {
    await hre.run("verify:verify", {
        address: hre.addrs.token,
        constructorArguments: [
            multisigWalletAddr()
        ],
        contract: "contracts/XterToken.sol:XterToken"
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
