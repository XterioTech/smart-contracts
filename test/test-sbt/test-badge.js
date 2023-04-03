const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const hre = require("hardhat");
const { deployBadge } = require("../../lib/deploy");

describe("Test Badge Contract", function () {
  let badge;
  let owner, admin, admin2, u1, u2;

  const name = "XBadge";
  const symbol = "XBG";
  const baseURI = "https://some uri/";
  const newbaseURI = "https://newbaseURI/";

  const RED = 0x1;
  const GREEN = 0x2;
  const BLUE = 0x3;

  let redTokenIdStart, greenTokenIdStart, blueTokenIdStart;

  beforeEach("Deploy contrats", async function () {
    [owner, admin, admin2, u1, u2] = await hre.ethers.getSigners();
    badge = await deployBadge(name, symbol, baseURI, admin.address);
    redTokenIdStart = 1;
    greenTokenIdStart = 1;
    blueTokenIdStart = 1;
  });

  it("should issue badge for user", async function () {
    await badge.connect(admin).issueBadge(u1.address, RED);
    expect(await badge.getOwnerOf(RED, redTokenIdStart)).to.equal(u1.address);

    const block = await hre.ethers.provider.getBlock("latest");
    expect(await badge.getIssuedTime(u1.address, RED)).to.equal(
      block.timestamp
    );

    await badge.connect(admin).issueBadge(u2.address, RED);
    expect(await badge.getOwnerOf(RED, ++redTokenIdStart)).to.equal(u2.address);

    //uri reset correct
    await badge.connect(admin).setBaseURI(newbaseURI);
    // (uint16 tokenType, uint64 tokenId) , tokenType = 1, tokenId = 1 ===> return (uint256(tokenType) << 64) | uint256(tokenId);
    const tokenIdForRedFirst = BigNumber.from("18446744073709551617");
    expect(await badge.tokenURI(tokenIdForRedFirst)).to.equal(
      newbaseURI + tokenIdForRedFirst
    );
  });

  it("should revoke badge from user", async function () {
    await badge.connect(admin).issueBadge(u1.address, RED);
    await badge.connect(admin).revokeBadge(u1.address, RED, redTokenIdStart);
  });

  it("should fail to mint multiple tokens of the same type to one recipient", async function () {
    await badge.connect(admin).issueBadge(u1.address, RED);
    await expect(
      badge.connect(admin).issueBadge(u1.address, RED)
    ).to.be.revertedWith("Badge: cannot issue badge");
  });

  it("should add / remove another admin", async function () {
    const OPERATOR_ROLE = await badge.OPERATOR_ROLE();
    await badge.connect(admin).grantRole(OPERATOR_ROLE, admin2.address);
    await badge.connect(admin2).issueBadge(u1.address, RED);
    await badge.connect(admin).revokeRole(OPERATOR_ROLE, admin2.address);
    await expect(
      badge.connect(admin2).issueBadge(u2.address, RED)
    ).to.revertedWith(`is missing role ${OPERATOR_ROLE}`);
  });

  it("should get one badge of an owner", async function () {
    await badge.connect(admin).issueBadge(u1.address, RED);
    await badge.connect(admin).issueBadge(u1.address, GREEN);
    await badge.connect(admin).issueBadge(u2.address, BLUE);
    await badge.connect(admin).issueBadge(u1.address, BLUE);
    expect(await badge.getBadgeOf(u1.address, RED)).to.equal(redTokenIdStart);
    expect(await badge.getBadgeOf(u1.address, GREEN)).to.equal(
      greenTokenIdStart
    );
    expect(await badge.getBadgeOf(u1.address, BLUE)).to.equal(
      ++blueTokenIdStart
    );
  });

  it("should get badges of an owner", async function () {
    await badge.connect(admin).issueBadge(u1.address, RED);
    await badge.connect(admin).issueBadge(u1.address, GREEN);
    await badge.connect(admin).issueBadge(u1.address, BLUE);
    const badges = await badge.getBadgesOf(u1.address);
    expect(badges.length).to.equal(3);
  });

  it("should allow delegated mint", async function () {
    const recipient = u1.address;
    const tokenType = RED;
    const tokenId = redTokenIdStart;

    const msgHash = ethers.utils.solidityKeccak256(
      ["address", "uint16", "uint256", "address"],
      [recipient, tokenType, hre.network.config.chainId, badge.address]
    );
    const signature = await admin.signMessage(ethers.utils.arrayify(msgHash));

    await badge.connect(u1).claimBadge(recipient, tokenType, signature);

    expect(await badge.getBadgeOf(recipient, tokenType)).to.equal(tokenId);
  });

  it("should fail when signer is not admin", async function () {
    const recipient = u1.address;
    const tokenType = RED;
    const tokenId = redTokenIdStart;

    const msgHash = ethers.utils.solidityKeccak256(
      ["address", "uint16", "uint256", "address"],
      [recipient, tokenType, hre.network.config.chainId, badge.address]
    );
    const signature = await u1.signMessage(ethers.utils.arrayify(msgHash));

    await expect(
      badge.connect(u1).claimBadge(recipient, tokenType, signature)
    ).to.be.revertedWith("Badge: signer does not have operator role");
  });

  it("should support IERC-5192", async function () {
    // supportsInterface
    const interfaceId5192 = 0xb45a3c0e;
    expect(await badge.connect(admin).supportsInterface(interfaceId5192)).to
      .true;
  });
});
