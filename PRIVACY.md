# Privacy Policy

**Effective Date:** April 1, 2026
**Project:** Chessbook (Open Source)

This Privacy Policy explains how Chessbook handles user data. My primary philosophy is **privacy by design**: I believe your data belongs to
you, and it should stay on your machine.

## 1. No Data Collection (Local-Only)
Chessbook does **not** collect, store, or transmit any personally identifiable information (PII).
* **Local Storage:** All ebooks, chess move history, and reading progress are stored exclusively on your local device using the **WebExtensions Storage API**.
* **No External Servers:** This extension does not communicate with any developer-owned or third-party servers.

## 2. Third-Party Website Interaction (Lichess.org)
To provide its core functionality, the extension interacts with `lichess.org`.
* **Purpose:** The extension reads and interacts with the Lichess analysis board to synchronize moves from your local ebooks.
* **Scope:** No data from your Lichess account, personal communications, or browsing history is captured, saved, or transmitted.
* **User Activity:** I use standard browser event listeners (e.g., clicks) locally to trigger UI updates. This data is never recorded or sent away from your browser.

## 3. Data Usage & Disclosure
Because I do not collect your data, I cannot and do not:
* Sell or rent your data to third parties.
* Use your data for advertising or marketing.
* Share your data with any external entities.

## 4. Open Source Transparency
As an open-source project, my source code is available for public audit at [https://github.com/swiftective/chessbook]. You can verify that the extension functions exactly as
described in this policy.

## 5. Minimum Permissions
I only request the minimum permissions required for the extension to function:
* `storage`: To save your ebooks locally.
* `host permissions (*.lichess.org)`: To allow the ebook reader to interact with the Lichess board.

## 6. Contact
If you have any questions regarding this policy or the extension's privacy practices, please open an issue on my GitHub repository
