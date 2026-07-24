
# Logic

## Everyday
* I know we created Categories with a type, but for Everyday expense, we really should create one and only one Category called "Everyday" with the Everyday category type, and not allow users to create any more, edit this or delete it (They can edit the target amount, but not the category name). Can we ensure that every time a new tenant is created, this is created for the tenant by default. Update seed. Push seed to development db.

## Archival Rules
* Cannot archive a category where there are upcoming expenses against it. Archiving will "hide" related Transactions and Categories should not show up in drop-downs for selection.
* Cannot archive a bank account where there are categories linked to it.
* Cannot archive a an income source where there are upcoming expenses.
* Any others you can think of?

# Main Dashboard page (Applies to Mobile and Web)

## Add a "Quick actions" panel (can be collapsed/expanded) - if the user collapses/expands the panel, remember this in the user's settings to persist across logins (starting state on login). This is a user level setting.

The Quick actions panel must include:
0) One card with 4 sub-cards - Total Income, Spent this Month, Saved this Month, Everyday Balance
1) Ability to Quickly Add Expense (draw down on a Category) - so show the fields in Edit mode (Category, Amount, Date, Note (optional) - as per the current floating "+" design.
* Because the user has specified recurring expense categories with frequencies, perhaps we can "quick-add" from these? COnsider including this in the + popup.
2) Ability to quickly adjust the actual Bank balance (given we don't sync actual bank accounts) for each of their bank accounts. In each row, allow them to update the "actual" bank account, and show the calculated "expected" Bank balance against each record.
Q: How is the expected bank balance calculated?
A: Everyday, Goal and Bill categories need to be each linked to a bank account (1:1). For now, it can be at this level (not at specific category level). For example, all Bill Categories linked to Account1 and all SaveFor categories linked to Account2. By totalling the current balance in these categories linked to the bank account, you can calculate the expected bank balance.
Q: What does Reconcile button do?
The Reconcile button allocates the missing/extra funds.
* If there is more actual money than expected, the user can nominate a category (a category drop-down appears) to push the surplus into. Remember this choice for the tenant. This is a tenant level setting.
* If there is less actual money than expected, show a button ("Reconcile") which opens a modal window. Recommend categories where the money needs to be taken out of (this would be the reverse of allocating income into a category) - so re-use the UI and logic but in reverse (identify the least priority). Allow the user to override. On save, this will cause transactions to be created that will remove money from categories so the expected and actual bank balances align.
Also show a button where the user can be taken to the Settings > Bank Accounts page. There, allow the user to Add, Edit and Archive Bank Accounts.
3) Can we Afford this in edit mode
4) "Move Money" button (see Move money section below). We want the button on the main Dashboard as well as the Categories page. Re-use code/UI.
5) Show a panel with 2 sub-cards (Categories At risk - orange, and Missed - red) based on % funding, target amount and time to target. Show # Categories in each sub-card. Clicking these sub-cards should take the user to the "Categories" tab pre-filtered based on which sub-card was clicked. See Categories tab below.

## Then, on the main Dashboard screen, show Upcoming events.
* Instead of showing two separate panels for "Upcoming Income & Paychecks" and "No upcoming paycheck events" show one "Upcoming..." and allow user to filter "Income & Paychecks" or "Bills & Expenses" or "All" (All is default).
* Include Expected Date, Amount Category, Type (Income/Expense) and Note. Sort by ascending date. Allow responsive case-insensitive search across Income/Expense Type & Notes.
* Mark past events in a differently - effectively action is required for these.
* Allow in-line edit of all fields including Date, Amount, Name, Category (except Type - i.e., Income vs. Expense). Allow deletion (archival).
* Against upcoming Income record(s), allow the user to "Allocate" (to trigger cascade to top-up categories) and against bills and expenses record(s), allow user to "Mark Paid" to trigger draw down from category. Warn the user if the draw-down exceeds current balance in any expense, but allow the category to go negative if the user proceeds. Once expenses marked paid or income allocated, these records should no longer be shown on this screen (they become transactions). Let the user know thet they've been moved to Transactions. 
* Because we are now showing information from the "Timelines screen" we don't need this screen any more. Remove it and remove it from the menu.

## Remove all other sections on the main Dashboard
* Remove individual category cards.
* "Action Required" section as this gets covered in the Upcoming Events.

# Timeline
* Not needed - remove screen

# Categories 
* Move Money (shown on Main dashboard and the Categories tab) should work identically.
* Allow sort across all fields.
* What is best practice to show Edit screen? It seems like having it inline could risk user changing, not saving and leaving the screen? Whatever you implement, implement consistenly across the application.
* Instead of "View Details", convert the Name into a hyperlink which opens the modal view.
* I can see the modal view of Transactions is empty even though I was expecting some. Check this.
* % Funded colour should match Categories On Track - green, At risk - orange, and Missed - red.
* Create a filter group for Categories: All, On track - green, At risk - orange, and Missed - red
* Rather than 3 tabs, shows as one table with but a filter group: All, Save Toward, Regular Bills, Everyday

# Income Sources
* Chaneg the name to Income & Expenses - Simplify the header text to reflect 
* Split this view into two panels, one to configure income sources and the other to configure Expenses. Both can either be one-off or recurring.
* The Add modal for both should behave the same.
* When recurring is selected, we need to "burst" to show all upcoming expenses/expenses ordered by date (have a reasonable cut-off like 12 months out). Having said that, you recommend how this should be re-burst when that time comes. What is best practice? I want simplicity.
* Show both as tables rather than cards
* 


# Transactions
* Show filter groups - Category Type, Category, Flow
* Allow responsive search across Category, Note and amount.
* Allow Sort across all fields (default - descending date).
* Allow export as csv.

# Web App UI only
* In modal view, allow user to click escape to close.

Implementation Rules:
* Unless specific, ALL UI changes should apply across the Mobile and Web apps. They should be consistent and equivalent in functionality.
* Honour *every* rule in the Agents.md
* Update Tech spec, Functional spec to reflect current state of app
* Ensure consistency in naming (for example, "Everyday" or "Bills", etc. For eg, don't introduce the word "Deposits"). This applies across the app.
* Ensure every page in the UI re-uses common components (like tables, filter groups, sorting, drop-down, currency formats, pagination, responsive search, etc.) For example all tables have sorting and responsive search.
* Cull code that is not used/needed aggressively across the DB, API, Web App, Mobile App, Components, etc. After making these changes, produce a detailed report of capability (api or logic) that has been built but not usable via the Web or Mobile UI.
* Created a detailed multi-phase implementation and audit it to ensure that every  line in this prompt is accounted for.
* Always grill me instead of assuming anything


  # User Profile

# Multi-tenancy and tenancy setup

# Write Test Cases to ensure 100% coverage of critical code across capabilities, web, mobile, packages, api, db, etc.

# MECE principle - Re-use, re-use, re-use - across every layer of the app - web/mobile UI, design tokens, helpers, api, auth, etc.

# Always ensure every user facing literal is in a locale file and re-used across the mobile and web app as much as possible.
