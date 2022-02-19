const { expect } = require("chai");
const hre = require("hardhat");
const { deployMajorToken, deployVesting } = require("../lib/deploy");

describe("Test VestingContract", function () {
  let fbt, vc; // Contract objects
  let owner1, owner2, u0, u1, u2, u3, u4; // Signers

  const startTime = 1700000000;
  const stages = [0, 100000];
  const unlockProportion = [0, 4000];

  // const totalAmount = BigInt(1000000);
  const beneficiaryAmounts = [300000, 700000, 200000];

  const PROPORTION_BASE = 10000;

  beforeEach("Two contracts deployed.", async function () {
    // Reset test environment.
    await hre.network.provider.send("hardhat_reset");

    [owner1, owner2, u0, u1, u2, u3, u4] = await hre.ethers.getSigners();

    fbt = await deployMajorToken(owner1.address);

    vc = await deployVesting(
      owner1.address,
      fbt.address,
      startTime,
      stages,
      unlockProportion
    );

    await fbt.approve(
      vc.address,
      beneficiaryAmounts[0] + beneficiaryAmounts[1]
    );
    await vc.addBeneficiary(u0.address, beneficiaryAmounts[0]);
    await vc.addBeneficiary(u1.address, beneficiaryAmounts[1]);
  });

  it("VC Fields correctly initialized.", async function () {
    expect(await vc.beneficiaryAmount(u0.address)).to.equal(
      beneficiaryAmounts[0]
    );
    expect(await vc.beneficiaryAmount(u1.address)).to.equal(
      beneficiaryAmounts[1]
    );

    expect(await vc.startSecond()).to.equal(startTime);
  });

  it("Test addBeneficiary", async function () {
    // Should approve before adding
    await expect(
      vc.addBeneficiary(u2.address, beneficiaryAmounts[2])
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

    // Approve
    await fbt.approve(vc.address, beneficiaryAmounts[2]);

    const balanceBeforeAdd = await fbt.balanceOf(vc.address);
    await vc.addBeneficiary(u2.address, beneficiaryAmounts[2]);
    const balanceAfterAdd = await fbt.balanceOf(vc.address);
    expect(balanceAfterAdd.toNumber() - balanceBeforeAdd.toNumber()).be.equal(
      beneficiaryAmounts[2]
    );
  });

  it("Test vestingProportionSchedule", async function () {
    const checkPoint0 = startTime + stages[0];
    const checkPoint1 = startTime + stages[1];
    expect(await vc.vestingProportionSchedule(checkPoint0 - 1)).to.equal(
      unlockProportion[0]
    );
    expect(await vc.vestingProportionSchedule(checkPoint0 + 0)).to.equal(
      unlockProportion[1]
    );
    expect(await vc.vestingProportionSchedule(checkPoint1 - 1)).to.equal(
      unlockProportion[1]
    );
    expect(await vc.vestingProportionSchedule(checkPoint1 + 0)).to.equal(
      PROPORTION_BASE
    );
  });

  it("Test vestingAmountSchedule", async function () {
    const checkPoint0 = startTime + stages[0];
    const checkPoint1 = startTime + stages[1];

    expect(
      await vc.vestingAmountSchedule(u0.address, checkPoint0 - 1)
    ).to.equal((beneficiaryAmounts[0] * unlockProportion[0]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u0.address, checkPoint0 + 0)
    ).to.equal((beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u0.address, checkPoint1 - 1)
    ).to.equal((beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u0.address, checkPoint1 + 0)
    ).to.equal((beneficiaryAmounts[0] * PROPORTION_BASE) / PROPORTION_BASE);

    expect(
      await vc.vestingAmountSchedule(u1.address, checkPoint0 - 1)
    ).to.equal((beneficiaryAmounts[1] * unlockProportion[0]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u1.address, checkPoint0 + 0)
    ).to.equal((beneficiaryAmounts[1] * unlockProportion[1]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u1.address, checkPoint1 - 1)
    ).to.equal((beneficiaryAmounts[1] * unlockProportion[1]) / PROPORTION_BASE);
    expect(
      await vc.vestingAmountSchedule(u1.address, checkPoint1 + 0)
    ).to.equal((beneficiaryAmounts[1] * PROPORTION_BASE) / PROPORTION_BASE);
  });

  it("Test release", async function () {
    // Set the clock to prehistory
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime - 1,
    ]);
    // Before startTime, no one should be able to receive tokens.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Tokens not available."
    );
    // Speed up the clock to the first unlock stage.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[0],
    ]);
    // Let u0 pull his part from vc.
    await vc.connect(u0).release();
    expect(await vc.released(u0.address)).to.equal(
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );
    expect(await vc.released(u1.address)).to.equal(0);

    // u0 should have some FBT in his wallet now.
    expect(await fbt.balanceOf(u0.address)).to.equal(
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );

    // After pulling once, u0 should not be able to pull again.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Tokens not available."
    );

    // Speed up the clock to the second stage when all funds are available.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[1],
    ]);

    // Let u0 pull again.
    await vc.connect(u0).release();

    expect(await fbt.balanceOf(u0.address)).to.equal(
      (beneficiaryAmounts[0] * PROPORTION_BASE) / PROPORTION_BASE
    );

    // Let u1 pull all funds at once.
    await vc.connect(u1).release();

    expect(await fbt.balanceOf(u1.address)).to.equal(
      (beneficiaryAmounts[1] * PROPORTION_BASE) / PROPORTION_BASE
    );

    // No one should be able to pull after.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Tokens not available."
    );
    await expect(vc.connect(u1).release()).to.be.revertedWith(
      "Tokens not available."
    );

  });

  it("Test TokenReleased events", async function () {
    // Speed up the clock to the first unlock stage.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[0],
    ]);

    // Let u0 pull his part from vc.
    expect(await vc.connect(u0).release())
      .to.emit(vc, "TokenReleased")
      .withArgs(
        u0.address,
        (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
      );

    // Speed up the clock to the second stage when all funds are available.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[1],
    ]);

    // Let u0 pull again.
    expect(await vc.connect(u0).release())
      .to.emit(vc, "TokenReleased")
      .withArgs(
        u0.address,
        (beneficiaryAmounts[0] * PROPORTION_BASE) / PROPORTION_BASE -
        (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
      );

    // Let u1 pull all funds at once.
    expect(await vc.connect(u1).release())
      .to.emit(vc, "TokenReleased")
      .withArgs(
        u1.address,
        (beneficiaryAmounts[1] * PROPORTION_BASE) / PROPORTION_BASE
      );
  });

  it("Test change manager", async function () {
    // Speed up the clock to the first unlock stage.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[0],
    ]);

    expect(await vc.transferManagement(owner2.address))
      .to.emit(vc, "ManagementTransferred")
      .withArgs(owner1.address, owner2.address);

    // After owner becomes ex-manager, he has no right to change any beneficiary.
    await expect(
      vc.changeBeneficiary(u0.address, u2.address)
    ).to.be.revertedWith("Unauthorized request");

    // While owner2 has the right to do so.
    expect(await vc.connect(owner2).changeBeneficiary(u0.address, u2.address))
      .to.emit(vc, "BeneficiaryChanged")
      .withArgs(u0.address, u2.address, owner2.address);
  });

  it("Test changeBeneficiary.", async function () {
    // Set the clock to prehistory
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime - 1,
    ]);
    // Before startTime, no one should be able to receive tokens.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Tokens not available."
    );
    // Speed up the clock to the first unlock stage.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[0],
    ]);
    // Let u0 pull his part from vc.
    await vc.connect(u0).release();
    expect(await vc.released(u0.address)).to.equal(
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );
    expect(await vc.released(u1.address)).to.equal(0);

    // u0 should have some FBT in his wallet now.
    expect(await fbt.balanceOf(u0.address)).to.equal(
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );

    // u0 changes beneficiary to u2.
    await vc.connect(u0).changeBeneficiary(u0.address, u2.address);

    // After transfering to u2, u0 will not be able to pull.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Only beneficiaries receive."
    );
    // u2 also has no more tokens to pull.
    await expect(vc.connect(u2).release()).to.be.revertedWith(
      "Tokens not available."
    );

    // Owner replaces u1 with u3.
    await vc.changeBeneficiary(u1.address, u3.address);

    // Speed up the clock to the second stage when all funds are available.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[1],
    ]);

    // Let u0 pull and fail.
    await expect(vc.connect(u1).release()).to.be.revertedWith(
      "Only beneficiaries receive."
    );
    // Let u2 pull and succeed.
    await vc.connect(u2).release();

    expect(await fbt.balanceOf(u0.address)).to.equal(
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );
    expect(await fbt.balanceOf(u2.address)).to.equal(
      (beneficiaryAmounts[0] * PROPORTION_BASE) / PROPORTION_BASE -
      (beneficiaryAmounts[0] * unlockProportion[1]) / PROPORTION_BASE
    );

    // Let u1 pull and fail.
    await expect(vc.connect(u1).release()).to.be.revertedWith(
      "Only beneficiaries receive."
    );
    // Let u3 pull and succeed.
    await vc.connect(u3).release();

    expect(await fbt.balanceOf(u3.address)).to.equal(
      (beneficiaryAmounts[1] * PROPORTION_BASE) / PROPORTION_BASE
    );

    // No one should be able to pull after.
    await expect(vc.connect(u0).release()).to.be.revertedWith(
      "Only beneficiaries receive."
    );
    await expect(vc.connect(u1).release()).to.be.revertedWith(
      "Only beneficiaries receive."
    );
    await expect(vc.connect(u2).release()).to.be.revertedWith(
      "Tokens not available."
    );
    await expect(vc.connect(u3).release()).to.be.revertedWith(
      "Tokens not available."
    );
  });

  it("Test BeneficiaryChanged events.", async function () {
    const block = await hre.ethers.provider.getBlock("latest");
    // Deployment should be earlier than startTime.
    expect(block.timestamp < startTime);

    // Speed up the clock.
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      startTime + stages[0],
    ]);

    // Let u0 pull his part from vc.
    await vc.connect(u0).release();

    // u0 changes beneficiary to u2.
    expect(await vc.connect(u0).changeBeneficiary(u0.address, u2.address))
      .to.emit(vc, "BeneficiaryChanged")
      .withArgs(u0.address, u2.address, u0.address);

    // Owner replaces u1 with u3.
    expect(await vc.changeBeneficiary(u1.address, u3.address))
      .to.emit(vc, "BeneficiaryChanged")
      .withArgs(u1.address, u3.address, owner1.address);
  });

});
