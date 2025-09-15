export enum PhaseColor {
  LIQUIDITY = "rgb(243,231,169)",
  TRADING = "rgb(243, 121, 12)",
  MATURITY = "rgb(243, 65, 32)",
  SETTLEMENT = "rgb(197, 30, 72)",
}

export const colors = {
  main: PhaseColor.LIQUIDITY as string,
  orange: PhaseColor.TRADING as string,
  red: PhaseColor.MATURITY as string,
  deepRed: PhaseColor.SETTLEMENT as string,
};
