const { expect } = require("chai");
const hre = require("hardhat");
const { deployMajorToken, deployPresale } = require("../lib/deploy")

describe("Test Presale", function () {
    let fbt, sbc, usdt, ps;                               // Contract objects

    const totalAmount = BigInt(1000000) * BigInt(10) ** BigInt(18);
    const stableCoinAmount = BigInt(50000000) * BigInt(10) ** BigInt(18);
    const usdtAmount = BigInt(5000) * BigInt(10) ** BigInt(6);                  //5_000 usdt
    const preSalePrice = BigInt(1000);
    const PRICE_DENOMINATOR = BigInt(10000);

    beforeEach("Two contracts deployed.", async function () {
        // Reset test environment.
        await hre.network.provider.send("hardhat_reset");

        [owner, u1, u2, u3, u4] = await hre.ethers.getSigners();

        fbt = await deployMajorToken(owner.address);
        ps = await deployPresale(fbt.address, preSalePrice);

        const StableCoin = await hre.ethers.getContractFactory("StableCoinContract");
        sbc = await StableCoin.deploy();
        await sbc.deployed();

        const USDT = await hre.ethers.getContractFactory("USDT");
        usdt = await USDT.deploy();
        await usdt.deployed();

    });


    describe("Dealing with decimals & caculate cost.", function () {
        beforeEach("init stable coins", async function () {
            await ps.addStableCoins([sbc.address, usdt.address]);
            await ps.setTokenDecimal(usdt.address, 6);
        });

        it("Test init", async function () {

            expect(await ps.presalePrice()).to.equal(preSalePrice);
            await fbt.transfer(ps.address, totalAmount)
            expect(await ps.totalToken()).to.equal(totalAmount);
            // const coins = await ps.stableCoinLists();
            // console.log(coins);
            // expect(coins[0]).to.equal(sbc.address);
            // expect(coins[1]).to.equal(usdt.address);
            // console.log(await ps.coinDecimal(coins[0]));
            // console.log(await ps.coinDecimal(coins[1]));
            // expect(await ps.coinDecimal(coins[1])).to.equal(6);
        });

        it("Test caculateCost", async function () {
            const coins = await ps.stableCoinLists();
            const amountToBuy = BigInt(5) * BigInt(10) ** BigInt(18)
            // console.log(amountToBuy);

            // console.log(await sbc.decimals());
            // console.log(await ps.coinDecimal(coins[0]));
            // console.log(await ps.calculateCost(coins[0], amountToBuy));

            // console.log(await usdt.decimals());
            // console.log(await ps.coinDecimal(coins[1]));
            // console.log(await ps.calculateCost(coins[1], amountToBuy));

            const div = BigInt(10) ** BigInt((await fbt.decimals()) - (await usdt.decimals()));
            expect(await ps.calculateCost(coins[1], amountToBuy)).to.equal(
                amountToBuy * preSalePrice / PRICE_DENOMINATOR / div);
        });
    });

    describe("Dealing with FBT & StableCoins.", function () {
        beforeEach("init coins and whitelists.", async function () {
            await fbt.transfer(ps.address, totalAmount)
            // console.log(await sbc.balanceOf(sbc.address));
            // console.log(await sbc.balanceOf(u1.address));
            await sbc.transfer(u1.address, stableCoinAmount);

            await ps.addStableCoins([sbc.address]);
            await ps.setWhitelists(
                [u1.address, u2.address, u3.address, u4.address],
                [BigInt(100) * BigInt(10) ** BigInt(18), BigInt(1000) * BigInt(10) ** BigInt(18), BigInt(10000) * BigInt(10) ** BigInt(18), 0]);

            expect(await fbt.balanceOf(ps.address)).to.equal(totalAmount);
        });

        it("Test Get Stable Coin List", async function () {
            const coins = await ps.stableCoinLists();
            // console.log(coins);
            expect(coins[0]).to.equal(sbc.address);
        });

        it("Test modify white list ", async function () {
            await ps.setWhitelists(
                [u1.address, u2.address, u4.address],
                [BigInt(8) * BigInt(10) ** BigInt(18), BigInt(999) * BigInt(10) ** BigInt(18), 0]);

            expect(await ps.limitAmount(u1.address)).to.equal(BigInt(8) * BigInt(10) ** BigInt(18));
        });


        it("Test buyPresale function", async function () {
            const num = BigInt(5) * BigInt(10) ** BigInt(18);
            await expect(ps.connect(u1).buyPresale(sbc.address, BigInt(5) * BigInt(10) ** BigInt(30))).to.be.revertedWith("Exceed the purchase limit");
            await expect(ps.connect(u1).buyPresale(u2.address, num)).to.be.revertedWith("Payment with this type of stablecoin is not supported");

            await sbc.connect(u1).approve(ps.address, BigInt(3));
            await expect(ps.connect(u1).buyPresale(sbc.address, num)).to.be.revertedWith("Insufficient Stable Coin allowance");


            const cost = BigInt(await ps.calculateCost(sbc.address, num));
            await sbc.connect(u1).approve(ps.address, cost);
            // await ps.connect(u1).buyPresale(sbc.address, 5);

            expect(await ps.connect(u1).buyPresale(sbc.address, num)).to.emit(ps, "BuyPresale").withArgs(u1.address, sbc.address, cost, num);


            // console.log(await fbt.balanceOf(ps.address));
            // console.log(await sbc.balanceOf(ps.address));
            // console.log(await fbt.balanceOf(u1.address));
            // console.log(await sbc.balanceOf(u1.address));
            expect(await fbt.balanceOf(u1.address)).to.equal(num);
            expect(await fbt.balanceOf(ps.address)).to.equal(totalAmount - num);
            expect(await sbc.balanceOf(u1.address)).to.equal(stableCoinAmount - cost);
            expect(await sbc.balanceOf(ps.address)).to.equal(cost);
        });

        it("Test withdrawToken function", async function () {
            const num = BigInt(5) * BigInt(10) ** BigInt(18);
            const amountToWithdraw = BigInt(2) * BigInt(10) ** BigInt(18);

            const cost = BigInt(await ps.calculateCost(sbc.address, num));

            await sbc.connect(u1).approve(ps.address, cost);
            await ps.connect(u1).buyPresale(sbc.address, num);

            await expect(ps.connect(u1).withdraw(u3.address)).to.be.revertedWith("Ownable: caller is not the owner");

            expect(await ps.withdrawToken(fbt.address, u3.address, amountToWithdraw)).to.emit(ps, "WithdrawToken").withArgs(fbt.address, u3.address, amountToWithdraw);

            expect(await fbt.balanceOf(ps.address)).to.equal(totalAmount - num - amountToWithdraw);
            expect(await fbt.balanceOf(u3.address)).to.equal(amountToWithdraw);
        });

        it("Test withdraw function", async function () {
            const num = BigInt(5) * BigInt(10) ** BigInt(18);;
            const cost = BigInt(await ps.calculateCost(sbc.address, num));

            await sbc.connect(u1).approve(ps.address, cost);
            await ps.connect(u1).buyPresale(sbc.address, num);

            await expect(ps.connect(u1).withdraw(u3.address)).to.be.revertedWith("Ownable: caller is not the owner");

            // await ps.withdraw(u3.address);
            expect(await ps.withdraw(u3.address)).to.emit(ps, "WithdrawAll").withArgs(u3.address, (await ps.totalSold()));

            // console.log(await fbt.balanceOf(ps.address));
            // console.log(await sbc.balanceOf(ps.address));
            // console.log(await fbt.balanceOf(u3.address));
            // console.log(await sbc.balanceOf(u3.address));
            expect(await fbt.balanceOf(ps.address)).to.equal(0);
            expect(await sbc.balanceOf(ps.address)).to.equal(0);
            expect(await fbt.balanceOf(u3.address)).to.equal(totalAmount - num);
            expect(await sbc.balanceOf(u3.address)).to.equal(cost);
        });

        it("Test remove stable coin", async function () {
            await ps.removeStableCoin(sbc.address);
            await expect(ps.connect(u1).buyPresale(sbc.address, BigInt(100) * BigInt(10) ** BigInt(18))).to.be.revertedWith("Payment with this type of stablecoin is not supported");
        });

    });

    describe("One User Buy Muti Times With USDT.", function () {
        beforeEach("init stable coins", async function () {
            await ps.addStableCoins([sbc.address, usdt.address]);
            await ps.setTokenDecimal(usdt.address, 6);

            await fbt.transfer(ps.address, totalAmount)
            await sbc.transfer(u1.address, stableCoinAmount);
            await usdt.transfer(u3.address, usdtAmount);          //u3 has 5_000

            // init u3 has no presale limit amount
            await ps.setWhitelists(
                [u1.address, u2.address, u3.address, u4.address],
                [BigInt(100) * BigInt(10) ** BigInt(18), 0, 0, 0]
            );
        });

        it("u3 buy once", async function () {

            await expect(ps.connect(u3).buyPresale(usdt.address, 50)).to.be.revertedWith("Exceed the purchase limit");
            //set 100 fbt limit to u3
            const first_limit = BigInt(100) * BigInt(10) ** BigInt(18);
            await ps.setWhitelist(u3.address, first_limit);
            // console.log('u3 limit amount is: ', await ps.limitAmount(u3.address));
            // console.log('u3 bought amount is: ', await ps.boughtAmount(u3.address));
            // console.log('u3 remain amount is: ', await ps.remainingAmount(u3.address));

            await expect(ps.connect(u3).buyPresale(usdt.address, first_limit + BigInt(1))).to.be.revertedWith("Exceed the purchase limit");

            const fist_buy_amount = BigInt(50) * BigInt(10) ** BigInt(18);
            const cost = await ps.calculateCost(usdt.address, fist_buy_amount);
            // const div =  BigInt(10) ** BigInt((await fbt.decimals()) - (await usdt.decimals()));
            // expect(await ps.calculateCost(usdt.address, fist_buy_amount)).to.equal(
            //     fist_buy_amount * preSalePrice / PRICE_DENOMINATOR / div);

            // console.log(cost);
            await usdt.connect(u3).approve(ps.address, cost);
            await ps.connect(u3).buyPresale(usdt.address, fist_buy_amount);
            // console.log('u3 limit amount is: ', await ps.limitAmount(u3.address));
            // console.log('u3 bought amount is: ', await ps.boughtAmount(u3.address));
            // console.log('u3 remain amount is: ', await ps.remainingAmount(u3.address));  

            // console.log('u3 USDT : ', await usdt.balanceOf(u3.address));
            // console.log('ps USDT : ', await usdt.balanceOf(ps.address));
            // console.log('u3 FBT : ', await fbt.balanceOf(u3.address));
            // console.log('ps FBT : ', await fbt.balanceOf(ps.address))

            expect(await ps.totalToken()).to.equal(totalAmount - fist_buy_amount);

            expect(await ps.limitAmount(u3.address)).to.equal(first_limit);
            expect(await ps.boughtAmount(u3.address)).to.equal(fist_buy_amount);
            expect(await ps.remainingAmount(u3.address)).to.equal(first_limit - fist_buy_amount);

        });

        it("u3 buy twice", async function () {
            await expect(ps.connect(u3).buyPresale(usdt.address, 50)).to.be.revertedWith("Exceed the purchase limit");
            //set 100 fbt limit to u3
            const first_limit = BigInt(100) * BigInt(10) ** BigInt(18);
            await ps.setWhitelist(u3.address, first_limit);
            await expect(ps.connect(u3).buyPresale(usdt.address, first_limit + BigInt(1))).to.be.revertedWith("Exceed the purchase limit");

            //first buy 50
            const fist_buy_amount = BigInt(50) * BigInt(10) ** BigInt(18);
            const cost = await ps.calculateCost(usdt.address, fist_buy_amount);
            await usdt.connect(u3).approve(ps.address, cost);
            await ps.connect(u3).buyPresale(usdt.address, fist_buy_amount);

            expect(await ps.boughtAmount(u3.address)).to.equal(fist_buy_amount);

            //second buy 55 
            const second_buy_amount = BigInt(55) * BigInt(10) ** BigInt(18);
            const cost2 = await ps.calculateCost(usdt.address, second_buy_amount);
            await usdt.connect(u3).approve(ps.address, cost2);
            await expect(ps.connect(u3).buyPresale(usdt.address, second_buy_amount)).to.be.revertedWith("Exceed the purchase limit");

            //add more limit to u3
            await ps.setWhitelist(u3.address, BigInt(500) * BigInt(10) ** BigInt(18));

            //rebuy second 55
            await usdt.connect(u3).approve(ps.address, cost2);
            ps.connect(u3).buyPresale(usdt.address, second_buy_amount);

            // console.log('u3 limit amount is: ', await ps.limitAmount(u3.address));
            // console.log('u3 bought amount is: ', await ps.boughtAmount(u3.address));
            // console.log('u3 remain amount is: ', await ps.remainingAmount(u3.address));  

            // console.log('u3 USDT : ', await usdt.balanceOf(u3.address));
            // console.log('ps USDT : ', await usdt.balanceOf(ps.address));
            // console.log('u3 FBT : ', await fbt.balanceOf(u3.address));
            // console.log('ps FBT : ', await fbt.balanceOf(ps.address))
    
        });
    });
});
