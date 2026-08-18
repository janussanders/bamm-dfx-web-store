/** DDR-043 — dfx store only. Caffeine nae7q-… is retired and must not be used. */
export const DFX_STORE_TARGETS = {
  storeUrl: "https://store.bammservice.com/",
  nnsAccountsUrl: "https://nns.internetcomputer.org/accounts",
  backendCanisterId: "5z2v5-uqaaa-aaaao-bbeaq-cai",
  frontendCanisterId: "5xyyv-paaaa-aaaao-bbebq-cai",
  ciIcpAccountId:
    "b2986df0bfef35a077a8d162726433b5a8d852d01cfa9352044c3c38e7dce98e",
  caffeineBackendForbidden: "nae7q-yaaaa-aaaai-atnvq-cai",
  githubRepo: "janussanders/bamm-dfx-web-store",
  sentinelWorkflowFile: "store-cycles-sentinel.yml",
  icDashboardCanister: "https://dashboard.internetcomputer.org/canister",
} as const;

export function icDashboardUrl(canisterId: string): string {
  return `${DFX_STORE_TARGETS.icDashboardCanister}/${canisterId}`;
}

export function sentinelWorkflowUrl(): string {
  const { githubRepo, sentinelWorkflowFile } = DFX_STORE_TARGETS;
  return `https://github.com/${githubRepo}/actions/workflows/${sentinelWorkflowFile}`;
}
