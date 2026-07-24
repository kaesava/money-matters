Web App only
Main Dashboard Screen
* Remove the "Timeline" hyperlink from the menu

Categories screen
* I archived a category and restored it. cached When I clicked on, Categories I'couldn t see. it Maybe it had cached it? If you imeplemnt a refresh, dont do a full page refresh.
* When Edit is clicked, open a modal screen (re-use the New screen) Re-use the New Category UI. Do this instead of inline edit. I want consistency.
* When I click on a Category link, the window shows but the console reports an error
Console Error

Internal React error: Expected static flag was missing. Please notify the React team.

Call Stack
handleClientError
../src/client/components/react-dev-overlay/internal/helpers/use-error-handler.ts (25:13)
error
../src/client/components/globals/intercept-console-error.ts (19:27)

Income & Expenses screen
* Remove "Expense Type" as a field from the "Add Expense" flow. Category is mandatory.
* Edit modals for the Income and Expense Edit screens are not allowing me to capture recurring. Re-use the "New" screen for both.

Transactions
* When I click on + and add a transaction, it doesn't reflect in the table unless I click on another link and click back. Perhaps it's caching? Note, if you implement a refresh, don't do a full page refresh.
General
* On all modal screen, hitting escape closes it. If changes were made, ask the user if they would like to save. Includes Create and Edit modals.
* Ensure that the filter groups look-and feel across all screens is consistent. I don;t like the way the filter groups look in the Categories and the Transactions Screens. Include a clear all button that clears all filters incluing search. re-consider design modern app, keeping to the theme. Ensure consistency across the app.
* Generally ensure consistency across the app for the UI - for ecample, all tables allow sort, the search works the same, etc. Ensure all UI definitions of theme, look-and-feel, design tokens, etc. are defined once and re-used. Avoid custom/overriding.
* When I create a new transaction, it's stamoing the wrong time for the date-time. Ensure that the app handles time-zones. Capture the time-zone of the user (default to the time-zone used when the user was setup). Allow the user to change in User preferences. Store all date-times in UTC but show and interpret all time-zones (i.e., when the user inputs is) with the user's local time-zone from their user-preference.

