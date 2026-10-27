# Wanted: whole-product research and build pack

**Research date:** October 25, 2026. **Product:** Wanted. **Agent:** Gus. **Baseline:** the local /Users/chaitanya/wanted project, not only public GitHub main.

## Start here

1. **01-PRODUCT-THESIS.md:** the opinionated strategy and what I would not build.
2. **08-LOCAL-AUDIT-AND-BUILD-PLAN.md:** concrete changes against the code you already have.
3. **15-CLEVER-QLOO-EXPERIMENTS.md:** non-obvious Qloo ideas, live checks, failed assumptions and judge-facing proof.
4. **09-VALIDATION-AND-EVALS.md:** how to find out whether any of this works for real people.

Read the rest when implementing a subsystem:

- 02-CUSTOMERS-AND-JOBS.md: segment selection, buyer/user distinction, adoption and onboarding.
- 03-TOURING-OPERATING-MODEL.md: end-to-end lifecycle, role boundaries, deal terms, cashflow and handoffs.
- 04-VOICE-OF-CUSTOMER.md: named artists, bookers, crew and fans, including contradictory accounts.
- 05-MARKET-COMPETITION-AND-BUSINESS.md: substitutes, competitors, distribution, pricing and defensibility.
- 06-QLOO-CAPABILITIES-AND-CONTRACTS.md: documented vs verified capability and inference limits.
- 07-AGENT-ARCHITECTURE-AND-EVE.md: bounded agency, durable state, tools, approvals and framework decision.
- 10-HACKATHON-DELIVERY.md: current requirements, demo narrative and submission checklist.
- 11-RISKS-AND-DECISION-LOG.md: assumptions, failure modes, changes to earlier advice and kill criteria.
- 12-SOURCES.md: annotated source catalog with links and evidence limitations.
- 13-RESEARCH-LEADS.md: further leads/indexed excerpts, explicitly not all fully reviewed.
- 14-BUILD-BRIEFS.md: implementation-ready bounded feature briefs and acceptance criteria.
- 16-SYSTEMS-AMBITIONS-AND-GATES.md: current backend evidence, voice/commerce boundaries and the next ordered ambitions.
- WANTED-PRODUCT-RESEARCH.md: combined reading copy of this pack.

## What this is, and is not

This is substantial **desk research, primary-document inspection, public voice-of-customer synthesis, local implementation inspection and targeted live API diagnostics**. It is not a customer-interview study I conducted, not a production security audit, not proof of willingness to pay, and not a ticket-demand validation.

The work includes current primary Qloo/Eve/AI SDK documentation, official hackathon rules, named musician/booker/tour-manager/crew accounts, UK/US/Australian industry and fan research, competitor feature/pricing pages, historical demand-pledge experiments and forum excerpts. I read primary PDF methods to avoid confusing an engaged fan sample with all consumers or macroeconomic output with software TAM.

I inspected 213 local source/docs/script files in the earlier pass, identified 26 local changed/added files compared with the committed review copy, and then inspected relevant backend files again. Git-status permission was unavailable; this is not an exhaustive Git diff. No application code, dependencies or business records were modified by this research.

I made **16 read-only Qloo GET diagnostics** during the extended research. They include successful entity resolution/candidate-filter/counterfactual tests and a semantic failure: a venue-only artist-ranking request returned entities without affinity values. HTTP success is not proof a signal worked. Raw provider responses and credentials are deliberately excluded from this public-code-friendly pack.

## Evidence labels

- **Observed:** behavior or code I inspected, including the local implementation.
- **Primary guidance:** official documentation/rules or a practitioner speaking about their own work.
- **Reported research:** a survey/study with a specified scope, sample and date.
- **Anecdote:** a particular person's experience, not prevalence.
- **Hypothesis:** a proposed interpretation that needs testing.
- **Recommendation:** what I would build or decide given the evidence.
- **Unverified:** not live-tested, not independently benchmarked or not confirmed by a counterparty.

Source links are attached to the relevant sections and all sources have limitations in [12-SOURCES.md](12-SOURCES.md). Older accounts are used for workflow patterns, not claimed to describe every present-day venue. Competitor pages establish advertised capabilities, not product quality. Anonymous forum users are not verified professionals.

## The core answer

Wanted should help a **working self-booking act or small operator make a culturally suitable show happen and carry it through reliably**. The unit of value is not a city score or a chat response. It is a verified operational milestone reached with less admin and fewer mistakes.

Qloo supplies cultural evidence. Real inventories, calendars, written terms, contacts and human replies supply operational truth. Gus coordinates them with bounded judgment and explicit authorization.

Keep the map, WANTED posters, Fan Mail, Logbook, voice and existing promotion flow. Make them more truthful and operationally connected before expanding into a general music super-app.

## Current limitations and output location

The project research copy is now writable in this session. Chapter 16 records newer implementation evidence; the older chapters/combined copy retain their original observation dates and are not current bug lists.

The research files are delivered in this artifact folder. Writing a copy to /Users/chaitanya/wanted/docs/research was blocked by filesystem write permissions, even though reads were allowed. Copy the folder there manually, or grant that directory write access if you want a later copy. Do not copy raw Qloo cache data into a public repository. Review source licensing and product terms before publishing any imported data.

## How to use this while building

Treat recommendations as decisions to test, not immutable requirements. Every feature should have: one actor, one trigger, one verifiable outcome, required evidence, a failure/unknown state and clear authority. Read the local audit before implementing anything already present. Use the validation cases before polishing the happy path.

The whole-product desk-research synthesis is complete in this pack. **Customer validation remains open** and the plan makes that visible rather than pretending research can substitute for it.
