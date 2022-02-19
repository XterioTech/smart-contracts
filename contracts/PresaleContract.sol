//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * This Contract is designed for the presale of our governance token based on whitelist policy.
 * 1. The list of whitelist addresses that can participate in the presale will be collected, and their corresponding presale quota will be determined according to contributions.
 * 2. The `setWhitelists` function will be called to set the pre-sale quota for whitelisted addresses.
 * 3. The governance token corresponding to the total amount of presale will be transferred to the contract address, and the presale will start
 * 4. Users with presale quotas can then use our front-end application, which interacts with the contract, to buy governance tokens using an allowed stable coin token at a given price.
 */
contract PresaleContract is Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // The Governance Token for presale
    address public tokenAddress; 
    // The total amount of tokens currently sold
    uint256 public totalSold; 

    // The given presale price, should be used together with `PRICE_DENOMINATOR`
    // 1 TOKEN = presalePrice / PRICE_DENOMINATOR USD
    uint256 public presalePrice; 
    uint256 public constant PRICE_DENOMINATOR = 10000; 

    // Allowed stablecoin tokens set
    EnumerableSet.AddressSet private stableCoinSet; 

    // All whitelisted users, recorded for later audit
    EnumerableSet.AddressSet private whitelistUserSet;  

    // Presale quota, map of (addr => max # of token can buy), 
    mapping(address => uint256) public limitAmount; 
    // Presale quota consumed, map of (addr => # of token has bought)
    mapping(address => uint256) public boughtAmount; 

    // Default token decimal
    uint8 public constant DEFAULT_TOKEN_DECIMAL = 18; 
    // Token decimals of those with non-default decimals
    mapping(address => uint8) private tokenDecimals; 

    event PresaleBought(
        address indexed buyer,
        address indexed coin,
        uint256 cost,
        uint256 amount
    );
    event TokenWithdrawed(
        address indexed token,
        address indexed toAddr,
        uint256 amount
    );
    event AllWithdrawed(address indexed toAddr, uint256 totalSold);

    constructor(address _tokenAddress, uint256 _presalePrice) {
        tokenAddress = _tokenAddress;
        presalePrice = _presalePrice;
    }

    // Add allowed stable coins
    function addStableCoins(address[] calldata stableCoins) external onlyOwner {
        for (uint256 i = 0; i < stableCoins.length; i++) {
            address coin = stableCoins[i];
            stableCoinSet.add(coin);
        }
    }

    // Remove allowed stable coin
    function removeStableCoin(address stableCoin) external onlyOwner {
        stableCoinSet.remove(stableCoin);
    }

    // Set token decimal
    function setTokenDecimal(address token, uint8 decimal) external onlyOwner {
        tokenDecimals[token] = decimal;
    }

    // Set whitelists with limit amounts
    function setWhitelists(address[] calldata addrs, uint256[] calldata amounts)
        external
        onlyOwner
    {
        require(
            addrs.length == amounts.length,
            "length of addrs and amounts does not match"
        );
        for (uint256 i = 0; i < addrs.length; i++) {
            limitAmount[addrs[i]] = amounts[i];
            whitelistUserSet.add(addrs[i]);
        }
    }

    // Set whitelist with limit amount
    function setWhitelist(address addr, uint256 amount) external onlyOwner {
        limitAmount[addr] = amount;
        whitelistUserSet.add(addr);
    }

    /**
     * Whitelist user calls this function to buy presale
     * coin: stable coin address used to buy
     * amountToBuy: buying amount of the target token
     */
    function buyPresale(address coin, uint256 amountToBuy) public {
        require(
            boughtAmount[msg.sender] + amountToBuy <= limitAmount[msg.sender],
            "Exceed the purchase limit"
        );

        require(
            (IERC20(tokenAddress).balanceOf(address(this))) >= amountToBuy,
            "Insufficient platform tokens"
        );
        require(
            stableCoinSet.contains(coin),
            "Payment with this type of stablecoin is not supported"
        );

        totalSold += amountToBuy;
        boughtAmount[msg.sender] += amountToBuy;

        uint256 cost = calculateCost(coin, amountToBuy);

        //Transfer the corresponding amount of stablecoins from the whitelisted address to this contract address.
        //allowance needs to be enough
        uint256 allowance = IERC20(coin).allowance(msg.sender, address(this));
        require(allowance >= cost, "Insufficient Stable Coin allowance");

        emit PresaleBought(msg.sender, coin, cost, amountToBuy);

        IERC20(coin).safeTransferFrom(msg.sender, address(this), cost);

        // send ERC20 token to `buyer`.
        IERC20(tokenAddress).safeTransfer(msg.sender, amountToBuy);
    }

    // The manager withdraw specific token to `toAddr`
    function withdrawToken(
        address token,
        address toAddr,
        uint256 amount
    ) public onlyOwner {
        emit TokenWithdrawed(token, toAddr, amount);
        IERC20(token).safeTransfer(toAddr, amount);
    }

    // The manager withdraw rest of tokens including our governance token and stablecoin to a new address
    function withdraw(address toAddr) public onlyOwner {
        emit AllWithdrawed(toAddr, totalSold);

        // send ERC20 token to `toAddr`.
        IERC20(tokenAddress).safeTransfer(
            toAddr,
            IERC20(tokenAddress).balanceOf(address(this))
        );
        // send All kinds of stable coin to toAddr
        for (uint256 i = 0; i < stableCoinSet.length(); i++) {
            address coin = stableCoinSet.at(i);
            uint256 balance = IERC20(coin).balanceOf(address(this));
            if (balance > 0) {
                IERC20(coin).safeTransfer(toAddr, balance);
            }
        }
    }

    // Allowed stable coin list
    function stableCoinLists() external view returns (address[] memory) {
        return stableCoinSet.values();
    }

    // The # of platform token held by our contract now
    function totalToken() external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    // Remaining # of token for addr can buy
    function remainingAmount(address addr) external view returns (uint256) {
        return limitAmount[addr] - boughtAmount[addr];
    }

    // Query whitelists of [from , to]  0-based
    function whitelist(uint256 from, uint256 to)
        external
        view
        returns (address[] memory)
    {
        require(
            (from >= 0) && (from <= to) && (to < whitelistUserSet.length()),
            "Query Params Illegal"
        );

        address[] memory ret = new address[](to - from + 1);
        for (uint256 i = from; i <= to; i++) {
            ret[i] = whitelistUserSet.at(i);
        }
        return ret;
    }

    // Total # of white list user
    function whitelistCnt() external view returns (uint256) {
        return whitelistUserSet.length();
    }

    // Token decimal for a given token
    function tokenDecimal(address coin) public view returns (uint8) {
        if (tokenDecimals[coin] == 0) {
            return DEFAULT_TOKEN_DECIMAL;
        }
        return tokenDecimals[coin];
    }

    // Calculate cost of stable coins with diff decimals
    function calculateCost(address coin, uint256 amountToBuy)
        public
        view
        returns (uint256)
    {
        uint256 cost;
        uint8 coinDec = tokenDecimal(coin);
        uint8 tokenDec = tokenDecimal(tokenAddress);

        if (coinDec >= tokenDec) {
            cost =
                (amountToBuy * presalePrice * (10**(coinDec - tokenDec))) /
                PRICE_DENOMINATOR;
        } else {
            cost =
                (amountToBuy * presalePrice) /
                (10**(tokenDec - coinDec)) /
                PRICE_DENOMINATOR;
        }
        return cost;
    }
    
}
