const hre = require("hardhat");

/*********** token **************/

const multisigWalletAddr = () => {
    switch (hre.network.name) {
        case "rinkeby":
            return "0x69c6549f5BF0Aaa1fb99DFcf8e21E5B9c90C3436";
        case "mainnet":
            // TODO: Mainnet Multisig Wallet
            return "";
    }
}

/*********** presale **************/

const presalePrice = () => {
    return 100;
}

const presaleAllowedStableCoins = () => {
    switch (hre.network.name) {
        case "rinkeby":
            return ["0x4081e38991E123E3d42Ad0E3cFBC948C7cc468F1", "0xe04c9B291d0cc56B764FC02E7422c8cd2d235856"];
        case "mainnet":
            // TODO
            return [];
    }
}

/*********** vesting **************/

const vestingManagerAddr = () => {
    // To be confirmed
    return multisigWalletAddr();
}

const vestingStart = () => {
    switch (hre.network.name) {
        case "rinkeby":
            return 1644580768;
        case "mainnet":
            // TODO
            return 1644580768;
    }
}

const vestingStages = () => {
    const daysToSecs = (days) => days.map(d => d * 24 * 60 * 60);
    switch (hre.network.name) {
        case "rinkeby":
            return daysToSecs([1, 7, 30, 90]);
        case "mainnet":
            // TODO
            return [];
    }
}

const vestingStageProportions = () => {
    switch (hre.network.name) {
        case "rinkeby":
            return [0, 1000, 2000, 5000];
        case "mainnet":
            // TODO
            return [];
    }
}

/*********** export **************/

module.exports = {
    multisigWalletAddr,
    presalePrice,
    presaleAllowedStableCoins,
    vestingManagerAddr,
    vestingStart,
    vestingStages,
    vestingStageProportions,
}