import React from 'react';
import { UST } from '@anchor-protocol/types';
import type { DialogProps } from '@libs/use-dialog';
import { useAccount } from 'contexts/account';
import { useCallback } from 'react';
import { useBorrowRepayTx } from '@anchor-protocol/app-provider';
import { RepayFormParams } from '../types';
import { RepayDialog } from '../RepayDialog';
import { EstimatedFee } from '@libs/app-provider';

export const TerraRepayDialog = (props: DialogProps<RepayFormParams>) => {
  const { connected } = useAccount();

  const [postTx, txResult] = useBorrowRepayTx();

  const proceed = useCallback(
    (repayAmount: UST, txFee: EstimatedFee) => {
      if (connected && postTx) {
        postTx({ repayAmount, txFee });
      }
    },
    [postTx, connected],
  );

  return (
    <RepayDialog
      {...props}
      txResult={txResult}
      proceedable={postTx !== undefined}
      onProceed={proceed}
    />
  );
};
