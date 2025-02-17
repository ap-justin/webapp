import { formatLuna } from "@anchor-protocol/notation";
import { aLuna, Gas, HumanAddr, Luna, Rate, u } from "@anchor-protocol/types";
import {
  pickAttributeValue,
  pickEvent,
  pickRawLog,
  TxResultRendering,
  TxStreamPhase,
} from "@libs/app-fns";
import {
  _catchTxError,
  _createTxOptions,
  _pollTxInfo,
  _postTx,
  TxHelper,
} from "@libs/app-fns/tx/internal";
import { floor } from "@libs/big-math";
import {
  demicrofy,
  formatFluidDecimalPoints,
  formatTokenInput,
} from "@libs/formatter";
import { QueryClient } from "@libs/query-client";
import { pipe } from "@rx-stream/pipe";
import {
  CreateTxOptions,
  Fee,
  MsgExecuteContract,
} from "@terra-money/terra.js";
import { NetworkInfo, TxResult } from "@terra-money/wallet-provider";
import { Observable } from "rxjs";

export function bondMintTx($: {
  walletAddr: HumanAddr;
  bAssetHubAddr: HumanAddr;
  bondAmount: Luna;
  gasFee: Gas;
  gasAdjustment: Rate<number>;
  fixedGas: u<Luna>;
  exchangeRate: Rate<string>;
  network: NetworkInfo;
  queryClient: QueryClient;
  post: (tx: CreateTxOptions) => Promise<TxResult>;
  txErrorReporter?: (error: unknown) => string;
  onTxSucceed?: () => void;
}): Observable<TxResultRendering> {
  const helper = new TxHelper({ ...$, txFee: $.fixedGas });

  return pipe(
    _createTxOptions({
      msgs: [
        new MsgExecuteContract(
          $.walletAddr,
          $.bAssetHubAddr,
          {
            bond: {
              validator: "terravaloper1zdpgj8am5nqqvht927k3etljyl6a52kwqndjz2",
            },
          },

          // send native token
          {
            uluna: formatTokenInput($.bondAmount),
          }
        ),
      ],
      fee: new Fee($.gasFee, floor($.fixedGas) + "uluna"),
      gasAdjustment: $.gasAdjustment,
    }),
    _postTx({ helper, ...$ }),
    _pollTxInfo({ helper, ...$ }),
    ({ value: txInfo }) => {
      const rawLog = pickRawLog(txInfo, 0);

      if (!rawLog) {
        return helper.failedToFindRawLog();
      }

      const fromContract = pickEvent(rawLog, "from_contract");

      if (!fromContract) {
        return helper.failedToFindEvents("from_contract");
      }

      try {
        const bondedAmount = pickAttributeValue<u<Luna>>(fromContract, 3);

        const mintedAmount = pickAttributeValue<u<aLuna>>(fromContract, 4);

        return {
          value: null,

          phase: TxStreamPhase.SUCCEED,
          receipts: [
            bondedAmount && {
              name: "Bonded Amount",
              value: `${formatLuna(demicrofy(bondedAmount))} LUNA`,
            },
            mintedAmount && {
              name: "Minted Amount",
              value: `${formatLuna(demicrofy(mintedAmount))} aLUNA`,
            },
            {
              name: "Exchange Rate",
              value: `${formatFluidDecimalPoints(
                $.exchangeRate,
                6
              )} aLUNA per LUNA`,
            },
            helper.txHashReceipt(),
            helper.txFeeReceipt(),
          ],
        } as TxResultRendering;
      } catch (error) {
        return helper.failedToParseTxResult();
      }
    }
  )().pipe(_catchTxError({ helper, ...$ }));
}
