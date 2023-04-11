const { expect } = require("chai");
const { ethers } = require("hardhat");

const hre = require("hardhat");
const {
  deployBadge,
  deployXSoul,
  deployRedeemChecker,
} = require("../../lib/deploy");

describe("Test XSoul Contract", function () {
  let badge, redeemChecker, xsoul;
  let owner, admin, admin2, u1, u2;

  const name = "XSoul";
  const symbol = "XSL";
  const baseURI = "https://some uri/";
  const newbaseURI = "https://newbaseURI/";

  const RED = 0x1;
  const GREEN = 0x2;
  const BLUE = 0x3;

  let tokenId;

  let currentTimestamp;

  beforeEach("Deploy contrats", async function () {
    [owner, admin, admin2, u1, u2, unqualifiedUser] =
      await hre.ethers.getSigners();
    badge = await deployBadge(name, symbol, baseURI, admin.address);
    redeemChecker = await deployRedeemChecker(badge.address, 3);
    xsoul = await deployXSoul(
      name,
      symbol,
      baseURI,
      redeemChecker.address,
      admin.address
    );
    tokenId = 1;

    await badge.connect(admin).issueBadge(u1.address, RED);
    await badge.connect(admin).issueBadge(u1.address, GREEN);
    await badge.connect(admin).issueBadge(u1.address, BLUE);

    await badge.connect(admin).issueBadge(u2.address, RED);
    await badge.connect(admin).issueBadge(u2.address, GREEN);
    await badge.connect(admin).issueBadge(u2.address, BLUE);

    await badge.connect(admin).issueBadge(unqualifiedUser.address, RED);

    // getting timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    currentTimestamp = blockBefore.timestamp;
  });

  it("should not issue xsoul for unqualifiedUser user", async function () {
    await expect(
      xsoul.connect(admin).redeemXSoul(unqualifiedUser.address)
    ).to.be.revertedWith("XSoul: recipient is not eligible for redemption");
  });

  it("should issue xsoul for user & uri correct for tokenid", async function () {
    await xsoul.connect(admin).issueXSoul(u1.address);
    expect(await xsoul.ownerOf(tokenId)).to.equal(u1.address);
    expect(await xsoul.tokenOf(u1.address)).to.equal(tokenId);
    // uri assign correct
    expect(await xsoul.tokenURI(tokenId)).to.equal(baseURI + tokenId);
    //uri reset correct
    await xsoul.connect(admin).setBaseURI(newbaseURI);
    expect(await xsoul.tokenURI(tokenId)).to.equal(newbaseURI + tokenId);
  });

  it("should revoke xsoul from user", async function () {
    await xsoul.connect(admin).issueXSoul(u1.address);
    await xsoul.connect(admin).revokeXSoul(tokenId);
  });

  it("should fail to mint multiple tokens to one recipient", async function () {
    await xsoul.connect(admin).issueXSoul(u1.address);
    await expect(
      xsoul.connect(admin).issueXSoul(u1.address)
    ).to.be.revertedWith("SBTUnique: the recipient already has a token");
  });

  it("should add / remove another admin", async function () {
    const OPERATOR_ROLE = await xsoul.OPERATOR_ROLE();
    await xsoul.connect(admin).grantRole(OPERATOR_ROLE, admin2.address);
    await xsoul.connect(admin2).issueXSoul(u1.address);
    await xsoul.connect(admin).revokeRole(OPERATOR_ROLE, admin2.address);
    await expect(xsoul.connect(admin2).issueXSoul(u2.address)).to.revertedWith(
      `is missing role ${OPERATOR_ROLE}`
    );
  });

  it("should allow delegated mint", async function () {
    // delegated mint to u1
    const recipient = u1.address;
    const msgHash = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "address"],
      [
        currentTimestamp + 120,
        recipient,
        hre.network.config.chainId,
        xsoul.address,
      ]
    );
    const signature = await admin.signMessage(ethers.utils.arrayify(msgHash));
    await xsoul
      .connect(u1)
      .claimXSoul(recipient, signature, currentTimestamp + 120);
    expect(await xsoul.tokenOf(recipient)).to.equal(tokenId);

    // delegated mint to u2
    const recipient2 = u2.address;
    const msgHash2 = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "address"],
      [
        currentTimestamp + 120,
        recipient2,
        hre.network.config.chainId,
        xsoul.address,
      ]
    );
    const signature2 = await admin.signMessage(ethers.utils.arrayify(msgHash2));
    await xsoul
      .connect(u2)
      .claimXSoul(recipient2, signature2, currentTimestamp + 120);
    expect(await xsoul.tokenOf(recipient2)).to.equal(++tokenId);
  });

  it("should fail when signature expire", async function () {
    const recipient = u1.address;

    const msgHash = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "address"],
      [
        currentTimestamp - 120,
        recipient,
        hre.network.config.chainId,
        xsoul.address,
      ]
    );
    const signature = await u1.signMessage(ethers.utils.arrayify(msgHash));

    await expect(
      xsoul.connect(u1).claimXSoul(recipient, signature, currentTimestamp - 120)
    ).to.be.revertedWith("XSoul: signature expired");
  });

  it("should fail when signer is not admin", async function () {
    const recipient = u1.address;

    const msgHash = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "address"],
      [
        currentTimestamp + 120,
        recipient,
        hre.network.config.chainId,
        xsoul.address,
      ]
    );
    const signature = await u1.signMessage(ethers.utils.arrayify(msgHash));

    await expect(
      xsoul.connect(u1).claimXSoul(recipient, signature, currentTimestamp + 120)
    ).to.be.revertedWith("XSoul: signer does not have operator role");
  });

  it("should redeemXSoul", async function () {
    await xsoul.connect(u1).redeemXSoul(u1.address);
    expect(await xsoul.tokenOf(u1.address)).to.equal(tokenId);

    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;
    expect(await xsoul.getIssuedTime(u1.address)).to.equal(now);

    await expect(
      xsoul.connect(unqualifiedUser).redeemXSoul(unqualifiedUser.address)
    ).to.be.revertedWith("XSoul: recipient is not eligible for redemption");
  });

  it("should not redeem after resetRedeemChecker to zero", async function () {
    await xsoul
      .connect(admin)
      .setRedeemChecker(hre.ethers.constants.AddressZero);
    expect(await xsoul.redeemCheckerAddress()).to.equal(
      hre.ethers.constants.AddressZero
    );
    await expect(
      xsoul.connect(unqualifiedUser).redeemXSoul(unqualifiedUser.address)
    ).to.be.revertedWith("XSoul: Redemption has ended");
  });

  it("should support IERC-5192", async function () {
    // supportsInterface
    const interfaceId5192 = 0xb45a3c0e;
    expect(
      await xsoul.connect(unqualifiedUser).supportsInterface(interfaceId5192)
    ).to.true;
  });
});
