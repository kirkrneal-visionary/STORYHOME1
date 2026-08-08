/**
 * Real-estate finance math for the realtor/broker portal.
 *
 * These functions are the source of truth for the "My Tools" calculators and
 * are intentionally pure (no formatting, no React) so they can be unit-verified
 * in isolation. All monetary inputs are plain numbers in USD; percentages are
 * whole-number percents (e.g. `6.5` means 6.5%, not 0.065).
 *
 * Rounding policy: internal math runs at full floating-point precision. Callers
 * format for display; the only rounding done here is `roundCents` on the values
 * that represent real money so repeated arithmetic does not accumulate
 * sub-cent drift in the amortization schedule.
 */

export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* Amortization / mortgage                                                     */
/* -------------------------------------------------------------------------- */

export type AmortizationInput = {
  /** Total purchase price of the home. */
  homePrice: number;
  /** Down payment in dollars. */
  downPayment: number;
  /** Annual interest rate as a whole percent, e.g. 6.5. */
  annualRatePct: number;
  /** Loan term in years, e.g. 30. */
  termYears: number;
  /** Optional annual property tax in dollars. */
  annualPropertyTax?: number;
  /** Optional annual homeowner's insurance in dollars. */
  annualHomeInsurance?: number;
  /** Optional HOA dues in dollars per month. */
  monthlyHoa?: number;
  /**
   * Optional annual PMI rate as a whole percent of the loan amount. Only
   * applied while the down payment is below 20% of the home price.
   */
  annualPmiPct?: number;
};

export type AmortizationYearRow = {
  year: number;
  /** Interest paid across this year. */
  interestPaid: number;
  /** Principal paid across this year. */
  principalPaid: number;
  /** Loan balance remaining at the end of this year. */
  endingBalance: number;
};

export type AmortizationResult = {
  loanAmount: number;
  /** Principal + interest portion of the monthly payment. */
  monthlyPrincipalInterest: number;
  monthlyPropertyTax: number;
  monthlyHomeInsurance: number;
  monthlyHoa: number;
  /** Initial monthly PMI (drops to 0 once 20% equity is reached). */
  monthlyPmi: number;
  /** Full monthly housing payment (PITI + HOA + PMI). */
  monthlyTotal: number;
  numberOfPayments: number;
  /** Total interest paid over the life of the loan. */
  totalInterest: number;
  /** Total principal repaid — equals the loan amount. */
  totalPrincipal: number;
  /** Total of all principal + interest payments over the life of the loan. */
  totalOfPayments: number;
  /** Per-year aggregated amortization schedule (principal + interest only). */
  schedule: AmortizationYearRow[];
};

/**
 * Fixed-rate monthly principal + interest payment using the standard
 * amortization formula:
 *
 *   M = P · r · (1 + r)^n / ((1 + r)^n − 1)
 *
 * where r is the monthly rate and n the number of payments. Handles the 0%
 * interest edge case (straight-line principal repayment).
 */
export function monthlyMortgagePayment(
  principal: number,
  annualRatePct: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0;

  const n = Math.round(termYears * 12);
  const r = annualRatePct / 100 / 12;

  if (r === 0) return principal / n;

  const growth = Math.pow(1 + r, n);
  return (principal * r * growth) / (growth - 1);
}

/**
 * Full amortization result including a per-year schedule. The schedule is built
 * month-by-month at cent precision so the final balance lands exactly on zero.
 */
export function computeAmortization(
  input: AmortizationInput,
): AmortizationResult {
  const homePrice = Math.max(input.homePrice, 0);
  const downPayment = clamp(input.downPayment, 0, homePrice);
  const loanAmount = roundCents(homePrice - downPayment);
  const n = Math.max(Math.round(input.termYears * 12), 0);
  const r = input.annualRatePct / 100 / 12;

  const monthlyPrincipalInterest = roundCents(
    monthlyMortgagePayment(loanAmount, input.annualRatePct, input.termYears),
  );

  const monthlyPropertyTax = roundCents((input.annualPropertyTax ?? 0) / 12);
  const monthlyHomeInsurance = roundCents(
    (input.annualHomeInsurance ?? 0) / 12,
  );
  const monthlyHoa = roundCents(input.monthlyHoa ?? 0);

  const downPaymentPct = homePrice > 0 ? downPayment / homePrice : 0;
  const pmiApplies = downPaymentPct < 0.2 && loanAmount > 0;
  const monthlyPmi = pmiApplies
    ? roundCents((loanAmount * ((input.annualPmiPct ?? 0) / 100)) / 12)
    : 0;

  const schedule: AmortizationYearRow[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  let yearInterest = 0;
  let yearPrincipal = 0;

  for (let month = 1; month <= n && balance > 0; month += 1) {
    const interest = roundCents(balance * r);
    let principalPortion = roundCents(monthlyPrincipalInterest - interest);

    // The final payment (and any overshoot) settles the exact remaining
    // balance — this is how a fixed-payment loan actually closes out, so
    // cent-rounding drift never leaves a residual balance.
    if (month === n || principalPortion > balance) principalPortion = balance;

    balance = roundCents(balance - principalPortion);
    totalInterest = roundCents(totalInterest + interest);
    yearInterest = roundCents(yearInterest + interest);
    yearPrincipal = roundCents(yearPrincipal + principalPortion);

    if (month % 12 === 0 || month === n || balance <= 0) {
      schedule.push({
        year: Math.ceil(month / 12),
        interestPaid: yearInterest,
        principalPaid: yearPrincipal,
        endingBalance: balance,
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  const totalPrincipal = roundCents(loanAmount - balance);
  const totalOfPayments = roundCents(totalPrincipal + totalInterest);

  const monthlyTotal = roundCents(
    monthlyPrincipalInterest +
      monthlyPropertyTax +
      monthlyHomeInsurance +
      monthlyHoa +
      monthlyPmi,
  );

  return {
    loanAmount,
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyHomeInsurance,
    monthlyHoa,
    monthlyPmi,
    monthlyTotal,
    numberOfPayments: n,
    totalInterest,
    totalPrincipal,
    totalOfPayments,
    schedule,
  };
}

/* -------------------------------------------------------------------------- */
/* Cap rate / NOI                                                              */
/* -------------------------------------------------------------------------- */

export type CapRateInput = {
  /** Purchase price / current property value. */
  purchasePrice: number;
  /** Scheduled monthly rent. */
  monthlyRent: number;
  /** Other monthly income (parking, laundry, storage, etc.). */
  otherMonthlyIncome?: number;
  /** Vacancy + credit loss as a whole percent of gross scheduled income. */
  vacancyRatePct?: number;
  /** Annual property tax in dollars. */
  annualPropertyTax?: number;
  /** Annual insurance in dollars. */
  annualInsurance?: number;
  /** Annual repairs & maintenance in dollars. */
  annualMaintenance?: number;
  /** Property management fee as a whole percent of effective gross income. */
  managementFeePct?: number;
  /** Annual HOA dues in dollars. */
  annualHoa?: number;
  /** Annual owner-paid utilities in dollars. */
  annualUtilities?: number;
  /** Any other annual operating expenses in dollars. */
  annualOtherExpenses?: number;
};

export type CapRateResult = {
  /** Annual gross scheduled income: (rent + other) × 12. */
  grossScheduledIncome: number;
  /** Annual vacancy & credit loss. */
  vacancyLoss: number;
  /** Effective gross income: GSI − vacancy loss. */
  effectiveGrossIncome: number;
  /** Annual management fee (percent of EGI). */
  managementFee: number;
  /** Total annual operating expenses (management fee included). */
  totalOperatingExpenses: number;
  /** Net operating income: EGI − operating expenses (excludes debt service). */
  netOperatingIncome: number;
  /** Monthly net operating income. */
  monthlyNoi: number;
  /** Cap rate as a whole percent: NOI ÷ purchase price × 100. */
  capRatePct: number;
};

/**
 * Cap rate and NOI using the standard income-approach definition. Operating
 * expenses explicitly EXCLUDE mortgage debt service and capital expenditures,
 * which is what makes a cap rate financing-independent.
 */
export function computeCapRate(input: CapRateInput): CapRateResult {
  const monthlyRent = Math.max(input.monthlyRent, 0);
  const otherMonthlyIncome = Math.max(input.otherMonthlyIncome ?? 0, 0);

  const grossScheduledIncome = roundCents(
    (monthlyRent + otherMonthlyIncome) * 12,
  );
  const vacancyLoss = roundCents(
    grossScheduledIncome * (clampPct(input.vacancyRatePct ?? 0) / 100),
  );
  const effectiveGrossIncome = roundCents(grossScheduledIncome - vacancyLoss);

  const managementFee = roundCents(
    effectiveGrossIncome * (clampPct(input.managementFeePct ?? 0) / 100),
  );

  const totalOperatingExpenses = roundCents(
    (input.annualPropertyTax ?? 0) +
      (input.annualInsurance ?? 0) +
      (input.annualMaintenance ?? 0) +
      managementFee +
      (input.annualHoa ?? 0) +
      (input.annualUtilities ?? 0) +
      (input.annualOtherExpenses ?? 0),
  );

  const netOperatingIncome = roundCents(
    effectiveGrossIncome - totalOperatingExpenses,
  );
  const monthlyNoi = roundCents(netOperatingIncome / 12);

  const purchasePrice = Math.max(input.purchasePrice, 0);
  const capRatePct =
    purchasePrice > 0
      ? roundTo((netOperatingIncome / purchasePrice) * 100, 4)
      : 0;

  return {
    grossScheduledIncome,
    vacancyLoss,
    effectiveGrossIncome,
    managementFee,
    totalOperatingExpenses,
    netOperatingIncome,
    monthlyNoi,
    capRatePct,
  };
}

/* -------------------------------------------------------------------------- */
/* Small numeric helpers                                                       */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamp a percent input into the sane 0–100 range. */
function clampPct(value: number): number {
  return clamp(value, 0, 100);
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
