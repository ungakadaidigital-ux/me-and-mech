# PKG-056 — UAT & Beta Framework

Beta plan: 15–20 mechanics, Coimbatore + Chennai, 2 weeks, Raja personally attends at least 3 live sessions.

## UAT cases (follow locked rules)
| ID | Case | Expected |
|---|---|---|
| AUTH-01 | Valid 10-digit phone | OTP SMS within 30s |
| AUTH-02 | Correct OTP, new number | Goes to workshop registration |
| AUTH-03 | Wrong OTP 3 times | Locked, Tamil error |
| AUTH-04 | Reopen app with valid session | Straight to Dashboard |
| AUTH-05 | 9-digit phone | Tamil validation error, no request sent |
| INV-01 | 2 labour items, no parts | Total correct, invoice number `PREFIX-YYYY-001` |
| INV-02 | Send invoice on WhatsApp | Customer receives it, delivery receipt logged |
| INV-03 | Invoice from job card with no items | Blocked |
| INV-04 | Mark invoice PAID | Status PAID, job card `paid` |
| INV-05 | Add item after invoicing | Blocked |
| INV-06 | Create job card in airplane mode | Saved locally, syncs on reconnect |
| INV-07 | Three invoices in a row | Numbers 001, 002, 003, no gaps |
| VOICE-01 | Paid account, Tamil sentence | Transcript within ~8s |
| VOICE-02 | Sarvam down | Manual entry still possible |
| VOICE-03 | **Trial account** | Voice screen shows upgrade card; API returns 402 |
| VOICE-04 | Noisy garage | Record accuracy per device, note in sheet |
| OFF-01..03 | Offline create / reconnect / view cached list | No data loss |
| REF-01 | Referee registers with `MM-` code, makes 3 jobs in 7 days | Referrer credited 15 days |
| REF-02 | Invalid code | Registration still completes |
| REF-03 | Share button | WhatsApp opens with correct code |
| SUB-01 | Day 30 | New jobs/voice/invoice/customer/vehicle/WhatsApp-send locked; mark-paid works |

## Bug triage
| Priority | Definition | SLA |
|---|---|---|
| P1 | Crash while creating a job card, data loss, OTP not arriving, cross-workshop data visible, wrong money total | same day |
| P2 | Voice failing repeatedly, WhatsApp failure rate >10%, Tamil text broken on a device | 72 hours |
| P3 | Layout nits, slow screens, copy tweaks | next sprint |

## Beta WhatsApp onboarding message (Tamil, for Raja to approve before sending)
```
வணக்கம்! Me & Mech beta-க்கு நன்றி.
1. App install செய்யுங்கள்
2. கடை பெயர் register பண்ணுங்கள்
3. ஒரு customer + வண்டி சேருங்கள்
4. ஒரு bill போடுங்கள், WhatsApp-ல் அனுப்புங்கள்
பிரச்சனை வந்தால்: "BUG: [என்ன நடந்தது]" என்று இந்த group-ல் அனுப்புங்கள்.
```

## Devices
Test on at least one budget phone (2 GB RAM class), one mid-range Samsung and one Xiaomi/Redmi. Record Android version per tester.

## Feedback sheet columns
Tester, phone model, Android version, date, screen, what happened, severity, screenshot link, fixed in build.
