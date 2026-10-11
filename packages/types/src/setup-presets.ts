export interface SetupPreset {
  id: string;
  name: string;
  type: "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  emoji: string;
  suggestedMonthlyAud: number;
  defaultSelected: boolean;
}
export const AUSTRALIAN_FAMILY_PRESETS: readonly SetupPreset[] = [
  { id: "mortgage", name: "Mortgage / Rent", type: "SCHEDULED_BILL", emoji: "🏡", suggestedMonthlyAud: 2200, defaultSelected: true },
  { id: "electricity", name: "Electricity", type: "SCHEDULED_BILL", emoji: "⚡", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "gas", name: "Gas", type: "SCHEDULED_BILL", emoji: "🔥", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "water", name: "Water", type: "SCHEDULED_BILL", emoji: "💧", suggestedMonthlyAud: 70, defaultSelected: false },
  { id: "council-rates", name: "Council Rates", type: "SCHEDULED_BILL", emoji: "🏛️", suggestedMonthlyAud: 170, defaultSelected: true },
  { id: "home-insurance", name: "Home & Contents Insurance", type: "SCHEDULED_BILL", emoji: "🛡️", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "car-insurance", name: "Car Insurance", type: "SCHEDULED_BILL", emoji: "🚗", suggestedMonthlyAud: 120, defaultSelected: true },
  { id: "car-rego", name: "Car Registration", type: "SCHEDULED_BILL", emoji: "📋", suggestedMonthlyAud: 70, defaultSelected: true },
  { id: "health-insurance", name: "Private Health Insurance", type: "SCHEDULED_BILL", emoji: "🏥", suggestedMonthlyAud: 280, defaultSelected: true },
  { id: "internet", name: "Internet", type: "SCHEDULED_BILL", emoji: "📡", suggestedMonthlyAud: 80, defaultSelected: true },
  { id: "mobile-phones", name: "Mobile Phone(s)", type: "SCHEDULED_BILL", emoji: "📱", suggestedMonthlyAud: 60, defaultSelected: true },
  { id: "streaming", name: "Streaming Services", type: "SCHEDULED_BILL", emoji: "📺", suggestedMonthlyAud: 40, defaultSelected: false },
  { id: "school-fees", name: "School Fees", type: "SCHEDULED_BILL", emoji: "🎓", suggestedMonthlyAud: 500, defaultSelected: false },
  { id: "childcare", name: "Childcare / After School", type: "SCHEDULED_BILL", emoji: "👶", suggestedMonthlyAud: 800, defaultSelected: false },
  { id: "gym", name: "Gym / Sports Membership", type: "SCHEDULED_BILL", emoji: "💪", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "emergency", name: "Emergency Fund", type: "TARGET_GOAL", emoji: "🆘", suggestedMonthlyAud: 200, defaultSelected: true },
  { id: "car-replacement", name: "Car Replacement Fund", type: "TARGET_GOAL", emoji: "🚙", suggestedMonthlyAud: 150, defaultSelected: false },
  { id: "holiday", name: "Holiday Fund", type: "TARGET_GOAL", emoji: "✈️", suggestedMonthlyAud: 100, defaultSelected: false },
  { id: "christmas", name: "Christmas / Birthdays", type: "TARGET_GOAL", emoji: "🎄", suggestedMonthlyAud: 80, defaultSelected: false }
] as const;
