export interface SetupPreset { id: string; name: string; type: "REGULAR" | "GOAL"; emoji: string; suggestedMonthlyAud: number; defaultSelected: boolean; }
export const AUSTRALIAN_FAMILY_PRESETS: readonly SetupPreset[] = [
  { id: "mortgage", name: "Mortgage / Rent", type: "REGULAR", emoji: "🏡", suggestedMonthlyAud: 2200, defaultSelected: true },
  { id: "electricity", name: "Electricity", type: "REGULAR", emoji: "⚡", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "gas", name: "Gas", type: "REGULAR", emoji: "🔥", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "water", name: "Water", type: "REGULAR", emoji: "💧", suggestedMonthlyAud: 70, defaultSelected: false },
  { id: "council-rates", name: "Council Rates", type: "REGULAR", emoji: "🏛️", suggestedMonthlyAud: 170, defaultSelected: true },
  { id: "home-insurance", name: "Home & Contents Insurance", type: "REGULAR", emoji: "🛡️", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "car-insurance", name: "Car Insurance", type: "REGULAR", emoji: "🚗", suggestedMonthlyAud: 120, defaultSelected: true },
  { id: "car-rego", name: "Car Registration", type: "REGULAR", emoji: "📋", suggestedMonthlyAud: 70, defaultSelected: true },
  { id: "health-insurance", name: "Private Health Insurance", type: "REGULAR", emoji: "🏥", suggestedMonthlyAud: 280, defaultSelected: true },
  { id: "internet", name: "Internet", type: "REGULAR", emoji: "📡", suggestedMonthlyAud: 80, defaultSelected: true },
  { id: "mobile-phones", name: "Mobile Phone(s)", type: "REGULAR", emoji: "📱", suggestedMonthlyAud: 60, defaultSelected: true },
  { id: "streaming", name: "Streaming Services", type: "REGULAR", emoji: "📺", suggestedMonthlyAud: 40, defaultSelected: false },
  { id: "school-fees", name: "School Fees", type: "REGULAR", emoji: "🎓", suggestedMonthlyAud: 500, defaultSelected: false },
  { id: "childcare", name: "Childcare / After School", type: "REGULAR", emoji: "👶", suggestedMonthlyAud: 800, defaultSelected: false },
  { id: "gym", name: "Gym / Sports Membership", type: "REGULAR", emoji: "💪", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "emergency", name: "Emergency Fund", type: "GOAL", emoji: "🆘", suggestedMonthlyAud: 200, defaultSelected: true },
  { id: "car-replacement", name: "Car Replacement Fund", type: "GOAL", emoji: "🚙", suggestedMonthlyAud: 150, defaultSelected: false },
  { id: "holiday", name: "Holiday Fund", type: "GOAL", emoji: "✈️", suggestedMonthlyAud: 100, defaultSelected: false },
  { id: "christmas", name: "Christmas / Birthdays", type: "GOAL", emoji: "🎄", suggestedMonthlyAud: 80, defaultSelected: false }
] as const;
