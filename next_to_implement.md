Consider this persona: You are a 35 year old Aussie male and have a family of three and want to better manage household budget. You've tried different apps and strategies but they don't work.
From this perspective, review the web and mobile capabilities and do extensive market research on needs for this persona,  research against potential competitors and  keeping in mind our MVP, identify critical functionalities that will make this app not just used but useful and sticky. Be critical of existing capability too. Prioritise based on usefulness and effort to implement.
The app needs to be genuinely useful, sticky and not provide friction for use.
Identify gaps and make recommendations.


ALL CHANGES apply to both the web and mobile UIs.

Dashboard - list of Upcoming Events (specifically Expense events)
* We have the "Edit" and "Pay Bill". We can combine these.
* Change "Pay Bill" to "Edit/Mark Paid" (or similar). When the user clicks it, launch a modal screen that looks like the Quick Expense capture screen, allowing the user to change the date and/or amount.
* Don't allow the user to select an amount less than 0. 
* The user can delete this upcoming record. Warn them that it will get permanently deleted (not archived).
* If the user changes the date to a future date, the use cannot Mark as Paid (disabled). Include a message something along the lines of "Your category balances will only update when money is actually marked as paid. Saving this will store your expense so it's ready to go when paid (or change the date above if your expense occurred early!)."
* Include a "Save without Marking Paid" (or similar) button where the system saves the record (as though they Edited and Saved) but does not trigger anything - it does not drawn down on the Category and the record stays in the upcoming events.
* If the user changes the date to today or a date in the past, they can mark as paid. Doing so will draw down on the Category. Include any warnings if they apply: for example, ""Payment of $280.00 exceeds "Private Health Insurance (Bupa)" balance ($0.00). Category balance will become negative ($-280.00)." if it applies. Doing so will also convert this into a transactions and remove it from upcoming events. They can cancel, which will close without saving.
* Also on this screen, below the Category (which should be read-only), show the Amount in the category before and projected after (if the user proceeds) and the category health (only if date is in the future).
* Show the information box with "Single Occurrence Edit Editing this specific income date or amount. Edit Master Series →" if it applies to a recurring item (move from the Edit screen to this screen).
* We effectively now don't need the Edit screen any more. Within the Pay Bill screen, they can do everything they could do in the Edit screen. Remove this button and any associated UI, API, etc. across mobile and web.
* Include the ability to Add Notes/Descriptions against an individual upcoming record to bring it in line with the Quick Actions Add Expense

Dashboard - Quick Actions > Expense tab
* The Income & Expenses screen includes a Expense Bill Name (expense). Include this field in the Quick Actions screen so the Upcoming record construct can be re-used for Quick Add.
* Re-use as much of the UI and business logic from the above changes (Upcoming Expense events)
* The only exceptions: user can change category. The record will never be part of a series so no need for the series note. Since the record was never created, no delete button needed.
* Don't allow the user to select an amount less than 0. 
* The result of this should either be a future event (if the date is in the future) or a confirmed past/today event with a transaction with the same logic applied (re-use the same data construct, logic and UI as Upcoming events).
* All the above Quick Actions changes also apply (100% re-use)in if the user clicks the + floating button (Expense tab).

Dashboard - List of Upcoming Events > Income
* We have the "Edit" and "Process Payday". We can combine these.
* Similar to above, incorporate "Single Occurrence Edit Editing this specific expense date or amount. Edit Master Series →") into Process Payday Split screen from Edit.
* Include a "Save without Marking Paid" (or similar) button where the system saves the record (as though they Edited and Saved) but does not trigger anything - it does not initiate a split the record stays in the upcoming events. Hide all the category splits and amounts.
* Don't allow the user to select an amount less than 0. 
* The user can delete this upcoming record. Warn them that it will get permanently deleted (not archived).
* Below each Category, you have anote like "Deficit repair, etc." Instead, show the Amount in the category before and projected after (if the user proceeds) and the category health (only if date is in the future). Allow the user to click a button to see why this was selected, where the explanation ("Deficit repair..") can be shown in full. Right now, it's getting cut off.
* We effectively now don't need the Edit screen any more. Within the Payday Split view screen, they can do everything they could do in the Edit screen. Remove this button and any associated UI, API, etc. across mobile and web.
* Include the ability to Add Notes/Descriptions against an individual upcoming record to bring it in line with the Quick Actions Add Income

Dashboard - Quick Actions > Income tab
* The Income & Expenses screen includes a Income Source Name (income). Include this field in the Quick Actions screen so the Upcoming record construct can be re-used for Quick Add.
* Re-use as much of the UI and business logic from the above changes (Upcoming Income events)
* When recording a quick income, shouldn't the user pick the receiving bank account to which the income landed (consistent with when they create a new income record from the Income & Expenses Screen)?.
* The only exceptions: The record will never be part of a series so no need for the series note. Since the record was never created, no delete button needed.
* Don't allow the user to select an amount less than 0. 
* The result of this should either be a future event (if the date is in the future) or a payday split plus transactions with the same logic applied (re-use the same data construct, logic and UI as Upcoming events).
* All the above Quick Actions changes also apply (100% re-use)in if the user clicks the + floating button (Income tab).

Income & Expenses


General
* Re-use as much UI, business logic and data models across the app as possible.


