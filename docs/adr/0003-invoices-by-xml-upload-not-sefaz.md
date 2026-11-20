# 0003. Invoices by XML upload, no SEFAZ, no third parties

Date: 2026-11-20 · Status: accepted

## Context

Brazilian invoices (NF-e) exist as structured XML. Automatic capture from SEFAZ needs the company's digital certificate and usually a paid third-party API. The owner does not want either. Reading photos with AI costs tokens and risks leaking personal data.

## Decision

Invoices enter by uploading the NF-e XML (one file, many files, or a ZIP), parsed by plain code, or by fast manual entry for invoices without XML. Both paths end in the same review screen with the same checks. Personal data is discarded at parse time.

## Consequences

No certificate, no external dependency, no AI cost. Someone still has to obtain the XML files (supplier e-mail or the accountant). Photo/OCR stays a future idea.
