import { useFormatters } from '@anchor-protocol/formatter/useFormatters';
import { UIElementProps } from '@libs/ui';
import { Tooltip } from '@mui/material';
import { Launch, AddCircle, CheckCircle } from '@mui/icons-material';
import big from 'big.js';
import { BuyButton } from 'components/BuyButton';
import { useBalances } from 'contexts/balances';
import React, { useState } from 'react';
import styled from 'styled-components';
import kado from 'pages/earn/components/assets/kado.svg';

type Action = () => void;

export type TokenListType = 'UST' | 'aUST' | 'ANC';

const AddButton = (props: { onClick: () => void }) => {
  const { onClick } = props;

  const [clicked, setClicked] = useState(false);

  return (
    <Tooltip title="Add to Wallet" placement="top">
      <>
        {clicked === false && (
          <AddCircle
            className="add-button"
            onClick={() => {
              onClick();
              setClicked(true);
            }}
          />
        )}
        {clicked && <CheckCircle className="add-button" onClick={onClick} />}
      </>
    </Tooltip>
  );
};

interface TokenListProps extends UIElementProps {
  onClose: Action;
  onBuyUST?: Action;
  onAddToken?: (token: TokenListType) => void;
}

export function TokenListBase(props: TokenListProps) {
  const { className, onClose, onBuyUST, onAddToken } = props;

  const { uUST, uaUST, uNative } = useBalances();

  const formatters = useFormatters();

  return (
    <ul className={className}>
      <li>
        <span>{formatters.native.symbol}</span>
        <span>
          {formatters.native.formatOutput(formatters.native.demicrofy(uNative))}
        </span>
      </li>
      {(big(uUST).gt(0) || onAddToken) && (
        <li>
          <span className="symbol">
            {onAddToken && <AddButton onClick={() => onAddToken('UST')} />}
            {formatters.ust.symbol}
            {onBuyUST && (
              <BuyButton
                className="buy-button"
                onClick={() => {
                  onBuyUST();
                  onClose();
                }}
              >
                BUY on
              <i style={{marginLeft:"-5px"}}>
                <img src={kado} alt="Kado Ramp" style={{width: "32px", paddingLeft: "10px"}} />
              </i>
              </BuyButton>
            )}
          </span>
          <span>
            {formatters.ust.formatOutput(formatters.ust.demicrofy(uUST))}
          </span>
        </li>
      )}
      {(big(uaUST).gt(0) || onAddToken) && (
        <li>
          <span className="symbol">
            {onAddToken && <AddButton onClick={() => onAddToken('aUST')} />}
            {formatters.aUST.symbol}
          </span>
          <span>
            {formatters.aUST.formatOutput(formatters.aUST.demicrofy(uaUST))}
          </span>
        </li>
      )}
    </ul>
  );
}

export const TokenList = styled(TokenListBase)`
  margin-top: 30px;
  margin-bottom: 10px;

  padding: 0;
  list-style: none;

  font-size: 12px;
  color: ${({ theme }) =>
    theme.palette_type === 'light' ? '#666666' : 'rgba(255, 255, 255, 0.6)'};

  border-top: 1px solid
    ${({ theme }) =>
      theme.palette_type === 'light' ? '#e5e5e5' : 'rgba(255, 255, 255, 0.1)'};

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 35px;

    .symbol {
      display: inline-flex;
      align-items: center;
    }

    .add-button {
      width: 16px;
      height: 16px;
      margin-right: 5px;
      cursor: pointer;
      color: ${({ theme }) => theme.colors.positive};
    }

    .buy-button {
      margin-left: 5px;
    }

    &:not(:last-child) {
      border-bottom: 1px dashed
        ${({ theme }) =>
          theme.palette_type === 'light'
            ? '#e5e5e5'
            : 'rgba(255, 255, 255, 0.1)'};
    }
  }
`;
