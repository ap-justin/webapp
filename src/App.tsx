import React from 'react';
import { DeploymentSwitch } from 'components/layouts/DeploymentSwitch';
import { TerraApp } from 'apps/TerraApp';
import { DeploymentTargetProvider } from '@anchor-protocol/app-provider/contexts/target';
import { useChainOptions } from '@terra-money/wallet-provider';
import CssBaseline from '@mui/material/CssBaseline';

export function App() {
  const chainOptions = useChainOptions();

  return (
    <DeploymentTargetProvider>
      <CssBaseline />
      <DeploymentSwitch
        terra={<TerraApp chainOptions={chainOptions} />}
      />
    </DeploymentTargetProvider>
  );
}
