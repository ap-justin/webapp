import { borrowBorrowTx } from "@anchor-protocol/app-fns";
import { UST } from "@anchor-protocol/types";
import {
  EstimatedFee,
  useFixedFee,
  useRefetchQueries,
} from "@libs/app-provider";
import { useStream } from "@rx-stream/react";
import { useConnectedWallet } from "@terra-money/wallet-provider";
import { useCallback } from "react";
import { useAccount } from "contexts/account";
import { useAnchorWebapp } from "../../contexts/context";
import { ANCHOR_TX_KEY } from "../../env";
import { useBorrowBorrowerQuery } from "../../queries/borrow/borrower";
import { useBorrowMarketQuery } from "../../queries/borrow/market";

export interface BorrowBorrowTxParams {
  borrowAmount: UST;
  txFee: EstimatedFee;
  onTxSucceed?: () => void;
}

export function useBorrowBorrowTx() {
  const { availablePost, connected, terraWalletAddress } = useAccount();

  const connectedWallet = useConnectedWallet();

  const { queryClient, txErrorReporter, contractAddress, constants } =
    useAnchorWebapp();

  const { refetch: borrowMarketQuery } = useBorrowMarketQuery();
  const { refetch: borrowBorrowerQuery } = useBorrowBorrowerQuery();

  const refetchQueries = useRefetchQueries();

  const fixedFee = useFixedFee();

  const stream = useCallback(
    ({ borrowAmount, onTxSucceed, txFee }: BorrowBorrowTxParams) => {
      if (
        !availablePost ||
        !connected ||
        !connectedWallet ||
        !terraWalletAddress ||
        !queryClient
      ) {
        throw new Error("Can not post!");
      }

      return borrowBorrowTx({
        walletAddr: terraWalletAddress,
        marketAddr: contractAddress.moneyMarket.market,
        borrowAmount,
        // post
        network: connectedWallet.network,
        post: connectedWallet.post,
        txFee: txFee.txFee,
        gasFee: txFee.gasWanted,
        gasAdjustment: constants.gasAdjustment,
        fixedGas: fixedFee,
        // query
        queryClient,
        borrowMarketQuery,
        borrowBorrowerQuery,
        // error
        txErrorReporter,
        // side effect
        onTxSucceed: () => {
          onTxSucceed?.();
          refetchQueries(ANCHOR_TX_KEY.BORROW_BORROW);
        },
      });
    },
    [
      availablePost,
      borrowBorrowerQuery,
      borrowMarketQuery,
      connected,
      connectedWallet,
      constants.gasAdjustment,
      contractAddress.moneyMarket.market,
      fixedFee,
      queryClient,
      refetchQueries,
      terraWalletAddress,
      txErrorReporter,
    ]
  );

  const streamReturn = useStream(stream);

  return connectedWallet ? streamReturn : [null, null];
}
