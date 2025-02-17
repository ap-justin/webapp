import { useNetwork } from '@anchor-protocol/app-provider';
import { DeploymentSwitch } from 'components/layouts/DeploymentSwitch';
import { useMenus, RouteMenu } from 'configurations/menu';
import { screen } from 'env';
import React from 'react';
import { Link, useMatch } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import LogoAvax from './assets/LogoAvax.svg';
import LogoEth from './assets/LogoEth.svg';
import LogoTerra from './assets/LogoTerra.svg';
import { ChainSelector } from './chain/ChainSelector';
import { DesktopNotification } from './desktop/DesktopNotification';
import { TerraWalletSelector } from './wallet/terra/TerraWalletSelector';

export interface DesktopHeaderProps {
  className?: string;
}

function DesktopHeaderBase({ className }: DesktopHeaderProps) {
  const menus = useMenus(); 

  const {network} = useNetwork();

  return (
    <>
      {
        network.name != "mainnet" && 
        <div style={{color: "white", backgroundColor:"red", textAlign:"center", padding: "5px"}}> 
          You are not on Terra Mainnet. 
          You can still interact with the platform if it exists on the chain you are using
        </div>
      }
    <header className={className} style={{position: "relative"}}>
      <a
        className="logo"
        href="https://cavernprotocol.com/"
        target="_blank"
        rel="noreferrer"
      >
        <DeploymentSwitch
          terra={() => <img src={LogoTerra} alt="terraLogo" height="24px"/>}
          ethereum={() => <img src={LogoEth} alt="ethLogo" />}
          avalanche={() => <img src={LogoAvax} alt="avaxLogo" />}
        />
      </a>

      <nav className="menu">
        {menus.map((itemMenu) => (
          <NavMenu key={'menu-' + itemMenu.to} {...itemMenu} />
        ))}
      </nav>

      <div />

      <DesktopNotification className="notification" />

      <section
        className="wallet"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <ChainSelector className="chain-selector" />
        <DeploymentSwitch
          terra={() => <TerraWalletSelector />}
        />
      </section>

      <GlobalStyle />
    </header>
    </>
  );
}

function NavMenu({ to, title }: RouteMenu) {
  const match = useMatch({
    path: to,
  });

  return (
    <div data-active={!!match}>
      <Link to={to}>{title}</Link>
    </div>
  );
}

const GlobalStyle = createGlobalStyle`
  @media (max-width: ${screen.tablet.max}px) {
    body {
      padding-bottom: 60px;
    }
  }
`;

const desktopLayoutBreak = 1180;
const mobileLayoutBreak = 950;

export const DesktopHeader = styled(DesktopHeaderBase)`
  // ---------------------------------------------
  // style
  // ---------------------------------------------
  background-color: ${({ theme }) => theme.header.backgroundColor};

  header {
    position: relative;
  }

  a {
    text-decoration: none;
  }

  .menu {
    > div {
      padding: 6px 12px;

      display: flex;
      align-items: center;

      a {
        color: rgba(255, 255, 255, 0.4);
        font-size: 18px;
        font-weight: 900;

        text-decoration: none;
      }

      &[data-active='true'] {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        background: ${({ theme }) => theme.backgroundColor};

        opacity: 1;

        a {
          color: ${({ theme }) => theme.textColor};
        }
      }
    }
  }

  // ---------------------------------------------
  // layout
  // ---------------------------------------------
  display: flex;
  //justify-content: space-between;
  align-items: flex-end;

  height: 88px;

  .menu {
    word-break: keep-all;
    white-space: nowrap;

    display: flex;

    > div {
      a:first-child {
        font-size: 18px;
      }
    }
  }

  > div:empty {
    flex: 1;
  }

  .notification {
    margin-right: 5px;
  }

  .wallet {
    padding-bottom: 8px;
    text-align: right;

    .chain-selector {
      margin-right: 5px;
    }

    .transaction-widget {
      margin-right: 5px;
    }
  }

  .logo {
    position: absolute;
    top: 13px;
    left: 100px;

    transition: transform 0.17s ease-in-out;
    transform-origin: center;

    &:hover {
      transform: scale(1.1);
    }
  }

  @media (min-width: ${desktopLayoutBreak}px) {
    padding: 0 100px;
  }

  @media (max-width: ${desktopLayoutBreak}px) {
    padding: 0 100px;
  }

  @media (max-width: ${mobileLayoutBreak}px) {
    justify-content: space-between;

    padding: 0 40px;

    .logo {
      left: 40px;
    }

    //.wallet {
    //  display: none;
    //}
  }
`;
