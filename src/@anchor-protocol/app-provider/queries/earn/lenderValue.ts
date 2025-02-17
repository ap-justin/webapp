import { createSimpleQueryFn } from "@libs/react-query-utils";
import { HumanAddr } from "@libs/types";
import { useAccount } from "contexts/account";
import { useQuery, UseQueryResult } from "react-query";
import { useAnchorWebapp } from "../../contexts/context";
import { ANCHOR_QUERY_KEY } from "../../env";
import { RequestQueryBuilder } from "@rewiko/crud-request";

export interface LenderValueData {
  lenderValue: {
    lender: string;
    stableAmount: string;
    aAmount: string;
    lastUpdated: Date;
  };
}

export async function lenderValueQuery(
  lender: HumanAddr | undefined,
  endpoint: string
): Promise<LenderValueData> {
  const emptyValue = {
    lender: "",
    stableAmount: "0",
    aAmount: "0",
    lastUpdated: new Date(Date.now()),
  };

  if (!lender) {
    return {
      lenderValue: emptyValue,
    };
  }

  const qb = RequestQueryBuilder.create();
  qb.setFilter({ field: "lender", operator: "$eq", value: lender });

  return fetch(`${endpoint}/v3/lenders?${qb.query()}`)
    .then((res) => res.json())
    .then((lenderValue) => ({
      lenderValue: lenderValue[0] ?? emptyValue,
    }));
}

const queryFn = createSimpleQueryFn(lenderValueQuery);

export function useLenderValue(): UseQueryResult<LenderValueData | undefined> {
  const { queryErrorReporter, indexerApiEndpoint } = useAnchorWebapp();

  const { terraWalletAddress } = useAccount();

  return useQuery(
    [ANCHOR_QUERY_KEY.EARN_APY_HISTORY, terraWalletAddress, indexerApiEndpoint],
    queryFn,
    {
      refetchInterval: 1000 * 60 * 60,
      keepPreviousData: true,
      onError: queryErrorReporter,
    }
  );
}
