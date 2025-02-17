import { borrowProvideWrappedCollateralTx } from "@anchor-protocol/app-fns";
import { bAsset, Rate, u } from "@anchor-protocol/types";
import { EstimatedFee, useRefetchQueries } from "@libs/app-provider";
import { useStream } from "@rx-stream/react";
import { useConnectedWallet } from "@terra-money/wallet-provider";
import { useCallback } from "react";
import { useAccount } from "contexts/account";
import { useAnchorWebapp } from "../../contexts/context";
import { ANCHOR_TX_KEY } from "../../env";
import { useBorrowBorrowerQuery } from "../../queries/borrow/borrower";
import { useBorrowMarketQuery } from "../../queries/borrow/market";
import { WhitelistWrappedCollateral } from "queries";

export interface BorrowProvideCollateralTxParams {
  depositAmount: bAsset;
  txFee: EstimatedFee;
  lunaAmount: u<bAsset>;
  exchangeRate: Rate;
  onTxSucceed?: () => void;
}

export function useBorrowProvideWrappedCollateralTx(
  collateral: WhitelistWrappedCollateral
) {
  const { availablePost, connected, terraWalletAddress } = useAccount();

  const connectedWallet = useConnectedWallet();

  const { queryClient, txErrorReporter, contractAddress, constants } =
    useAnchorWebapp();

  const { refetch: borrowMarketQuery } = useBorrowMarketQuery();
  const { refetch: borrowBorrowerQuery } = useBorrowBorrowerQuery();

  const refetchQueries = useRefetchQueries();

  const stream = useCallback(
    ({
      depositAmount,
      txFee,
      lunaAmount,
      exchangeRate,
      onTxSucceed,
    }: BorrowProvideCollateralTxParams) => {
      if (
        !connectedWallet ||
        !connected ||
        !availablePost ||
        !collateral ||
        !terraWalletAddress ||
        !queryClient
      ) {
        throw new Error("Can not post!");
      }
      return borrowProvideWrappedCollateralTx({
        collateral,
        walletAddr: terraWalletAddress,
        depositAmount,
        lunaAmount,
        exchangeRate,
        overseerAddr: contractAddress.moneyMarket.overseer,
        network: connectedWallet.network,
        post: connectedWallet.post,
        fixedGas: txFee.txFee,
        gasFee: txFee.gasWanted,
        gasAdjustment: constants.gasAdjustment,
        // query
        queryClient,
        borrowMarketQuery,
        borrowBorrowerQuery,
        // error
        txErrorReporter,
        // side effect
        onTxSucceed: () => {
          onTxSucceed?.();
          refetchQueries(ANCHOR_TX_KEY.BORROW_PROVIDE_COLLATERAL);
        },
      });
    },
    [
      collateral,
      availablePost,
      borrowBorrowerQuery,
      borrowMarketQuery,
      connected,
      connectedWallet,
      constants.gasAdjustment,
      contractAddress.moneyMarket.overseer,
      queryClient,
      refetchQueries,
      terraWalletAddress,
      txErrorReporter,
    ]
  );

  const streamReturn = useStream(stream);

  return connectedWallet ? streamReturn : [null, null];
}
