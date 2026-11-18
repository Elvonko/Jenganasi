export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    priceUsdPerYear: 0,
    projectLimit: 1,
    description: "A simple start for your first project.",
    features: ["1 project"],
  },
  {
    id: "pro",
    name: "Pro",
    priceUsdPerYear: 122,
    projectLimit: 10,
    description: "For teams managing several active builds.",
    features: ["Up to 10 projects", "One year of access", "Annual billing"],
  },
  {
    id: "business",
    name: "Business",
    priceUsdPerYear: 201,
    projectLimit: null,
    description: "Room to grow, with no project limit.",
    features: ["Unlimited projects", "One year of access", "Annual billing"],
  },
] as const;

export type PricingPlanId = (typeof pricingPlans)[number]["id"];

export function getPricingPlan(planId: PricingPlanId) {
  const plan = pricingPlans.find(({ id }) => id === planId);
  if (!plan) {
    throw new Error(`Unknown pricing plan: ${planId}`);
  }
  return plan;
}
