# Product Specification: "Money Matters" 2-Step Interactive Onboarding

## 1. Context & Objective
You are building the critical Day-1 onboarding experience for an Australian personal finance app named "Money Matters". The goal is a "2-Step Instant Value" flow that feels like a gamified, interactive quiz rather than a sterile financial form. 

The user must reach a populated dashboard in under 60 seconds. To achieve this without causing cognitive fatigue, use visual branching logic to ask a few high-value questions and run a background Estimation Engine (Calculator) pre-filled with 2025/2026 Australian benchmark data. The user will be presented with these editable estimates for confirmation at the end of the flow.

---

## 2. Master Category List (The Superset)
The app allocates funds via a 3-bucket waterfall system. All generated categories must map strictly to one of these three types:

### A. REGULAR (Fixed & Semi-Fixed Bills)
*   **Housing:** Mortgage, Rent, Body Corporate/Strata, Council Rates
*   **Utilities:** Electricity, Gas, Water/Sewage
*   **Insurance:** Home & Contents, Health Insurance, Ambulance Cover, Life/Income Protection
*   **Transport:** Car Registration, Car Insurance, Personal/Car Loan Repayments
*   **Connectivity:** Mobile Phones, Home Internet
*   **Family:** Childcare, School Fees
*   **Obligations:** Active Debt (Credit Cards, Loans), Charity/Donations, Family Support
*   **Recurring:** Gym/Fitness, Streaming/Software Subscriptions
*   **Pets:** Pet Insurance, Council Registration

### B. GOAL (Save Toward / Sinking Funds)
*   **Financial Buffers:** Emergency Fund, Tax Obligations, Investment Property Outgoings
*   **Vehicle:** Car Servicing, Tyres, Ad-hoc Repairs, Fines
*   **Health:** Out-of-pocket GPs, Specialists, Pharmacy, Dental, Optical
*   **Lifestyle:** Annual Holidays, Christmas, Birthdays, Housewarmings
*   **Home:** Unexpected Repairs, Major Purchases, Furniture/Appliances
*   **Education:** Extracurricular Classes, School Camps, Uniforms
*   **Pets:** Vet Visits, Emergency Fund (Self-Insurance)

### C. EVERYDAY (Single Discretionary Pool)
*Note: These act as underlying tags/transactions; the bucket is a single aggregated balance.*
*   **Consumables:** Groceries, Household Cleaning, Pet Food & Treats
*   **Dining & Social:** Eating Out, Takeaway, Cafes, Pubs
*   **Transport:** Petrol, EV Charging, Public Transport, Parking, Tolls, Rideshare
*   **Personal:** Clothing, Shoes, Haircuts, Beauty/Grooming
*   **Entertainment:** Movies, Outings, Hobbies
*   **Miscellaneous:** Pocket Money, Gardening, Car Washes

---

## 3. Interactive UI Questionnaire & Branching Logic
Build a multi-step component (e.g., using React Hook Form + Zod) that implements the following progressive disclosure flow.

### Step 1: The Income Engine
*   **Prompt:** "What is your primary take-home pay?"
*   **Inputs:** 
    *   Amount ($)
    *   Frequency (Weekly / Fortnightly / Monthly)
    *   Type (Salary/Wage, Business, Government Benefit/Pension)
*   **Feature:** A subtle `+ Add a partner's income or side-hustle` button. Clicking it reveals identical inputs for a secondary income stream.

### Step 2: The Life-Builder (Interactive Checklist)
Present a visual, icon-driven builder. Tapping a top-level category expands the branch.

**A. Housing**
*   **Top-Level (Single Select):** Own (Mortgage) | Own (Outright) | Rent (Solo/Family) | Rent (Share House)

**B. Getting Around**
*   **Top-Level (Multi-Select):** Car | Public Transport | Rideshare/Taxi
*   **Branching (If Car):**
    *   "How many?" (1, 2, 3+)
    *   For each car, show 3 icons to select size: Small/Hatch | Mid/SUV | Luxury/Large

**C. The Family Unit**
*   **Top-Level:** Kids? (Yes/No)
*   **Branching (If Yes):**
    *   "How many?" (1, 2, 3+)
    *   "Stage?" (Multi-select: Childcare, Primary, Secondary)
    *   If Primary/Secondary: "Type?" (Public, Catholic, Private/Independent)

**D. Health & Wellbeing**
*   **Top-Level:** Private Health Insurance? (Yes/No)
*   **Sub-question:** Gym/Fitness Memberships? (Yes/No)

**E. Debt & Pets**
*   **Pets:** Any pets? (Yes/No) -> If Yes: "How many?"
*   **Debt:** Active Debt (excluding mortgage)? (Yes/No) -> If Yes: Show flat input field "Total minimum monthly repayment? $"

**F. Obligations & Giving**
*   **Top-Level:** Do you regularly support charities or family? (Yes/No)
*   **Branching (If Yes, Multi-select):** Charity/Donations | Supporting Family
*   **Action:** If 'Supporting Family' is checked, show flat input field "Monthly support amount? $"

**G. Everyday Living (Sliders)**
*   **UI:** 3 visual sliders, capturing **weekly** spend, pre-set to Australian averages.
    *   Groceries (Pre-set $270/wk)
    *   Dining & Fun (Pre-set $240/wk)
    *   Personal & Shopping (Pre-set $100/wk)
*   **Feature:** An informational text block appears below: *"We've automatically added a $X/wk buffer for coffees, parking, and incidentals based on your lifestyle."* (This is dynamically calculated).

---

## 4. The Estimation Engine (Calculator)
*Important: All underlying values are based on 2025/2026 Australian Bureau of Statistics (ABS), RACQ, and Finder cost-of-living data. This logic runs in the background to pre-fill the confirmation screen.*

**CRITICAL RULE:** Convert ALL UI selections and slider inputs into **Monthly** estimates before presenting them for confirmation and saving.

**Housing & Utilities (`REGULAR`):**
*   **Rent/Mortgage:** If Rent (Solo) = $2,750. If Rent (Share) = $1,375. (If Mortgage, set default to $3,500).
*   **Utilities (Elec/Gas/Water):** If Rent (Solo/Family) = $280. If Rent (Share) = $140. If Own = $320.
*   **Home Insurance:** If Rent = $50 (Contents). If Own = $180 (Building + Contents).
*   **Council Rates:** If Own = $225. If Rent = $0.
*   **Internet:** Flat $80 across all profiles.

**Transport (`REGULAR`):**
*   **Car 1/2/3:** Generate a combined monthly total per car for Rego, Insurance, Fuel, and basic Servicing:
    *   Small Car = $310/mo 
    *   Mid/SUV = $390/mo 
    *   Luxury/Large = $500/mo 
*   **Public Transport:** Flat $150/mo.
*   **Rideshare:** Flat $100/mo.

**Family Unit (`REGULAR` - Calculated per child):**
*   **Childcare:** $1,200/mo
*   **School Fees:** Public = $100/mo. Catholic = $400/mo. Private = $1,500/mo.
*   **Extracurricular:** $150/mo per child.

**Health & Wellbeing (`REGULAR`):**
*   **Private Health:** Flat $350/mo.
*   **Out of Pocket (Medical):** Flat $100/mo.
*   **Gym/Fitness:** Flat $80/mo.

**Pets, Debt & Obligations (`REGULAR`):**
*   **Pets:** $120/mo per pet.
*   **Debt:** Exact user input value.
*   **Charity:** $50/mo (if checked).
*   **Family Support:** Exact user input value.

**Goal Generation (The Day-1 `GOAL` Sinking Funds):**
To avoid overwhelming the user with 15 micro-categories on Day 1, consolidate their lifestyle inputs into 4 high-level sinking funds with monthly targets:
1.  **Holidays & Travel:** Flat $300/mo.
2.  **Gifts & Celebrations:** Flat $150/mo.
3.  **Vehicle & Home Maintenance:** 
    *   If 'Car' -> Add $50/mo per car (Small), $60 (Mid), or $80 (Luxury).
    *   If 'Own (Outright/Mortgage)' -> Add $150/mo.
4.  **Emergency Buffer:** Flat $250/mo.

**Everyday Pool & Miscellaneous Buffer (`EVERYDAY`):**
1. Convert the weekly slider values to monthly (`WeeklyAmount * (52 / 12)`).
2. Use the **Weighted Discretionary Index** to calculate the hidden lifestyle buffer (`M`) based on the *weekly* slider values first, then convert `M` to monthly.
    *   Weekly Formula: `M = (Groceries * 0.05) + ((Dining + Personal) * 0.15)`
3. Sum the monthly slider totals + the monthly `M` total to create the single `EVERYDAY` category seed amount.

---

## 5. Output & Integration Rules
1.  **Confirmation Screen:** After Step 2, present the generated Monthly estimates to the user as editable fields grouped by `REGULAR`, `GOAL`, and `EVERYDAY`.
2.  **Amortisation Hand-off:** The calculator must output all values strictly as **Monthly Amounts**. Do not attempt to prorate these values to match the user's pay frequency in the UI state. The downstream Budgeting Engine (`@money-matters/capability-budgeting`) will handle the mathematical proration against their specific pay cycle during the waterfall allocation.
3.  **Reference Citations (Do Not Display in UI):** 
    *   *ABS & Finder 2026 Household Spend Data: Rent averages $634/wk, Groceries $272/wk, Dining $244/wk, Personal/Clothing $102/wk, Health $210/wk.*
    *   *Roy Morgan 2025: Average charity donor gives $594 annually.*
    *   *RACQ 2025 Running Costs used for Transport baselines.*
