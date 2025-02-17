import { Chain, DeploymentTarget } from "@anchor-protocol/app-provider";
import { EvmChainId } from "@anchor-protocol/crossanchor-sdk";
import { CW20Addr, ERC20Addr } from "@anchor-protocol/types";
import {
  ChainId,
  CHAIN_ID_AVAX,
  CHAIN_ID_ETH,
  CHAIN_ID_ETHEREUM_ROPSTEN,
  CHAIN_ID_TERRA,
  getEmitterAddressTerra,
  getForeignAssetEth,
  getOriginalAssetTerra,
  hexToUint8Array,
  uint8ArrayToNative,
} from "@certusone/wormhole-sdk";
import { BaseProvider } from "@ethersproject/providers";
import { LCDClient } from "@terra-money/terra.js";
import { NetworkInfo } from "@terra-money/wallet-provider";
import { ethers } from "ethers";
import { WhitelistCollateral } from "queries";

export type BridgeAssets = Map<CW20Addr, CW20Addr | ERC20Addr>;

export function bridgeAssetsQuery(
  whitelist: WhitelistCollateral[] | undefined,
  target: DeploymentTarget,
  network: NetworkInfo
): Promise<BridgeAssets | undefined> {
  if (whitelist === undefined) {
    return Promise.resolve(undefined);
  }

  if (target.isNative) {
    // this will make the code easier later on
    // if we can always rely on this bridge being set
    return Promise.resolve(bridgeTerraAssetsQuery(whitelist));
  }

  if (target.isEVM) {
    return bridgeEvmAssetsQuery(whitelist, target, network);
  }

  throw Error("Oops, something isn't supported here.");
}

function bridgeTerraAssetsQuery(
  whitelist: WhitelistCollateral[]
): BridgeAssets {
  return new Map<CW20Addr, CW20Addr | ERC20Addr>(
    whitelist.map((elem) => [elem.collateral_token, elem.collateral_token])
  );
}

async function bridgeEvmAssetsQuery(
  whitelist: WhitelistCollateral[],
  target: DeploymentTarget,
  network: NetworkInfo
): Promise<BridgeAssets> {
  const lcd = new LCDClient({
    URL: network.lcd,
    chainID: network.chainID,
  });

  const provider = ethers.getDefaultProvider(getEvmChainId(target, network));

  const wormholeChainId = getWormholeChainId(target, network);

  const promises = await Promise.allSettled(
    whitelist.map((collateral) =>
      fetchEvmAddr(
        lcd,
        wormholeChainId,
        provider,
        network,
        collateral.collateral_token
      )
    )
  );

  const map = promises.reduce((previous, current) => {
    if (current.status === "fulfilled" && current.value !== undefined) {
      previous = [
        ...previous,
        [current.value[0] as CW20Addr, current.value[1] as ERC20Addr],
      ];
    }
    return previous;
  }, [] as Array<[CW20Addr, CW20Addr | ERC20Addr]>);

  return new Map<CW20Addr, CW20Addr | ERC20Addr>(map);
}

const fetchEvmAddr = async (
  lcd: LCDClient,
  wormholeChainId: ChainId,
  provider: BaseProvider,
  network: NetworkInfo,
  tokenAddr: string
) => {
  const ETH_ADDR_ZERO = "0x0000000000000000000000000000000000000000";

  const wormhole = await getOriginalAssetTerra(lcd as any, tokenAddr);
  if (wormhole.isWrapped) {
    // the token is wrapped on terra which means this
    // the information we get back is the original
    if (wormhole.chainId === wormholeChainId) {
      return [
        tokenAddr,
        uint8ArrayToNative(
          wormhole.assetAddress,
          wormhole.chainId
        ) as ERC20Addr,
      ];
    }
    return undefined;
  }

  // the token is on Terra so need to check if
  // it is wrapped onto our selected chain
  const foreignAsset = await getForeignAssetEth(
    network.chainID === "bombay-12"
      ? "0x61E44E506Ca5659E6c0bba9b678586fA2d729756"
      : "0x0e082F06FF657D94310cB8cE8B0D9a04541d8052",
    provider,
    CHAIN_ID_TERRA,
    hexToUint8Array(await getEmitterAddressTerra(tokenAddr))
  );
  if (foreignAsset && foreignAsset !== ETH_ADDR_ZERO) {
    return [tokenAddr, foreignAsset as ERC20Addr];
  }

  return undefined;
};

const getWormholeChainId = (
  target: DeploymentTarget,
  network: NetworkInfo
): ChainId => {
  switch (target.chain) {
    case Chain.Ethereum:
      return network.name === "testnet"
        ? CHAIN_ID_ETHEREUM_ROPSTEN
        : CHAIN_ID_ETH;
    case Chain.Avalanche:
      return CHAIN_ID_AVAX;
  }
  return CHAIN_ID_ETH;
};

const getEvmChainId = (
  target: DeploymentTarget,
  network: NetworkInfo
): number | string => {
  switch (target.chain) {
    case Chain.Ethereum:
      return network.name === "testnet"
        ? EvmChainId.ETHEREUM_ROPSTEN
        : EvmChainId.ETHEREUM;
    case Chain.Avalanche:
      // ethers doesnt recognize many chains
      return network.name === "testnet"
        ? "https://api.avax-test.network/ext/bc/C/rpc"
        : "https://api.avax.network/ext/bc/C/rpc";
  }
  return EvmChainId.ETHEREUM;
};
