/**
 * DCF (Discounted Cash Flow) and EPS Valuation Engine.
 */

export interface ValuationParams {
    baseValue: number;
    growthRate: number;
    terminalMultiple: number;
    discountRate: number;
}

export interface ValuationResult {
    futurePrice: number;
    fairPrice: number;
    pvInterim: number;
    terminalValuePV: number;
}

export const calculateModel = (p: ValuationParams, horizon: number, isFcf = false): ValuationResult => {
    const baseValue = typeof p.baseValue === 'string' ? parseFloat(p.baseValue) || 0 : p.baseValue;
    const growthRate = typeof p.growthRate === 'string' ? parseFloat(p.growthRate) || 0 : p.growthRate;
    const terminalMultiple = typeof p.terminalMultiple === 'string' ? parseFloat(p.terminalMultiple) || 0 : p.terminalMultiple;
    const discountRate = typeof p.discountRate === 'string' ? parseFloat(p.discountRate) || 0 : p.discountRate;

    let pvInterim = 0;
    let runningValue = baseValue;

    // Sum the present value of cash flows for each year in the horizon
    for (let i = 1; i <= horizon; i++) {
        runningValue *= (1 + growthRate / 100);
        // In a True DCF (FCF), we sum the cash flows received. 
        if (isFcf) {
            pvInterim += runningValue / Math.pow(1 + discountRate / 100, i);
        }
    }

    const futurePrice = runningValue * terminalMultiple;
    const terminalValuePV = futurePrice / Math.pow(1 + discountRate / 100, horizon);
    const fairPrice = pvInterim + terminalValuePV;

    return { futurePrice, fairPrice, pvInterim, terminalValuePV };
};
