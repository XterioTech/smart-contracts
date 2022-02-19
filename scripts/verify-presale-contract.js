const hre = require("hardhat");
const { presalePrice } = require('./params');

const main = async () => {
    await hre.run("verify:verify", {
        address: hre.addrs.presale,
        constructorArguments: [
            hre.addrs.token,
            presalePrice()
        ],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
