import { StellarIcon } from "./stellar-icon";
import { UsdcIcon } from "./usdc-icon";

type AssetSymbol = "XLM" | "USDC" | "stellar" | "usdc";

export function AssetIcon({
  asset,
  className,
}: {
  asset: AssetSymbol;
  className?: string;
}) {
  if (asset === "XLM" || asset === "stellar") {
    return <StellarIcon className={className} />;
  }
  return <UsdcIcon className={className} />;
}
