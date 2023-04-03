
const hre = require("hardhat");
const prompt = require("prompt");

const { deployWhitelistMinter, deployGateway, deployNFTFactory, deployERC20Factory } = require("../../lib/deploy.js");
const { colorize } = require('../../lib/utils.js');

const main = async () => {
    const [admin] = await hre.ethers.getSigners();

    let gatewayAddress = process.env.gatewayAddress || "";
    let deployA = process.env.deployAll || false;
    let deployN = process.env.deployNFTFactory || false;
    let deployE = process.env.deployERC20Factory || false;
    let deployW = process.env.deployWhitelistMinter || false;
    let skipVerify = process.env.skipVerify || false;

    if (!deployA && !deployN && !deployE && !deployW) {
        console.error("No deploy option provided, abort");
        return;
    }

    const promptString1 =
        gatewayAddress === ""
            ? `No gateway address provided, deploy new gateway`
            : `Gateway address provided: ${gatewayAddress}, skip gateway deployment`;
    const promptVerify = skipVerify ? "" : "and verify";
    const promptString2 =
        deployA
            ? `Deploy ${promptVerify} all dependent contracts`
            : `Deploy ${promptVerify} ${deployN ? "NFTFactory, " : ""}${deployE ? "ERC20Factory, " : ""}${deployW ? "WhitelistMinter" : ""}`;

    console.info(colorize("yellow", `Network: ${hre.network.name}, Deployer: ${admin.address}`));
    console.info(colorize("blue", `${promptString1}`));
    console.info(colorize("blue", `${promptString2}`));
    const { confirm } = await prompt.get([{ name: "confirm", description: "Confirm? (y/N)" }]);
    if (confirm !== 'y' && confirm !== 'Y') {
        console.error("Abort");
        return;
    }

    if (gatewayAddress === "") {
        console.info(`============================================================`);
        console.info(`====================== Deploy Gateway ======================`);
        console.info(`============================================================`);
        const gateway = await deployGateway(admin);
        console.info(`Gateway proxy @ ${gateway.address}`);

        gatewayAddress = gateway.address;

        if (!skipVerify) {
            try {
                await hre.run("verify:verify", {
                    address: gateway.address,
                    contract: "contracts/basic-tokens/management/TokenGateway.sol:TokenGateway",
                });
            } catch (e) {
                console.warn(`Verify failed: ${e.message}`);
            }
        }
    } else {
        // TODO: check if gatewayAddress is a valid gateway
    }

    if (deployA || deployN) {
        console.info();
        console.info(`============================================================`);
        console.info(`===================== Deploy NFTFactory ====================`);
        console.info(`============================================================`);
        const { nftFactory, libDeployBasicERC721, libDeployBasicERC1155 } = await deployNFTFactory(gatewayAddress);
        console.info(`NFTFactory @ ${nftFactory.address}`);
        console.info(`LibDeployBasicERC721 @ ${libDeployBasicERC721.address}`);
        console.info(`LibDeployBasicERC1155 @ ${libDeployBasicERC1155.address}`);

        if (!skipVerify) {
            try {
                await hre.run("verify:verify", {
                    address: nftFactory.address,
                    contract: "contracts/basic-tokens/management/NFTFactory.sol:NFTFactory",
                    constructorArguments: [gatewayAddress],
                });

                // These steps keep failing, but the following commands work, which is weird.
                // npx hardhat verify --network bscTestnet ${libDeployBasicERC721.address}"
                // npx hardhat verify --network bscTestnet ${libDeployBasicERC1155.address}"
                await hre.run("verify:verify", {
                    address: libDeployBasicERC721.address,
                    contract:
                        "contracts/basic-tokens/management/LibDeploy.sol:LibDeployBasicERC721",
                });
                await hre.run("verify:verify", {
                    address: libDeployBasicERC1155.address,
                    contract:
                        "contracts/basic-tokens/management/LibDeploy.sol:LibDeployBasicERC1155",
                });
            } catch (e) {
                console.warn(`Verify failed: ${e.message}`);
            }
        }
    }

    if (deployA || deployE) {
        console.info();
        console.info(`============================================================`);
        console.info(`==================== Deploy ERC20Factory ===================`);
        console.info(`============================================================`);
        const erc20factory = await deployERC20Factory(gatewayAddress);
        console.info(`ERC20Factory @ ${erc20factory.address}`);

        if (!skipVerify) {
            try {
                await hre.run("verify:verify", {
                    address: erc20factory.address,
                    contract: "contracts/basic-tokens/management/ERC20Factory.sol:ERC20Factory",
                    constructorArguments: [gatewayAddress],
                });
            } catch (e) {
                console.warn(`Verify failed: ${e.message}`);
            }

        }
    }

    if (deployA || deployW) {
        console.info();
        console.info(`============================================================`);
        console.info(`================== Deploy WhitelistMinter ==================`);
        console.info(`============================================================`);
        const whitelistMinter = await deployWhitelistMinter(gatewayAddress);
        console.info(`WhitelistMinter @ ${whitelistMinter.address}`);

        if (!skipVerify) {
            try {
                await hre.run("verify:verify", {
                    address: whitelistMinter.address,
                    constructorArguments: [gatewayAddress],
                });
            } catch (e) {
                console.warn(`Verify failed: ${e.message}`);
            }
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
