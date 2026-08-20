# Manor Lords Community Tools - Project Standards

This document defines the design and coding standards for every planner
in this repository.

## Goals

-   Consistent appearance across all planners.
-   Easy maintenance after game updates.
-   Mobile-friendly layouts.
-   Transparent calculations based on public game mechanics.

------------------------------------------------------------------------

## Standard Layout

Every planner should include:

1.  Manor Lords themed header.
2.  Home button linking back to the main page.
3.  About section explaining what the planner does.
4.  Main calculator/planner.
5.  Recommended Setup section (when applicable).
6.  Notes / assumptions section.
7.  Standard disclaimer footer.

------------------------------------------------------------------------

## Home Button

Every planner should include a Home button in the upper-right corner
that returns to the repository home page.

------------------------------------------------------------------------

## Footer

Every planner should include:

**Unofficial Manor Lords Fan Tool**

Not affiliated with or endorsed by Slavic Magic or Hooded Horse.

All calculations are based on publicly available game mechanics and
community research.

------------------------------------------------------------------------

## Code Standards

Store game balance values in one centralized section near the top of the
JavaScript.

Example:

-   fishing
-   hunting
-   foraging
-   origins
-   production values
-   timing values

Changing game balance should normally require editing only this section.

------------------------------------------------------------------------

## Design Philosophy

-   Optimize decisions instead of simply displaying formulas.
-   Explain recommendations where practical.
-   Avoid unnecessary inputs.
-   Prefer calculated recommendations over manual trial and error.
-   Keep assumptions clearly documented.

------------------------------------------------------------------------

## Mobile Support

-   Responsive layout.
-   Large touch targets.
-   Readable fonts.
-   Avoid horizontal scrolling.

------------------------------------------------------------------------

## Future Planners

Examples:

-   Apiary Planner
-   Pigsty Planner
-   Livestock Planner
-   Fishing, Hunting & Foraging Planner
-   Beverage Planner
-   Plot Requirements Planner

All planners should follow these standards so they feel like one unified
suite of tools.
