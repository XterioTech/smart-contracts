const hre = require("hardhat");
const prompt = require("prompt");

const { deployVesting } = require('../lib/deploy');
const { vestingManagerAddr, vestingStart, vestingStages, vestingStageProportions } = require('./params');

function convertTimestamp(timestamp) {
    var d = new Date(timestamp * 1000),	// Convert the passed timestamp to milliseconds
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
        dd = ('0' + d.getDate()).slice(-2),			// Add leading 0.
        hh = d.getHours(),
        min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
        time;
    time = yyyy + '-' + mm + '-' + dd + ', ' + hh + ':' + min;
    return time;
}

function proportionToPercent(proportion) {
    // Base is 10_000
    return proportion / 100 + "%";
}

const main = async () => {
    const manager = vestingManagerAddr();
    const start = vestingStart();
    const stages = vestingStages();
    const stageProportions = vestingStageProportions();
    console.info("Network: " + hre.network.name);
    console.info("Deploy vesting with token: " + hre.addrs.token);
    console.info("Manager addr: " + manager);
    console.info("Vesting start: ", convertTimestamp(start));
    console.info("Vesting Stages: ");
    for (let i = 0; i < stages.length; i++) {
        console.info("\t", convertTimestamp(start + stages[i]), i < stages.length-1 ? proportionToPercent(stageProportions[i+1]) : "100%");
    }
    const { confirm } = await prompt.get([{ name: "confirm", description: "Confirm? (y/N)" }]);
    if (confirm === 'y' || confirm === 'Y') {
        vesting = await deployVesting(
            manager, hre.addrs.token, start, stages, stageProportions
        );
        console.info("Vesting Contract Deployed: " + vesting.address);
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
