# Manual Shakeout Testing Guide: Authentication & Parity (Web & Mobile)

This document is the authoritative manual testing checklist for **Sign-In**, **Sign-Up**, **Forgot Password**, **Reset Password**, **Email OTP Verification**, and **Social Authentication (Google & Apple)** across **Web** (`apps/web`) and **Mobile** (`apps/mobile`).

Each test scenario must be executed on both platforms (or as noted) to guarantee 100% behavioral and visual parity with zero unexpected friction or crashes.

---

## 1. Sign-In Shakeout Checklist

### 1.1 Mandatory Fields & Validation
| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SI-01** | Empty inputs on load | Navigate to `/sign-in` or launch mobile app. | Email and password fields blank; submit button disabled. | Email and password fields blank; submit button disabled. | [ ] |
| **AUTH-SI-02** | Mandatory indicators | Observe field labels. | Red asterisk `*` rendered beside "Email" and "Password". | Red asterisk `*` rendered beside "Email" and "Password". | [ ] |
| **AUTH-SI-03** | Invalid email format | Type `invalidemail` into Email and a valid password. | Red field error message: *"Invalid email address format"*; submit button disabled or triggers inline error. | Red helper text error: *"Invalid email address format"*; submit button disabled. | [ ] |
| **AUTH-SI-04** | Whitespace trimming | Enter email with leading/trailing spaces (` test@example.com `). | Form trims whitespace before submission and verifies valid email format. | Form trims whitespace before submission and verifies valid email format. | [ ] |
| **AUTH-SI-05** | Case insensitivity | Enter uppercase/mixed-case email (`User@Example.COM`). | Email normalized to lowercase before API call. | Email normalized to lowercase before API call. | [ ] |

### 1.2 Sign-In Authentication Outcomes
| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SI-06** | Invalid credentials | Enter valid email with an incorrect password. | Top error banner: *"Invalid email or password. Please try again."* Form state preserved. | Top error banner: *"Invalid email or password. Please try again."* Form state preserved. | [ ] |
| **AUTH-SI-07** | Non-existent account | Enter an unregistered email with any password. | Top error banner: *"Invalid email or password. Please try again."* No user enumeration leak. | Top error banner: *"Invalid email or password. Please try again."* No user enumeration leak. | [ ] |
| **AUTH-SI-08** | Unverified email account | Enter credentials of an account whose email has not yet been verified. | Auth view smoothly switches to OTP Verification screen with instructions and email address displayed. | Auth view smoothly switches to OTP Verification screen with instructions and email address displayed. | [ ] |
| **AUTH-SI-09** | Successful sign-in | Enter verified account credentials and click "Sign In". | Loading spinner displays on button; user redirected to `/dashboard` with session cookies. | Loading spinner displays on button; JWT saved to `SecureStore`; user redirected to `/(app)/home`. | [ ] |
| **AUTH-SI-10** | Web Auth Modal parity | Open Landing page, click "Sign In" modal button, test sign-in flow. | Modal behaves identically to `/sign-in` page; dismissable via `Esc` or background backdrop. | N/A (Modal is web-specific; mobile uses dedicated screen). | [ ] |

---

## 2. Sign-Up Shakeout Checklist

### 2.1 Form Validation & Mandatory Fields
| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SU-01** | Initial form state | Navigate to `/sign-up` or mobile Sign Up screen. | Mandatory asterisks on Name, Country, Email, Password, Confirm Password; button disabled. | Mandatory asterisks on Name, Country, Email, Password, Confirm Password; button disabled. | [ ] |
| **AUTH-SU-02** | Name validation (<2 chars) | Enter `A` as Name. | Inline error: *"Name must be at least 2 characters"*. Submit button remains disabled. | Inline error: *"Name must be at least 2 characters"*. Submit button remains disabled. | [ ] |
| **AUTH-SU-03** | Password complexity (<8 chars) | Enter `short1!` into password. | Visual strength indicator shows red/amber; inline error: *"Password must be at least 8 characters long."* | Visual strength indicator shows red/amber; inline error: *"Password must be at least 8 characters long."* | [ ] |
| **AUTH-SU-04** | Password requirement checklist | Type varying passwords into password field. | 4-bar indicator updates smoothly; 4 requirements turn green with checkmarks as fulfilled: 8+ chars, lowercase, uppercase, number/symbol. | 4-bar indicator updates smoothly; 4 requirements turn green with checkmarks as fulfilled: 8+ chars, lowercase, uppercase, number/symbol. | [ ] |
| **AUTH-SU-05** | Password mismatch | Enter `P@ssword123` and `P@ssword999` in confirm password. | Inline error under Confirm Password: *"Passwords do not match."* Button disabled. | Inline error under Confirm Password: *"Passwords do not match."* Button disabled. | [ ] |
| **AUTH-SU-06** | Terms & Privacy requirement | Fill all valid inputs but leave Terms checkbox unchecked. | Button disabled; attempting submission flags: *"You must accept the Terms of Service and Privacy Policy..."* | Button disabled; attempting submission flags: *"You must accept the Terms of Service and Privacy Policy..."* | [ ] |
| **AUTH-SU-07** | Terms & Privacy link click | Click "Terms of Service" and "Privacy Policy" links. | Opens respective policy pages in new browser tab without losing sign-up form state. | Opens in-app browser (`WebBrowser.openBrowserAsync`) without unmounting or discarding form state. | [ ] |

### 2.2 Sign-Up Outcomes & Email OTP
| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SU-08** | Duplicate email sign-up | Enter an email address that already has an active account. | Error banner: *"An account with this email already exists. Please sign in."* | Error banner: *"An account with this email already exists. Please sign in."* | [ ] |
| **AUTH-SU-09** | Sign-up with OTP requirement | Complete sign-up for new email requiring OTP verification. | View transitions to OTP Verification screen. Verification code sent via Resend/Neon Auth. | View transitions to OTP Verification screen. Verification code sent via Resend/Neon Auth. | [ ] |
| **AUTH-SU-10** | Incorrect OTP code | Enter incorrect 6-digit code `000000` and submit. | Error message: *"Invalid or expired verification code. Please try again."* Input retains focus. | Error message: *"Invalid or expired verification code. Please try again."* Input retains focus. | [ ] |
| **AUTH-SU-11** | Resend OTP code | Click "Didn't receive an email? Resend link". | Loading spinner; success banner: *"Verification email sent! Please check your inbox and spam folder."* | Loading spinner; success banner: *"Verification email sent! Please check your inbox and spam folder."* | [ ] |
| **AUTH-SU-12** | Successful OTP verification | Enter the actual 6-digit code received by email. | User verified and logged in; auto-redirects to Setup Wizard (`/(setup)/income`). Household/tenant created. | User verified and logged in; auto-redirects to Setup Wizard (`/(setup)/income`). Household/tenant created. | [ ] |

---

## 3. Forgot Password Shakeout Checklist

| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-FP-01** | Navigation from Sign-In | Click "Forgot password?" from the sign-in form. | Navigates to `/forgot-password`. Back button links to `/sign-in`. | Navigates to `/(auth)/forgot-password`. Back button returns to Sign-In. | [ ] |
| **AUTH-FP-02** | Blank email submission | Leave email input blank. | Submit button is disabled. | Submit button is disabled. | [ ] |
| **AUTH-FP-03** | Invalid email format | Enter `invalid-email-string` and click submit. | Inline error: *"Invalid email address format"*. | Inline error: *"Invalid email address format"*. | [ ] |
| **AUTH-FP-04** | Registered email request | Enter existing registered email address and submit. | Confirmation screen displays: *"Check Your Email"* with message: *"If this email exists in our system, check your email for the reset link."* | Confirmation block displays with envelope icon and quiet reset message. | [ ] |
| **AUTH-FP-05** | Unregistered email request (Anti-enumeration) | Enter random unregistered email `nonexistent@test.com` and submit. | Displays the EXACT SAME quiet confirmation message to prevent user enumeration. | Displays the EXACT SAME quiet confirmation message to prevent user enumeration. | [ ] |
| **AUTH-FP-06** | Reset email delivery | Check inbox of the registered email address. | Password reset email received with secure, non-guessable tokenized link. | Password reset email received with secure, non-guessable tokenized link. | [ ] |

---

## 4. Reset Password Shakeout Checklist

| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-RP-01** | Missing / empty token | Navigate directly to `/reset-password` without `?token=...` parameter. | Error banner: *"This password reset link has expired or has already been used. Please request a new link."* Submit disabled. | Error banner: *"This password reset link has expired or has already been used. Please request a new link."* Submit disabled. | [ ] |
| **AUTH-RP-02** | Expired / invalid token | Open reset link with manipulated token `?token=invalid_or_expired_123`. | Submitting new password returns error banner: *"This password reset link has expired or has already been used. Please request a new link."* | Submitting new password returns error banner: *"This password reset link has expired or has already been used. Please request a new link."* | [ ] |
| **AUTH-RP-03** | Password complexity (<8 chars) | Enter `pass` into new password field. | Strength indicator shows red; inline error: *"Password must be at least 8 characters long."* | Strength indicator shows red; inline error: *"Password must be at least 8 characters long."* | [ ] |
| **AUTH-RP-04** | Password mismatch | Enter `NewPass123!` and `NewPass456!` in confirm password. | Inline error: *"Passwords do not match."* Reset button remains disabled. | Inline error: *"Passwords do not match."* Reset button remains disabled. | [ ] |
| **AUTH-RP-05** | Successful password reset | Enter valid matching password with token and submit. | Success screen: *"Password Reset Complete"*; auto-redirects to `/sign-in` after 3 seconds. | Success block: *"Password Reset Complete"*; auto-redirects to `/(auth)/sign-in` after 2.5 seconds. | [ ] |
| **AUTH-RP-06** | Post-reset login | Sign in using the new password. | Successfully authenticates and enters `/dashboard`. | Successfully authenticates and enters `/(app)/home`. | [ ] |
| **AUTH-RP-07** | Replay attack test | Click the same reset link a second time after password was changed. | Error displayed immediately: link is expired / already used. Cannot reuse token. | Error displayed immediately: link is expired / already used. Cannot reuse token. | [ ] |

---

## 5. Social Authentication (Google & Apple) Shakeout Checklist

| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SO-01** | Google Sign-In (Existing User) | Click "Sign in with Google" button. | OAuth pop-up/redirect occurs; on return, user is logged in to `/dashboard`. | Browser opens Google OAuth; deep link `moneymatters://home?token=...` returns app to Home with token saved. | [ ] |
| **AUTH-SO-02** | Google Sign-Up (New User) | Click "Sign up with Google" button. | OAuth completes; new user record created; redirects to setup wizard / dashboard. | OAuth completes; returns via deep link; creates tenant if missing; routes to `/(setup)/income`. | [ ] |
| **AUTH-SO-03** | Unverified user social login | If user created account with email/pwd but didn't verify OTP, then logs in with Google using that email. | OAuth succeeds; Neon Auth links verified Google identity to email; user logged in immediately. | OAuth succeeds; Neon Auth links verified Google identity to email; user logged in immediately. | [ ] |
| **AUTH-SO-04** | Apple Sign-In / Sign-Up | Click "Sign in with Apple" or "Sign up with Apple". | Apple authentication flow executes; redirects back with valid session. | Apple authentication flow executes; returns via deep link with token saved. | [ ] |
| **AUTH-SO-05** | Cancelled social flow | Open OAuth window/browser and close it without completing. | Graceful cancellation; form returns to ready state without crash or freeze. | Browser dismisses; app remains on sign-in/sign-up screen without crash or hang. | [ ] |

---

## 6. Security, Session, & Network Shakeout Checklist

| Test ID | Scenario | Steps to Execute | Expected Result (Web) | Expected Result (Mobile) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-SEC-01** | Session token storage | Inspect browser cookies / mobile storage after sign-in. | Session token stored in HttpOnly / Secure cookies. Never exposed in plain client logs. | Session token stored in encrypted `Expo.SecureStore`. Zero plain token logs. | [ ] |
| **AUTH-SEC-02** | Rate limiting protection | Attempt 10 failed logins within 30 seconds. | Upstash Redis sliding-window triggers `429 Too Many Requests`. User shown rate limit alert. | Upstash Redis sliding-window triggers `429 Too Many Requests`. User shown rate limit alert. | [ ] |
| **AUTH-SEC-03** | Offline / Network failure | Disconnect device internet, then click Sign In. | Network banner / toast displays: *"Connection Interrupted"*. App remains responsive. | Network banner / toast displays: *"Connection Interrupted"*. App remains responsive. | [ ] |
| **AUTH-SEC-04** | Android keyboard dismiss | On Android device, focus input, type, and dismiss keyboard. | Form fields and submit button smoothly re-center; buttons remain accessible and not covered. | `KeyboardAvoidingView` adjusts smoothly; buttons and errors stay visible. | [ ] |

---
*Created as part of the monorepo screen-by-screen production readiness review. All subsequent screen reviews will expand this testing suite.*
