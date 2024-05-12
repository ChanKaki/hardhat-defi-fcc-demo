const { getWeth, AMOUNT } = require("../scripts/getWeth");
const { getNamedAccounts, ethers } = require("hardhat");
const BORROW_MODE = 2;

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer);
  const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  await approveErc20(wethAddress, lendingPool.address, AMOUNT, deployer);
  console.log("depositing>>>");
  await lendingPool.deposit(wethAddress, AMOUNT, deployer, 0);
  console.log("deposited>>>>>");
  let { availableBorrowsETH, totalCollateralETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  const daiPrice = await getDataPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice);
  console.log("you can borrow", amountDaiToBorrow, " DAI");
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    2,
    0,
    account
  );
  borrowTx.wait(1);
  console.log("you are borrowed!");
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(
    daiAddress,
    amount,
    2,
    account
  );
  await repayTx.wait(1);
  console.log("Repaid!");
}

async function getBorrowUserData(lendingPool, account) {
  const { availableBorrowsETH, totalDebtETH, totalCollateralETH } =
    await lendingPool.getUserAccountData(account);

  console.log(
    "you have",
    totalCollateralETH.toString(),
    "worth of eth deposited"
  );
  console.log("you hvave", totalDebtETH.toString(), " worth of eth borrowed");
  console.log("you have", availableBorrowsETH.toString(), "worth of eth");
  return { availableBorrowsETH, totalCollateralETH };
}

async function getDataPrice() {
  const dataEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await dataEthPriceFeed.latestRoundData())[1];
  console.log("DI / ETH", price.toString());
  return price;
}

async function getLendingPool(account) {
  const iLendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress =
    await iLendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

async function approveErc20(
  contractAddress,
  sepnderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    contractAddress,
    account
  );
  const tx = await erc20Token.approve(sepnderAddress, amountToSpend);
  await tx.wait(1);
  console.log("approved");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
