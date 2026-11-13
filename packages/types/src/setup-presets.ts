export interface SetupPreset {
  id: string;
  name: string;
  type: "BILL" | "GOAL";
  fundingMode: "TARGET_BALANCE" | "RECURRING";
  isPriority: boolean;
  emoji: string;
  suggestedMonthlyAud: number;
  defaultSelected: boolean;
}
export const AUSTRALIAN_FAMILY_PRESETS: readonly SetupPreset[] = [
  { id: "mortgage", name: "Mortgage / Rent", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🏡", suggestedMonthlyAud: 2200, defaultSelected: true },
  { id: "electricity", name: "Electricity", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "⚡", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "gas", name: "Gas", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🔥", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "water", name: "Water", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "💧", suggestedMonthlyAud: 70, defaultSelected: false },
  { id: "council-rates", name: "Council Rates", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🏛️", suggestedMonthlyAud: 170, defaultSelected: true },
  { id: "home-insurance", name: "Home & Contents Insurance", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🛡️", suggestedMonthlyAud: 150, defaultSelected: true },
  { id: "car-insurance", name: "Car Insurance", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🚗", suggestedMonthlyAud: 120, defaultSelected: true },
  { id: "car-rego", name: "Car Registration", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "📋", suggestedMonthlyAud: 70, defaultSelected: true },
  { id: "health-insurance", name: "Private Health Insurance", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🏥", suggestedMonthlyAud: 280, defaultSelected: true },
  { id: "medical-pharmacy", name: "Medical & Pharmacy", type: "BILL", fundingMode: "TARGET_BALANCE", isPriority: true, emoji: "💊", suggestedMonthlyAud: 100, defaultSelected: true },
  { id: "internet", name: "Internet", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "📡", suggestedMonthlyAud: 80, defaultSelected: true },
  { id: "mobile-phones", name: "Mobile Phone(s)", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "📱", suggestedMonthlyAud: 60, defaultSelected: true },
  { id: "streaming", name: "Streaming Services", type: "BILL", fundingMode: "RECURRING", isPriority: false, emoji: "📺", suggestedMonthlyAud: 40, defaultSelected: false },
  { id: "school-fees", name: "School Fees", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "🎓", suggestedMonthlyAud: 500, defaultSelected: false },
  { id: "childcare", name: "Childcare / After School", type: "BILL", fundingMode: "RECURRING", isPriority: true, emoji: "👶", suggestedMonthlyAud: 800, defaultSelected: false },
  { id: "gym", name: "Gym / Sports Membership", type: "BILL", fundingMode: "RECURRING", isPriority: false, emoji: "💪", suggestedMonthlyAud: 60, defaultSelected: false },
  { id: "pet-care", name: "Pet Food & Vet Care", type: "BILL", fundingMode: "TARGET_BALANCE", isPriority: false, emoji: "🐾", suggestedMonthlyAud: 120, defaultSelected: false },
  { id: "home-maint", name: "Home & Vehicle Maintenance", type: "BILL", fundingMode: "TARGET_BALANCE", isPriority: false, emoji: "🛠️", suggestedMonthlyAud: 150, defaultSelected: false },
  { id: "emergency", name: "Emergency Fund", type: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: true, emoji: "🆘", suggestedMonthlyAud: 200, defaultSelected: true },
  { id: "car-replacement", name: "Car Replacement Fund", type: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: false, emoji: "🚙", suggestedMonthlyAud: 150, defaultSelected: false },
  { id: "holiday", name: "Holiday Fund", type: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: false, emoji: "✈️", suggestedMonthlyAud: 100, defaultSelected: false },
  { id: "christmas", name: "Christmas / Birthdays", type: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: false, emoji: "🎄", suggestedMonthlyAud: 80, defaultSelected: false }
] as const;
