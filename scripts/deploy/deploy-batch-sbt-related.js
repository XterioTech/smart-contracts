
const hre = require("hardhat");
const prompt = require("prompt");

const {
    deployBadge,
    deployRedeemChecker,
    deployXSoul,
} = require("../../lib/deploy");
const { colorize } = require('../../lib/utils.js');

const main = async () => {
    const [admin] = await hre.ethers.getSigners();

    let skipVerify = process.env.skipVerify || false;


    const promptVerify = skipVerify ? "" : "and verify";
    const promptString2 = `Deploy ${promptVerify} all sbt-related contracts`

    console.info(colorize("yellow", `Network: ${hre.network.name}, Deployer: ${admin.address}`));
    console.info(colorize("blue", `${promptString2}`));
    const { confirm } = await prompt.get([{ name: "confirm", description: "Confirm? (y/N)" }]);
    if (confirm !== 'y' && confirm !== 'Y') {
        console.error("Abort");
        return;
    }

    console.info();
    console.info(`============================================================`);
    console.info(`=========== Deploy Badge, RedeemChecker and XSoul ==========`);
    console.info(`============================================================`);
    const badge = await deployBadge(
        "XBadge",
        "XBG",
        process.env.BADGE_METADATA_URL,
        // "https://api.playvrs.net/soul/badge/meta/goerli/",
        admin.address
    );
    console.info(`Badge @ ${badge.address}`);

    const minAmt = 3;
    const redeemChecker = await deployRedeemChecker(badge.address, minAmt);
    console.info(`RedeemChecker @ ${redeemChecker.address}`);

    const xsoul = await deployXSoul(
        "XSoul",
        "XSL",
        process.env.XSOUL_METADATA_URL,
        // "https://api.playvrs.net/soul/xsoul/meta/goerli/",
        redeemChecker.address,
        admin.address
    );
    console.info(`XSoul @ ${xsoul.address}`);

    if (!skipVerify) {
        try {
            await hre.run("verify:verify", {
                address: badge.address,
                constructorArguments: [
                    "XBadge",
                    "XBG",
                    process.env.BADGE_METADATA_URL,
                    admin.address
                ],
                contract: "contracts/sbt/Badge.sol:Badge",
            });
        } catch (e) {
            console.warn(`Verify failed: ${e.message}`);
        }

        try {
            await hre.run("verify:verify", {
                address: redeemChecker.address,
                constructorArguments: [
                    badge.address,
                    minAmt
                ],
                contract: "contracts/sbt/RedeemChecker.sol:RedeemChecker",
            });
        } catch (e) {
            console.warn(`Verify failed: ${e.message}`);
        }

        try {
            await hre.run("verify:verify", {
                address: xsoul.address,
                constructorArguments: [
                    "XSoul",
                    "XSL",
                    process.env.XSOUL_METADATA_URL,
                    redeemChecker.address,
                    admin.address
                ],
                contract: "contracts/sbt/XSoul.sol:XSoul",
            });
        } catch (e) {
            console.warn(`Verify failed: ${e.message}`);
        }
    }
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
