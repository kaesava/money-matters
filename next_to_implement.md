For Discussion only - no code change. Grill me if needed.

* Are allocations grouped in the backend? If so, can we show the + sign in the Transactions view allowing the user to collapse/expand all transactions that were part of the allocation. Similarly, group the two transactions that would have been part of "move money". Keep the UI simple and elegant.
* Does the Bank Account Purpose or Tag drive functionality? This is important to fix the "Bank reconciliation" process and make sure it works correctly. I feel this functionality has not been thought through. For example, there is a "Default Tenant Surplus Category" in the drop-down which should be removed. It forces the user to pick a Category that is well maintained. If so, we need to ensure this category doesn't get created when a new tenant is created or in the seed. Also, the "Expected" balance doesn't seem right. In fact, I don't even know if the Categories individually get linked to the Bank account or at the Type (Everyday, Goal, Bills) level. Review. For R1, I want it at the Type level. In the Create Bank Account, perhaps we rename "Purpose/Tag" to "Category Type" and allow the user to multi-select Everyday, Bills and Goals (they must select at least one of these)? Then, the expected value should be the total of all categories that are linked to that account. However, this may annoy the user if, for example, they have a completely different amount held in the same bank account that they don't want to be part of the budget, and it keeps showing up as being inconsistent with actual. Review this entire functionality, best practice and recommend a simple to use and meaningful solution.
* Does the "Is this account an offset account" flag drive functionality? If not, let's remove across the db, api, and ui.
* For Categories of type BILL, is the budget is always set monthly for every category? Should it be more flexible?

For Implementation

# Web App

## General
* Remove "Payment Method Tag" field against Incoming and Expenses - remove from DB, API, and front-end.
* I noticed the word "REGULAR" (for example in the View Category modal). Make sure the entire app is consistent and uses GOAL, BILLS and EVERYDAY in the front-end (all user-facing strings must be in the locale file and not hard-coded).


## Main Dashboard
* Change "Income Sources" to "Income & Expenses" in the menu bar on the left of the screen.
* Please remove the "Timeline" from the menu bar on the left of the screen - this is the third time I've asked you to do it, but it's still there.
* When I click on my name/email on the menu bar on the left of the screen, take me to the user profile in Settings. This is the second time I've asked you to do it but it has not been done.
* The above three points apply across all screens on the web app since the menu is common.

## Income & Expenses screen
* When the user clicks on Edit to edit an Income Source or Expense Bill, show them the same UI as "Create" Income Source or Expense Bill respectivel; for example, allow user to check the recurring box and selecting the frequency, or change from recurring to one-off, change from one-off to recurring, etc.). This is the only place they can change the recurrance.
* If the income/expense was one-off and the the user only changes the amount or date, change it for the upcoming event (ideally it should be linked).
* If the income/expense was recurring and the user keeps it as recurring but changes the amount or date, re-burst upcoming events but warn the user that any individual changes will be lost (if there is any). Delete previously burst events (but do not delete those that have been processed - i.e., marked paid (expense) or cascaded (income)).
* If the income/expense was recurring but wants to change to one-off, warn the user that un-processed events will be lost (if there is any). Delete previously burst events (but do not delete those that have been processed - i.e., marked paid (expense) or cascaded (income)). Create a one-off future event as needed.
* If the income/expense was one-off but user wants to change to recurring, warn the user that un-processed one-off will be lost (if there is any). Delete previously one-off eventunless processes. Burst recurrance as usual.
* Make the look and feel of the two tables consistent with the rest of the app (like allowing sortable headers).

## Dashboard - Upcoming Events
* When I process a payday, the amount to allocate should exactly match the amount allocated. If it doesn't the user must be warned that the incoming amount will be adjusted. They can proceed with the new amount or cancel.
* When user clicks on "Edit" against a Income or Expense record, they are only editing that particular record if it is part of a recurring series. Therefore, do not show the two Recurrence Scope options). Instead, if that record is part of a recurring series, include a link on that modal screen to take the user to the Income & Expenses screen with the recurring series Income or Expense (depending on what they click) pre-filtered. Effectively, the Edit Screen on the dashboard should only be used to edit that actual event.

## Transactions
* Clicking a Category (hyperlink) should take me to the Categories view with the Category pre-filtered in the search.
* "Source" field: Keep it as automatic if it was cascaded and that item amount was not overriden. For example, if the user cascaded an income, left category A allocation un-changed but changed B, mark A as auto and B as manual.

## Categories
* When user clicks on a Category, only show the last 5 transactions. Include a "More" hyperlink which will open the Transactions screen pre-filtered by the Category name.
* When user clicks on a Category, show Notes & Comments as a tab so that the modal screen does not get too big. Also, re-design the modal - it doesn't look clean with the horizontal lines, header font and spacing above header, etc.
* When user clicks on Total Categories Card, clear HEALTH filter (similar to setting filter if user clicks on On Track or At Risk). Remove " (GREEN)" in the  card.

## Quick Add Expense
* When doing a quick add expense will take a category into negative, warn the user allowing them to proceed or cancel (show them the balance in the category).
* When "Move Money" is triggered, that will take the debited category into negative, warn the user allowing them to proceed or cancel.

## Bank Accounts
* Allow the user to edit and archive Bank accounts from this screen. The Edit Screen should re-use Create functionality.


