import { validateTxFee } from '@anchor-protocol/app-fns';
import {
  useAnchorBank,
  useAnchorWebapp,
  useBondSwapTx,
} from '@anchor-protocol/app-provider';
import {
  formatLuna,
  formatLunaInput,
  LUNA_INPUT_MAXIMUM_DECIMAL_POINTS,
  LUNA_INPUT_MAXIMUM_INTEGER_POINTS,
} from '@anchor-protocol/notation';
import { TokenIcon } from '@anchor-protocol/token-icons';
import { aLuna, NativeDenom, Rate, terraswap, u } from '@anchor-protocol/types';
import { terraswapSimulationQuery } from '@libs/app-fns';
import {
  demicrofy,
  formatExecuteMsgNumber,
  formatFluidDecimalPoints,
  microfy,
  MICRO,
} from '@libs/formatter';
import { isZero } from '@libs/is-zero';
import { ActionButton } from '@libs/neumorphism-ui/components/ActionButton';
import { HorizontalHeavyRuler } from '@libs/neumorphism-ui/components/HorizontalHeavyRuler';
import { NumberMuiInput } from '@libs/neumorphism-ui/components/NumberMuiInput';
import {
  SelectAndTextInputContainer,
  SelectAndTextInputContainerLabel,
} from '@libs/neumorphism-ui/components/SelectAndTextInputContainer';
import { Luna } from '@libs/types';
import { useResolveLast } from '@libs/use-resolve-last';
import { InfoOutlined } from '@mui/icons-material';
import { StreamStatus } from '@rx-stream/react';
import big from 'big.js';
import { DiscloseSlippageSelector } from 'components/DiscloseSlippageSelector';
import { MessageBox } from 'components/MessageBox';
import { IconLineSeparator } from 'components/primitives/IconLineSeparator';
import { SlippageSelectorNegativeHelpText } from 'components/SlippageSelector';
import { TxResultRenderer } from 'components/tx/TxResultRenderer';
import { SwapListItem, TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { ViewAddressWarning } from 'components/ViewAddressWarning';
import { useAccount } from 'contexts/account';
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { swapBurnSimulation } from '../../logics/swapBurnSimulation';
import { swapGetSimulation } from '../../logics/swapGetSimulation';
import { validateBurnAmount } from '../../logics/validateBurnAmount';
import { SwapSimulation } from '../../models/swapSimulation';
import { BurnSwitch } from '../BurnSwitch';
import { ConvertSymbols, ConvertSymbolsContainer } from '../ConvertSymbols';
import { BurnComponent } from './types';
import styled, { useTheme } from 'styled-components';
import { fixHMR } from 'fix-hmr';
import { useFeeEstimationFor } from '@libs/app-provider';
import { useAlert } from '@libs/neumorphism-ui/components/useAlert';
import { floor } from '@libs/big-math';
import { MsgExecuteContract } from '@terra-money/terra.js';
import { createHookMsg } from '@libs/app-fns/tx/internal';
import { CircleSpinner } from 'react-spinners-kit';

export interface SwapProps extends BurnComponent {
  className?: string;
}

const SLIPPAGE_VALUES = [0.01, 0.03, 0.05];
const LOW_SLIPPAGE = 0.03;
const FRONTRUN_SLIPPAGE = 0.15;

export function Component({
  className,
  burnAmount,
  getAmount,
  setGetAmount,
  setBurnAmount,
  setMode,
}: SwapProps) {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const { availablePost, connected, terraWalletAddress } = useAccount();

  const {
    queryClient,
    contractAddress: address,
    contractAddress,
  } = useAnchorWebapp();

  const [estimatedFee, estimatedFeeError, estimateFee] =
    useFeeEstimationFor(terraWalletAddress);

  const [swap, swapResult] = useBondSwapTx();

  const [openAlert, alertElement] = useAlert();

  // ---------------------------------------------
  // states
  // ---------------------------------------------
  const [slippage, setSlippage] = useState<number>(0.05);

  const [resolveSimulation, simulation] = useResolveLast<
    SwapSimulation<Luna, aLuna> | undefined | null
  >(() => null);

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const bank = useAnchorBank();

  // ---------------------------------------------
  // logics
  // ---------------------------------------------
  const invalidTxFee = useMemo(
    () =>
      connected && validateTxFee(bank.tokenBalances.uUST, estimatedFee?.txFee),
    [bank, estimatedFee?.txFee, connected],
  );

  const invalidBurnAmount = useMemo(
    () => connected && validateBurnAmount(burnAmount, bank),
    [bank, burnAmount, connected],
  );

  // ---------------------------------------------
  // effects
  // ---------------------------------------------
  useEffect(() => {
    if (simulation?.getAmount) {
      setGetAmount(formatLunaInput(demicrofy(simulation?.getAmount)));
    }
  }, [setGetAmount, simulation?.getAmount]);

  useEffect(() => {
    if (simulation?.burnAmount) {
      setBurnAmount(formatLunaInput(demicrofy(simulation?.burnAmount)));
    }
  }, [setBurnAmount, simulation?.burnAmount]);

  // ---------------------------------------------
  // callbacks
  // ---------------------------------------------
  const updateBurnAmount = useCallback(
    async (nextBurnAmount: string, maxSpread: number) => {
      if (nextBurnAmount.trim().length === 0 || !queryClient) {
        setGetAmount('' as Luna);
        setBurnAmount('' as aLuna);

        resolveSimulation(null);
      } else if (isZero(nextBurnAmount)) {
        setGetAmount('' as Luna);
        setBurnAmount(nextBurnAmount as aLuna);

        resolveSimulation(null);
      } else {
        const burnAmount: aLuna = nextBurnAmount as aLuna;
        setBurnAmount(burnAmount);

        const amount = microfy(burnAmount).toString() as u<aLuna>;

        resolveSimulation(
          terraswapSimulationQuery(
            address.terraswap.alunaLunaPair,
            {
              info: {
                token: {
                  contract_addr: address.cw20.aLuna,
                },
              },
              amount,
            },
            queryClient,
          ).then(({ simulation }) => {
            return simulation
              ? swapGetSimulation(
                  simulation as terraswap.pair.SimulationResponse<Luna>,
                  amount,
                  bank.tax,
                  maxSpread,
                )
              : undefined;
          }),
        );
      }
    },
    [
      address.cw20.aLuna,
      address.terraswap.alunaLunaPair,
      bank.tax,
      queryClient,
      resolveSimulation,
      setBurnAmount,
      setGetAmount,
    ],
  );

  const updateGetAmount = useCallback(
    (nextGetAmount: string, maxSpread: number) => {
      if (nextGetAmount.trim().length === 0 || !queryClient) {
        setBurnAmount('' as aLuna);
        setGetAmount('' as Luna);

        resolveSimulation(null);
      } else if (isZero(nextGetAmount)) {
        setBurnAmount('' as aLuna);
        setGetAmount(nextGetAmount as Luna);

        resolveSimulation(null);
      } else {
        const getAmount: Luna = nextGetAmount as Luna;
        setGetAmount(getAmount);

        const amount = microfy(getAmount).toString() as u<Luna>;

        resolveSimulation(
          terraswapSimulationQuery(
            address.terraswap.alunaLunaPair,
            {
              info: {
                native_token: {
                  denom: 'uluna' as NativeDenom,
                },
              },
              amount,
            },
            queryClient,
          ).then(({ simulation }) => {
            return simulation
              ? swapBurnSimulation(
                  simulation as terraswap.pair.SimulationResponse<Luna>,
                  amount,
                  bank.tax,
                  maxSpread,
                )
              : undefined;
          }),
        );
      }
    },
    [
      address.terraswap.alunaLunaPair,
      bank.tax,
      queryClient,
      resolveSimulation,
      setBurnAmount,
      setGetAmount,
    ],
  );

  const updateSlippage = useCallback(
    (nextSlippage: number) => {
      setSlippage(nextSlippage);
      updateBurnAmount(burnAmount, nextSlippage);
    },
    [burnAmount, updateBurnAmount],
  );

  const init = useCallback(() => {
    setGetAmount('' as Luna);
    setBurnAmount('' as aLuna);
  }, [setGetAmount, setBurnAmount]);

  const proceed = useCallback(
    async (burnAmount: aLuna, beliefPrice: Rate, maxSpread: number) => {
      if (!connected || !swap || !terraWalletAddress) {
        return;
      }

      if (estimatedFee) {
        swap({
          burnAmount,
          gasWanted: estimatedFee.gasWanted,
          txFee: estimatedFee.txFee,
          beliefPrice: formatExecuteMsgNumber(big(1).div(beliefPrice)) as Rate,
          maxSpread,
          onTxSucceed: () => {
            init();
          },
        });
      } else {
        await openAlert({
          description: (
            <>
              Broadcasting failed,
              <br />
              please retry after some time.
            </>
          ),
          agree: 'OK',
        });
      }
    },
    [connected, swap, init, estimatedFee, openAlert, terraWalletAddress],
  );

  // ---------------------------------------------
  // effects
  // ---------------------------------------------

  useEffect(() => {
    if (!connected || burnAmount.length === 0) {
      estimateFee(null);
      return;
    }

    const amount = floor(big(burnAmount).mul(MICRO));

    if (amount.lt(0) || amount.gt(bank.tokenBalances.uaLuna ?? 0)) {
      estimateFee(null);
      return;
    }

    estimateFee([
      new MsgExecuteContract(
        terraWalletAddress as string,
        contractAddress.cw20.aLuna,
        {
          send: {
            contract: contractAddress.terraswap.alunaLunaPair,
            amount,
            msg: createHookMsg({
              swap: {
                belief_price: simulation?.beliefPrice,
                max_spread: slippage,
              },
            }),
          },
        },
      ),
    ]);
  }, [
    terraWalletAddress,
    bank.tokenBalances.uaLuna,
    burnAmount,
    connected,
    simulation?.beliefPrice,
    contractAddress.aluna.hub,
    contractAddress.cw20.aLuna,
    contractAddress.terraswap.alunaLunaPair,
    estimateFee,
    slippage,
  ]);

  useEffect(() => {
    if (burnAmount.length > 0) {
      updateBurnAmount(burnAmount, slippage);
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  const theme = useTheme();

  if (
    swapResult?.status === StreamStatus.IN_PROGRESS ||
    swapResult?.status === StreamStatus.DONE
  ) {
    return (
      <TxResultRenderer
        resultRendering={swapResult.value}
        onExit={() => {
          init();
          switch (swapResult.status) {
            case StreamStatus.IN_PROGRESS:
              swapResult.abort();
              break;
            case StreamStatus.DONE:
              swapResult.clear();
              break;
          }
        }}
      />
    );
  }

  return (
    <div className={className}>
      {!!invalidTxFee && <MessageBox>{invalidTxFee}</MessageBox>}

      <ConvertSymbolsContainer>
        <ConvertSymbols
          className="symbols"
          view="burn"
          fromIcon={<TokenIcon token="luna" />}
          toIcon={<TokenIcon token="aluna" />}
        />
      </ConvertSymbolsContainer>

      {/* Burn (bAsset) */}
      <div className="burn-description">
        <p>I want to burn</p>
        <p />
      </div>

      <SelectAndTextInputContainer
        className="burn"
        gridColumns={[140, '1fr']}
        error={!!invalidBurnAmount}
        leftHelperText={invalidBurnAmount}
        rightHelperText={
          connected && (
            <span>
              Balance:{' '}
              <span
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() =>
                  updateBurnAmount(
                    formatLunaInput(demicrofy(bank.tokenBalances.uaLuna)),
                    slippage,
                  )
                }
              >
                {formatLuna(demicrofy(bank.tokenBalances.uaLuna))} aLuna
              </span>
            </span>
          )
        }
      >
        <SelectAndTextInputContainerLabel>
          <TokenIcon token="aluna" /> aLuna
        </SelectAndTextInputContainerLabel>
        <NumberMuiInput
          placeholder="0.00"
          error={!!invalidBurnAmount}
          value={burnAmount}
          maxIntegerPoinsts={LUNA_INPUT_MAXIMUM_INTEGER_POINTS}
          maxDecimalPoints={LUNA_INPUT_MAXIMUM_DECIMAL_POINTS}
          onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
            updateBurnAmount(target.value, slippage)
          }
        />
      </SelectAndTextInputContainer>

      <IconLineSeparator />

      {/* Get (Asset) */}
      <div className="gett-description">
        <p>and get</p>
        <p />
      </div>

      <SelectAndTextInputContainer
        className="gett"
        gridColumns={[140, '1fr']}
        error={!!invalidBurnAmount}
      >
        <SelectAndTextInputContainerLabel>
          <TokenIcon token="luna" /> Luna
        </SelectAndTextInputContainerLabel>
        <NumberMuiInput
          placeholder="0.00"
          error={!!invalidBurnAmount}
          value={getAmount}
          maxIntegerPoinsts={LUNA_INPUT_MAXIMUM_INTEGER_POINTS}
          maxDecimalPoints={LUNA_INPUT_MAXIMUM_DECIMAL_POINTS}
          onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
            updateGetAmount(target.value, slippage)
          }
        />
      </SelectAndTextInputContainer>

      <HorizontalHeavyRuler />

      <BurnSwitch
        className="switch"
        style={{ marginBottom: 20 }}
        mode="swap"
        onChange={(mode: any) => mode === 'burn' && setMode('burn')}
      />

      <DiscloseSlippageSelector
        className="slippage"
        items={SLIPPAGE_VALUES}
        value={slippage}
        onChange={updateSlippage}
        helpText={
          slippage < LOW_SLIPPAGE ? (
            <SlippageSelectorNegativeHelpText>
              The transaction may fail
            </SlippageSelectorNegativeHelpText>
          ) : slippage > FRONTRUN_SLIPPAGE ? (
            <SlippageSelectorNegativeHelpText>
              The transaction may be frontrun
            </SlippageSelectorNegativeHelpText>
          ) : undefined
        }
      />

      <div className="guide" style={{ marginBottom: 40 }}>
        <h4>
          <InfoOutlined /> Instant burn
        </h4>
        <ul>
          <li>
            Instant burn may lead to additional fees, resulting in less Luna
            received.
          </li>
        </ul>
      </div>

      {burnAmount.length > 0 && simulation && (
        <TxFeeList className="receipt">
          <SwapListItem
            label="Price"
            currencyA="bLUNA"
            currencyB="LUNA"
            exchangeRateAB={simulation.beliefPrice}
            initialDirection="a/b"
            formatExchangeRate={(price) =>
              formatFluidDecimalPoints(
                price,
                LUNA_INPUT_MAXIMUM_DECIMAL_POINTS,
                { delimiter: true },
              )
            }
          />
          <TxFeeListItem label="Minimum Received">
            {formatLuna(demicrofy(simulation.minimumReceived))} LUNA
          </TxFeeListItem>
          <TxFeeListItem label="Trading Fee">
            {formatLuna(demicrofy(simulation.swapFee))} LUNA
          </TxFeeListItem>
          <TxFeeListItem label="Tx Fee">
            {!estimatedFeeError && !estimatedFee && (
              <span className="spinner">
                <CircleSpinner size={14} color={theme.colors.positive} />
              </span>
            )}
            {estimatedFee &&
              `≈ ${formatLuna(demicrofy(estimatedFee.txFee))} Luna`}{' '}
            {estimatedFeeError}
          </TxFeeListItem>
        </TxFeeList>
      )}

      {/* Submit */}
      <ViewAddressWarning>
        <ActionButton
          className="submit"
          disabled={
            !availablePost ||
            !connected ||
            !swap ||
            !simulation ||
            burnAmount.length === 0 ||
            big(burnAmount).lte(0) ||
            !!invalidTxFee ||
            !!invalidBurnAmount ||
            big(simulation?.swapFee ?? 0).lte(0)
          }
          onClick={() =>
            simulation && proceed(burnAmount, simulation.beliefPrice, slippage)
          }
        >
          Burn
        </ActionButton>
      </ViewAddressWarning>
      {alertElement}
    </div>
  );
}

const StyledComponent = styled(Component)`
  .burn,
  .gett {
    img {
      font-size: 12px;
    }
  }
`;

export const Swap = fixHMR(StyledComponent);
