# Increment 19 — Clarification (Q1: unified ticket redemption)

Your Q1 answer: **"random hit rate of 1 of the current easter egg behaviours"** — i.e. redeeming one easter egg ticket randomly picks one of the existing behaviours, then runs that pick-1-of-5. Two things need pinning down so the randomization is well-defined.

Please fill in each `[Answer]:` tag. Say **done** when finished.

---

## Ambiguity: which SET of behaviours does it randomize over?
Today's distinct behaviours are: **epic+** (epic/legendary), **common/rare**, and the four **single-rarity** picks (common-only, rare-only, epic-only, legendary-only).

## Question 1 — What is the random pool of behaviours?
On each redemption, the server rolls to pick ONE behaviour from:

A) The **2 egg types** — 50/50 between epic+ pick-1-of-5 and common/rare pick-1-of-5

B) The **4 single-rarity** picks — equal 1/4 chance of common-only, rare-only, epic-only, or legendary-only

C) All **6 behaviours** — equal chance among epic+, common/rare, common, rare, epic, legendary

D) A **rarity-weighted** roll (mostly common/rare, rarely epic/legendary) that then gives a single-rarity pick-1-of-5 of the rolled rarity

X) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 2 — Does the child see which behaviour they rolled?
When the picker appears with its 5 candidate cards:

A) **Surprise reveal** — announce it first (e.g. "✨ EPIC EGG!" / "🍀 Lucky egg!") then show the 5 cards

B) **Silent** — just show the 5 cards to pick from, no tier announcement

X) Other (please describe after [Answer]: tag below)

[Answer]: A
