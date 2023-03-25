const { expect } = require("chai");
const hre = require("hardhat");

const { deployGatewayAndFactories } = require("../lib/deploy.js");
const {
  calculateCreate2AddressBasicERC721,
  calculateCreate2AddressBasicERC1155,
  calculateCreate2AddressBasicERC20,
  calculateCreate2AddressBasicERC20Capped,
} = require("../lib/create2.js");

describe("Test NFTFactory & NFTGateway Contract", function () {
  let gateway, nftfactory, erc20factory;
  let owner, gatewayAdmin, newGatewayAdmin, u2, u3, u4, gatewayManager3, u5, u6;

  beforeEach("Deploy contracts", async function () {
    // Reset test environment.
    await hre.network.provider.send("hardhat_reset");

    [
      owner,
      gatewayAdmin,
      newGatewayAdmin,
      u2,
      u3,
      u4,
      gatewayManager3,
      u5,
      u6,
    ] = await hre.ethers.getSigners();

    ({ gateway, nftfactory, erc20factory } = await deployGatewayAndFactories(
      gatewayAdmin
    ));
  });

  const deployBasicERC721 = async (deployer) => {
    /***************** Preparations ****************/

    // calculate u2ContractAddress deployed using create2
    const from = nftfactory.address;
    const deployeeName = "BasicERC721";
    const tokenName = "U2-contract";
    const tokenSymbol = "U2T";
    const baseURI = "baseURI/";
    const salt = 233;
    const erc721ContractAddress = await calculateCreate2AddressBasicERC721(
      from,
      deployeeName,
      deployer.address,
      tokenName,
      tokenSymbol,
      baseURI,
      "0x0000000000000000000000000000000000000000",
      false,
      gateway.address,
      salt
    );

    // Let u2 deploy the contract.
    await nftfactory
      .connect(deployer)
      .deployBasicERC721(tokenName, tokenSymbol, baseURI, salt);
    let erc721Contract = await hre.ethers.getContractAt(
      "BasicERC721",
      erc721ContractAddress
    );

    return erc721Contract;
  }

  it("ERC721 gateway operations", async function () {
    /***************** Preparations ****************/

    const u2Contract = await deployBasicERC721(u2);

    /******************** Tests ********************/

    // Owner of the NFT contract should be msg.sender
    expect(await u2Contract.owner()).to.equal(u2.address);
    await gateway.connect(u2).resetOwner(u2Contract.address, u3.address);
    expect(await u2Contract.owner()).to.equal(u3.address);

    // u2 mints to u2, u3
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u2.address, 222);
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u2.address, 223);
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u3.address, 333);

    // u2 transfers to u3
    const tx = await u2Contract
      .connect(u2)
    ["safeTransferFrom(address,address,uint256)"](
      u2.address,
      u3.address,
      222
    );

    const receipt = await tx.wait();
    console.log(
      `Gas used for a single BasicERC721 transfer: ${receipt.gasUsed}`
    );
  });

  it("should mint auto-increment ids", async function () {
    const u2Contract = await deployBasicERC721(u2);

    /******************** Tests ********************/

    // u2 mints to u2, u3
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u2.address, 0); // 1
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u2.address, 2); // 2
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u3.address, 0); // 3

    expect(await u2Contract.ownerOf(1)).to.equal(u2.address);
    expect(await u2Contract.ownerOf(2)).to.equal(u2.address);
    expect(await u2Contract.ownerOf(3)).to.equal(u3.address);
  })

  it("should borrow & lend ERC721 tokens", async function () {
    const u2Contract = await deployBasicERC721(u2);

    // u2 mints to u2
    await gateway.connect(u2).ERC721_mint(u2Contract.address, u2.address, 1); // 1

    // u2 lends to u3
    await u2Contract.connect(u2).setUser(1, u3.address, 0xFFFFFFFFFFFF);

    expect(await u2Contract.userOf(1)).to.equal(u3.address);

    // u3 failed to re-lend
    await expect(u2Contract.connect(u3).setUser(1, u4.address, 0xFFFFFFFFFFFF)).to.be.revertedWith("ERC4907: transfer caller is not owner nor approved");
  })

  const deployBasicERC1155 = async (deployer) => {
    // calculate erc1155ContractAddress deployed using create2
    const from = nftfactory.address;
    const deployeeName = "BasicERC1155";
    const uri = "some uri/";
    const salt = 233;
    const erc1155ContractAddress = await calculateCreate2AddressBasicERC1155(
      from,
      deployeeName,
      deployer.address,
      uri,
      "0x0000000000000000000000000000000000000000",
      false,
      gateway.address,
      salt
    );

    // Let deployer deploy the contract.
    await nftfactory.connect(deployer).deployBasicERC1155(uri, salt);
    let erc1155Contract = await hre.ethers.getContractAt(
      deployeeName,
      erc1155ContractAddress
    );

    return erc1155Contract;
  }

  it("ERC1155 gateway operations", async function () {
    /***************** Preparations ****************/
    const u2Contract = await deployBasicERC1155(u2)

    /******************** Tests ********************/

    const erc1155MintAmount = 10;

    // u2 mints to u3
    await gateway
      .connect(u2)
      .ERC1155_mint(
        u2Contract.address,
        u3.address,
        333,
        erc1155MintAmount,
        "0x"
      );

    // mintBatch
    await gateway
      .connect(u2)
      .ERC1155_mintBatch(
        u2Contract.address,
        u2.address,
        [222, 223],
        [erc1155MintAmount, erc1155MintAmount],
        "0x"
      );

    expect(await u2Contract.balanceOf(u2.address, 222)).to.equal(
      erc1155MintAmount
    );
    expect(await u2Contract.balanceOf(u2.address, 223)).to.equal(
      erc1155MintAmount
    );
    expect(await u2Contract.balanceOf(u3.address, 333)).to.equal(
      erc1155MintAmount
    );

    // u2 transfers to u3
    const tx = await u2Contract
      .connect(u2)
      .safeTransferFrom(u2.address, u3.address, 222, 1, "0x");

    const receipt = await tx.wait();
    console.log(
      `Gas used for a single BasicERC1155 transfer: ${receipt.gasUsed}`
    );
  });

  it("should borrow & lend ERC1155 tokens", async function () {
    /***************** Preparations ****************/
    const u2Contract = await deployBasicERC1155(u2)
    const tokenId = 333;
    const mintAmount = 10;
    const lendAmount = 4;

    // u2 mints to u2
    await gateway
      .connect(u2)
      .ERC1155_mint(
        u2Contract.address,
        u2.address,
        tokenId,
        mintAmount,
        "0x"
      );

    await u2Contract.connect(u2).createUserRecord(u2.address, u3.address, tokenId, lendAmount, 0xFFFFFFFFFFFF);

    expect(await u2Contract.frozenBalanceOf(u2.address, tokenId)).to.equal(lendAmount);
    // Only the lent amount is counted as 'usable'
    expect(await u2Contract.usableBalanceOf(u2.address, tokenId)).to.equal(0);
    expect(await u2Contract.usableBalanceOf(u3.address, tokenId)).to.equal(lendAmount);

    // The borrower cannot relend
    await expect(u2Contract.connect(u3).createUserRecord(u3.address, u4.address, tokenId, lendAmount, 0xFFFFFFFFFFFF)).to.be.revertedWith("ERC1155: insufficient balance for transfer")
  })

  it("ERC20 gateway oprations", async function () {
    const from = erc20factory.address;
    const deployeeName = "BasicERC20";
    const tokenName = "U2-contract";
    const tokenSymbol = "U2T";
    const decimals = 9;
    const salt = 233;
    const u2ContractAddress = await calculateCreate2AddressBasicERC20(
      from,
      deployeeName,
      tokenName,
      tokenSymbol,
      decimals,
      gateway.address,
      salt
    );
    // Let u2 deploy the contract.
    await erc20factory
      .connect(u2)
      .deployBasicERC20(tokenName, tokenSymbol, decimals, salt);
    let u2Contract = await hre.ethers.getContractAt(
      deployeeName,
      u2ContractAddress
    );

    await gateway.connect(gatewayAdmin).addManager(erc20factory.address);

    const initialSupply = 100;
    const transferAmount = 50;

    await gateway
      .connect(u2)
      .ERC20_mint(u2Contract.address, u2.address, initialSupply);

    // u2 transfers to u3
    const tx = await u2Contract
      .connect(u2)
      .transfer(u3.address, transferAmount);

    const receipt = await tx.wait();
    console.log(
      `Gas used for a single BasicERC20 transfer: ${receipt.gasUsed}`
    );
  });
});
