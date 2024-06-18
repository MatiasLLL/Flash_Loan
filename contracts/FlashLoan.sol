// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {UniswapV2Router02} from "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";
import "hardhat/console.sol";

contract FlashLoan is FlashLoanSimpleReceiverBase {
    address payable owner;

    constructor(
        address _addressProvider
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    function approveTokenToDEX(
        IERC20 token,
        UniswapV2Router02 dexRouter,
        uint256 _amount
    ) external onlyOwner returns (bool) {
        return token.approve(address(dexRouter), _amount);
    }

    function tokenAllowanceOnDEX(
        IERC20 token,
        UniswapV2Router02 dexRouter
    ) external view returns (uint256) {
        return token.allowance(address(this), address(dexRouter));
    }

    function requestFlashLoan(
        address asset,
        uint256 amount,
        bytes memory params
    ) public {
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // No referral code
        );
    }

    event DebugInfo(
        address indexed asset,
        uint256 totalRepayment,
        uint256 secondReceived
    );

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */,
        bytes calldata params
    ) external override returns (bool) {
        (
            address[] memory firstPath,
            address[] memory secondPath,
            address firstDexRouter,
            address secondDexRouter
        ) = abi.decode(params, (address[], address[], address, address));

        // Approve tokens to DEXes
        IERC20(asset).approve(firstDexRouter, amount);
        IERC20(firstPath[firstPath.length - 1]).approve(
            secondDexRouter,
            amount
        );

        UniswapV2Router02 firstRouter = UniswapV2Router02(
            payable(firstDexRouter)
        );

        uint256[] memory firstSwapAmounts = firstRouter
            .swapExactTokensForTokens(
                amount,
                0,
                firstPath,
                address(this),
                block.timestamp
            );

        uint256 firstReceived = firstSwapAmounts[firstSwapAmounts.length - 1];

        UniswapV2Router02 secondRouter = UniswapV2Router02(
            payable(secondDexRouter)
        );

        uint256[] memory secondSwapAmounts = secondRouter
            .swapExactTokensForTokens(
                firstReceived,
                0,
                secondPath,
                address(this),
                block.timestamp
            );

        uint256 secondReceived = secondSwapAmounts[
            secondSwapAmounts.length - 1
        ];
        console.log("Second received: ", secondReceived);
        uint256 totalRepayment = amount + premium;
        console.log("Total repayment needed: ", totalRepayment);

        // Emit the debug information right before the check
        emit DebugInfo(asset, totalRepayment, secondReceived);

        require(
            IERC20(asset).balanceOf(address(this)) >= totalRepayment,
            "Not enough funds to repay Aave loan"
        );
        require(
            (secondReceived * 10000) / totalRepayment >= 10075, // Adjusted for 0.75% profit threshold
            "Insufficient profit"
        );

        IERC20(asset).approve(address(POOL), totalRepayment);
        return true;
    }

    function getBalance(address _tokenAddress) external view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    function withdraw(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {}
}
