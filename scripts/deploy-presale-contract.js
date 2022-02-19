const hre = require("hardhat");
const prompt = require("prompt");

const { deployPresale } = require('../lib/deploy');
const { presalePrice, presaleAllowedStableCoins } = require('./params');

const main = async () => {
    const priceDenominator = 10000;
    const price = presalePrice();
    const stableCoins = presaleAllowedStableCoins();
    console.info("Network: " + hre.network.name);
    console.info("Deploy presale with token: " + hre.addrs.token);
    console.info("Allowed stable coins: " + stableCoins);
    console.info(`Token Price: 1 TK = ${price / priceDenominator} USD`);
    const { confirm } = await prompt.get([{ name: "confirm", description: "Confirm? (y/N)" }]);
    if (confirm === 'y' || confirm === 'Y') {
        presale = await deployPresale(hre.addrs.token, price);
        console.info("Presale Contract Deployed: " + presale.address);
        if (stableCoins.length > 0) {
            console.info("Adding allowed stable coins");
            await presale.addStableCoins(stableCoins);
            console.info("Done.")
        }
    } else {
        console.error("Not confirmed, abort!");
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
