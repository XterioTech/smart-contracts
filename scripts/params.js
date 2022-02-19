const hre = require("hardhat");

/*********** token **************/

const multisigWalletAddr = () => {
    switch (hre.network.name) {
        case "rinkeby":
            return "0xf0F8c924480e514fAe98f1834B84CC5A363EFa10";
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
            return ["0x4b43903c586e9aa28fc49eef26146646716b051d"];
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
            return daysToSecs([1, 2, 7, 14]);
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
    vestingStageProportions
}